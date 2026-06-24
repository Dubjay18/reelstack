package main

import (
	"log/slog"
	"os"

	"github.com/Dubjay18/reelstack/api/internal/auth"
	"github.com/Dubjay18/reelstack/api/internal/content"
	"github.com/Dubjay18/reelstack/api/internal/embed"
	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/Dubjay18/reelstack/api/pkg/cache"
	"github.com/Dubjay18/reelstack/api/pkg/config"
	"github.com/Dubjay18/reelstack/api/pkg/db"
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
	if len(os.Args) > 1 && os.Args[1] == "--migrate-only" {
		slog.Info("Running migrations...")
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
		slog.Info("Migrations completed successfully.")
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

	// ── Wire: auth ──────────────────────────────────────────────────────────
	userRepo := users.NewUserRepository(database)
	authSvc := auth.NewAuthService(
		userRepo,
		cfg.JWTSecret,
		cfg.GoogleClientID,
		cfg.GoogleClientSecret,
		cfg.GoogleRedirectURL,
	)
	authHandler := auth.NewHandler(authSvc, cfg.AppURL)
	authHandler.RegisterRoutes(app)

	// ── Wire: users ─────────────────────────────────────────────────────────
	listsRepo := lists.NewListRepository(database)
	usersSvc := users.NewUserService(userRepo, listsRepo, redisClient)
	usersHandler := users.NewHandler(usersSvc)
	usersHandler.RegisterRoutes(app)

	// ── Wire: embed ─────────────────────────────────────────────────────────
	embedHandler := embed.NewHandler(userRepo, listsRepo)
	embedHandler.RegisterRoutes(app)

	// ── Wire: lists ──────────────────────────────────────────────────────────
	listsSvc := lists.NewListService(listsRepo)
	listsHandler := lists.NewHandler(listsSvc)
	listsHandler.RegisterRoutes(app, auth.FiberAuthMiddleware(cfg.JWTSecret))

	// ── Wire: content ────────────────────────────────────────────────────────
	tmdbClient := content.NewTMDBClient(cfg.TMDBAPIKey, redisClient.Redis())
	wmClient := content.NewWatchmodeClient(cfg.WatchmodeAPIKey, database)
	contentSvc := content.NewService(tmdbClient, wmClient)
	contentHandler := content.NewHandler(contentSvc)
	contentHandler.RegisterRoutes(app)

	// ── Log Routes ──────────────────────────────────────────────────────────
	slog.Info("Registered routes:")
	for _, route := range app.GetRoutes(true) {
		slog.Info("Route", "method", route.Method, "path", route.Path)
	}

	// ── Start ───────────────────────────────────────────────────────────────
	slog.Info("Reelstack API starting...", "port", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}
}

func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"error":   err.Error(),
		"success": false,
	})
}
