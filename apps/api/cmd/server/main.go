package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/Dubjay18/reelstack/api/internal/auth"
	"github.com/Dubjay18/reelstack/api/internal/comments"
	"github.com/Dubjay18/reelstack/api/internal/content"
	"github.com/Dubjay18/reelstack/api/internal/email"
	"github.com/Dubjay18/reelstack/api/internal/embed"
	"github.com/Dubjay18/reelstack/api/internal/follows"
	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/internal/notifications"
	"github.com/Dubjay18/reelstack/api/internal/queue"
	"github.com/Dubjay18/reelstack/api/internal/saved_lists"
	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/Dubjay18/reelstack/api/pkg/cache"
	"github.com/Dubjay18/reelstack/api/pkg/config"
	"github.com/Dubjay18/reelstack/api/pkg/db"
	apperrors "github.com/Dubjay18/reelstack/api/pkg/errors"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env (ignored in prod — env vars set by Railway)
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load failed", "error", err)
		os.Exit(1)
	}

	// ── Database ────────────────────────────────────────────────────────────
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("db connect failed", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	// ── Migrations ──────────────────────────────────────────────────────────
	// Run migrations automatically on startup to ensure the database schema is up-to-date.
	migrateOnly := len(os.Args) > 1 && os.Args[1] == "--migrate-only"
	slog.Info("Checking and running database migrations...")
	files, err := os.ReadDir("pkg/db/migrations")
	if err != nil {
		slog.Error("failed to read migrations dir", "error", err)
		os.Exit(1)
	}
	for _, file := range files {
		if !file.IsDir() {
			content, err := os.ReadFile("pkg/db/migrations/" + file.Name())
			if err != nil {
				slog.Error("failed to read migration file", "file", file.Name(), "error", err)
				os.Exit(1)
			}
			slog.Info("Executing migration", "file", file.Name())
			if _, err := database.Exec(string(content)); err != nil {
				slog.Error("migration failed", "file", file.Name(), "error", err)
				os.Exit(1)
			}
		}
	}
	slog.Info("Database migrations completed successfully.")
	if migrateOnly {
		os.Exit(0)
	}

	// ── Fiber app ───────────────────────────────────────────────────────────
	app := fiber.New(fiber.Config{
		AppName:      "Reelstack API v0.1.0",
		ErrorHandler: errorHandler,
	})

	// ── Middleware ──────────────────────────────────────────────────────────
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// ── Health ──────────────────────────────────────────────────────────────
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"version": "0.1.0",
			"service": "reelstack-api",
		})
	})

	// ── Redis Cache ─────────────────────────────────────────────────────────
	redisClient, err := cache.NewClient(cfg.RedisURL)
	if err != nil {
		slog.Error("redis connect failed", "error", err)
		os.Exit(1)
	}
	defer redisClient.Close()

	// ── Queue ───────────────────────────────────────────────────────────────
	queueClient, err := queue.NewClient(cfg.RabbitMQURL)
	if err != nil {
		slog.Error("queue client failed", "error", err)
		os.Exit(1)
	}
	defer queueClient.Close()
	queueSvc := queue.NewService(queueClient, queue.DefaultConfig())

	// ── Email (Resend) ────────────────────────────────────────────────────────
	emailFrom := "Reelstack <noreply@jemails.jayfolio.dev>"
	emailClient := email.NewClient(cfg.ResendAPIKey, emailFrom, cfg.AppURL)
	if emailClient != nil {
		queueSvc.RegisterHandler(queue.JobTypeSendEmail, queue.NewSendEmailHandler(emailClient))
		queueSvc.RegisterHandler(queue.JobTypeSendWelcomeEmail, queue.NewSendWelcomeEmailHandler(emailClient))
	}

	// ── Wire: auth ────────────────────────────────────────────────────────────
	userRepo := users.NewUserRepository(database)
	authSvc := auth.NewAuthService(
		userRepo,
		cfg.JWTSecret,
		cfg.GoogleClientID,
		cfg.GoogleClientSecret,
		cfg.GoogleRedirectURL,
		queueSvc,
	)
	authHandler := auth.NewHandler(authSvc, cfg.AppURL)
	authHandler.RegisterRoutes(app)

	// ── Wire: users ─────────────────────────────────────────────────────────
	listsRepo := lists.NewListRepository(database)
	usersSvc := users.NewUserService(userRepo, listsRepo, redisClient, cfg.JWTSecret)
	usersHandler := users.NewHandler(usersSvc)
	usersHandler.RegisterRoutes(app, auth.FiberAuthMiddleware(cfg.JWTSecret))

	// ── Wire: notifications ─────────────────────────────────────────────────
	notificationsRepo := notifications.NewNotificationRepository(database)
	notificationsSvc := notifications.NewNotificationService(notificationsRepo)
	notificationsHandler := notifications.NewHandler(notificationsSvc)
	notificationsHandler.RegisterRoutes(app, auth.FiberAuthMiddleware(cfg.JWTSecret))

	queueSvc.RegisterHandler(queue.JobTypeSendNotification, queue.NewSendNotificationHandler(notificationsSvc))

	// ── Wire: follows ───────────────────────────────────────────────────────
	followsRepo := follows.NewFollowRepository(database)
	followsSvc := follows.NewFollowService(followsRepo, notificationsSvc, queueSvc)
	followsHandler := follows.NewHandler(followsSvc)
	followsHandler.RegisterRoutes(app, auth.FiberAuthMiddleware(cfg.JWTSecret))

	// ── Wire: embed ─────────────────────────────────────────────────────────
	embedHandler := embed.NewHandler(userRepo, listsRepo)
	embedHandler.RegisterRoutes(app)

	// ── Wire: lists ──────────────────────────────────────────────────────────
	listsSvc := lists.NewListService(listsRepo, &followerFetcherAdapter{followsSvc: followsSvc}, queueSvc)
	listsHandler := lists.NewHandler(listsSvc)
	listsHandler.RegisterRoutes(app, auth.FiberAuthMiddleware(cfg.JWTSecret), auth.OptionalFiberAuthMiddleware(cfg.JWTSecret))

	// ── Wire: content ────────────────────────────────────────────────────────
	tmdbClient := content.NewTMDBClient(cfg.TMDBAPIKey, redisClient.Redis())
	wmClient := content.NewWatchmodeClient(cfg.WatchmodeAPIKey, database)
	contentSvc := content.NewService(tmdbClient, wmClient)
	contentHandler := content.NewHandler(contentSvc)
	contentHandler.RegisterRoutes(app)

	// ── Wire: comments ────────────────────────────────────────────────────────
	commentsRepo := comments.NewCommentRepository(database)
	commentsSvc := comments.NewCommentService(commentsRepo, queueSvc)
	commentsHandler := comments.NewHandler(commentsSvc)
	commentsHandler.RegisterRoutes(app, auth.FiberAuthMiddleware(cfg.JWTSecret))

	// ── Wire: saved_lists ─────────────────────────────────────────────────────
	savedListsRepo := saved_lists.NewSavedListRepository(database)
	savedListsSvc := saved_lists.NewSavedListService(savedListsRepo, listsRepo, notificationsSvc, queueSvc)
	savedListsHandler := saved_lists.NewHandler(savedListsSvc)
	savedListsHandler.RegisterRoutes(app, auth.FiberAuthMiddleware(cfg.JWTSecret))

	// ── Cron: weekly digest ─────────────────────────────────────────────────
	app.Post("/api/v1/cron/digests", func(c *fiber.Ctx) error {
		if cfg.CronSecret == "" || c.Get("X-Cron-Secret") != cfg.CronSecret {
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		grouped, err := notificationsSvc.GetUnreadGroupedByUser(c.Context())
		if err != nil {
			slog.Error("digest: failed to get unread notifications", "error", err)
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		var sent int
		for userID, notifs := range grouped {
			user, err := userRepo.GetUserByID(userID)
			if err != nil || user == nil {
				slog.Warn("digest: skipping user", "user_id", userID, "error", err)
				continue
			}

			items := make([]email.DigestItem, 0, len(notifs))
			for _, n := range notifs {
				actorName := ""
				if n.ActorUsername != nil {
					actorName = *n.ActorUsername
				}
				entityTitle := ""
				if n.EntityTitle != nil {
					entityTitle = *n.EntityTitle
				}
				items = append(items, email.DigestItem{
					Type:        n.Type,
					ActorName:   actorName,
					EntityTitle: entityTitle,
					CreatedAt:   n.CreatedAt.Format("Jan 2"),
				})
			}

			if err := emailClient.SendDigest(c.Context(), user.Email, user.Username, items); err != nil {
				slog.Error("digest: failed to send", "user_id", userID, "error", err)
				continue
			}
			sent++
		}

		slog.Info("digest: weekly digest sent", "users", sent)
		return c.JSON(fiber.Map{"sent": sent})
	})

	// ── Cron: backfill welcome emails ──────────────────────────────────────
	app.Post("/api/v1/cron/backfill-welcome", func(c *fiber.Ctx) error {
		if cfg.CronSecret == "" || c.Get("X-Cron-Secret") != cfg.CronSecret {
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		if emailClient == nil {
			slog.Error("backfill: email client not initialized (RESEND_API_KEY missing)")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "email client not initialized, RESEND_API_KEY may be missing",
			})
		}

		users, err := userRepo.GetAllUsers(c.Context())
		if err != nil {
			slog.Error("backfill: failed to get users", "error", err)
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		var sent int
		var errors []string
		for _, u := range users {
			if err := emailClient.SendWelcome(c.Context(), u.Email, u.Username); err != nil {
				errMsg := u.Email + ": " + err.Error()
				slog.Error("backfill: failed to send welcome email", "email", u.Email, "error", err)
				errors = append(errors, errMsg)
				continue
			}
			sent++
		}

		if len(errors) > 0 {
			slog.Error("backfill: completed with errors", "sent", sent, "failed", len(errors))
			return c.JSON(fiber.Map{"sent": sent, "failed": len(errors), "errors": errors})
		}

		slog.Info("backfill: welcome emails sent", "total", sent)
		return c.JSON(fiber.Map{"sent": sent})
	})

	// ── Log Routes ──────────────────────────────────────────────────────────
	slog.Info("Registered routes:")
	for _, route := range app.GetRoutes(true) {
		slog.Info("Route", "method", route.Method, "path", route.Path)
	}

	// ── Start Worker ────────────────────────────────────────────────────────
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	queueSvc.Start(ctx)
	defer queueSvc.Shutdown()

	// ── Graceful Shutdown ───────────────────────────────────────────────────
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGTERM, syscall.SIGINT)
		<-sig
		slog.Info("shutting down...")
		cancel()
		_ = app.Shutdown()
	}()

	// ── Start ───────────────────────────────────────────────────────────────
	slog.Info("Reelstack API starting...", "port", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}

func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "internal server error"

	// Check for our custom AppError first
	if appErr, ok := apperrors.IsAppError(err); ok {
		code = appErr.Code
		message = appErr.Message
		if appErr.Err != nil {
			slog.Error("request failed", "error", appErr.Err, "path", c.Path(), "method", c.Method())
		}
	} else if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	if code >= 500 {
		slog.Error("request failed", "error", err, "path", c.Path(), "method", c.Method())
	}

	return c.Status(code).JSON(fiber.Map{
		"error":   message,
		"success": false,
	})
}

type followerFetcherAdapter struct {
	followsSvc follows.IFollowService
}

func (a *followerFetcherAdapter) GetFollowerIDs(ctx context.Context, userID string) ([]string, error) {
	followers, err := a.followsSvc.GetFollowers(ctx, userID)
	if err != nil {
		return nil, err
	}
	ids := make([]string, len(followers))
	for i, f := range followers {
		ids[i] = f.ID.String()
	}
	return ids, nil
}


