package content

import "github.com/gofiber/fiber/v2"

// TODO: TASK-029 — GET /api/search and GET /api/content/:type/:tmdbId
// See PLANNING.md for implementation details and task references.


type Handler struct {
	svc IContentService
}


func NewHandler(svc IContentService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router) {
	content := r.Group("/api/v1/content")
	content.Get("/:type/:tmdbId/streaming", h.GetStreamingAvailability)
	content.Get("/trending", h.GetTrending)
	content.Get("/search", h.Search)
	content.Get("/:type/:tmdbId", h.GetDetails)

	r.Get("/api/v1/stream/embed", h.GetEmbedSources)
}

func (h *Handler) GetStreamingAvailability(c *fiber.Ctx) error {
	tmdbID, err := c.ParamsInt("tmdbId")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid tmdbId")
	}
	mediaType := c.Params("type")
	if mediaType != "movie" && mediaType != "tv" {
		return fiber.NewError(fiber.StatusBadRequest, "type must be 'movie' or 'tv'")
	}
	countryCode := c.Query("country", "US")

	providers, err := h.svc.GetListAvailability(c.Context(), []ContentItem{{TMDBID: tmdbID, MediaType: mediaType}}, countryCode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch streaming availability")
	}

	return c.Status(fiber.StatusOK).JSON(providers[tmdbID])
}

func (h *Handler) GetTrending(c *fiber.Ctx) error {
	results, err := h.svc.GetTrending(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch trending content")
	}
	return c.Status(fiber.StatusOK).JSON(results)
}

func (h *Handler) Search(c *fiber.Ctx) error {
	query := c.Query("query")
	if query == "" {
		return fiber.NewError(fiber.StatusBadRequest, "query parameter is required")
	}

	searchType := c.Query("type", "")

	switch searchType {
	case "person":
		personResults, err := h.svc.SearchPeople(c.Context(), query)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to search people")
		}
		return c.Status(fiber.StatusOK).JSON(personResults)
	default:
		results, err := h.svc.Search(c.Context(), query)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to search content")
		}
		return c.Status(fiber.StatusOK).JSON(results)
	}
}

func (h *Handler) GetDetails(c *fiber.Ctx) error {
	tmdbID, err := c.ParamsInt("tmdbId")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid tmdbId")
	}
	mediaType := c.Params("type")
	if mediaType != "movie" && mediaType != "tv" {
		return fiber.NewError(fiber.StatusBadRequest, "type must be 'movie' or 'tv'")
	}

	details, err := h.svc.GetDetails(c.Context(), mediaType, tmdbID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to fetch content details")
	}

	return c.Status(fiber.StatusOK).JSON(details)
}

func (h *Handler) GetEmbedSources(c *fiber.Ctx) error {
	tmdbID := c.QueryInt("tmdbId")
	if tmdbID <= 0 {
		return fiber.NewError(fiber.StatusBadRequest, "invalid tmdbId")
	}
	mediaType := c.Query("type")
	if mediaType != "movie" && mediaType != "tv" {
		return fiber.NewError(fiber.StatusBadRequest, "type must be 'movie' or 'tv'")
	}

	season := c.QueryInt("season")
	episode := c.QueryInt("episode")
	if mediaType == "tv" {
		if season < 1 {
			season = 1
		}
		if episode < 1 {
			episode = 1
		}
	}

	sources, err := h.svc.GetEmbedSources(c.Context(), mediaType, tmdbID, season, episode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to resolve embed sources")
	}
	if sources == nil {
		sources = []EmbedSource{}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"sources": sources})
}