package lists

import "github.com/gofiber/fiber/v2"


type Handler struct {
	svc IListService
}


func NewHandler(svc IListService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router, authMiddleware fiber.Handler) {
	lists := r.Group("/api/v1/lists", authMiddleware)
	lists.Post("", h.CreateList)
	lists.Get("", h.GetLists)
	lists.Get("/:id", h.GetListByID)
	lists.Put("/:id", h.UpdateList)
	lists.Delete("/:id", h.DeleteList)

	items := lists.Group("/:listId/items")
	items.Post("", h.AddItemToList)
	items.Get("", h.GetItemsByListID)
	items.Put("/:itemId", h.UpdateListItem)
	items.Delete("/:itemId", h.DeleteListItem)
}

func (h *Handler) CreateList(c *fiber.Ctx) error {
	var list List
	if err := c.BodyParser(&list); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	userID := c.Locals("userID").(string)
	list.UserID = userID

	if err := h.svc.CreateList(c.Context(), &list); err != nil {
		if err == ErrDuplicateSlug {
			return fiber.NewError(fiber.StatusConflict, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create list")
	}

	return c.Status(fiber.StatusCreated).JSON(list)
}

func (h *Handler) GetListByID(c *fiber.Ctx) error {
	listID := c.Params("id")
	userID := c.Locals("userID").(string)

	list, err := h.svc.GetListByID(c.Context(), listID, userID)
	if err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		if err == ErrForbidden {
			return fiber.NewError(fiber.StatusForbidden, "access denied to this list")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve list")
	}

	return c.Status(fiber.StatusOK).JSON(list)
}	

func (h *Handler) UpdateList(c *fiber.Ctx) error {
	var list List
	if err := c.BodyParser(&list); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	list.ID = c.Params("id")
	userID := c.Locals("userID").(string)

	if err := h.svc.UpdateList(c.Context(), &list, userID); err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		if err == ErrForbidden {
			return fiber.NewError(fiber.StatusForbidden, "access denied to update this list")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update list")
	}

	return c.Status(fiber.StatusOK).JSON(list)
}


func (h *Handler) DeleteList(c *fiber.Ctx) error {
	listID := c.Params("id")
	userID := c.Locals("userID").(string)
	
	if err := h.svc.DeleteList(c.Context(), listID, userID); err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		if err == ErrForbidden {
			return fiber.NewError(fiber.StatusForbidden, "access denied to delete this list")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to delete list")
	}
	
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) AddItemToList(c *fiber.Ctx) error {
	var item ListItem
	if err := c.BodyParser(&item); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	listID := c.Params("listId")
	userID := c.Locals("userID").(string)
	
	if err := h.svc.AddItemToList(c.Context(), listID, &item, userID); err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		if err == ErrForbidden {
			return fiber.NewError(fiber.StatusForbidden, "access denied to add item to this list")
		}
		if err == ErrDuplicateItem {
			return fiber.NewError(fiber.StatusConflict, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to add item to list")
	}
	
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *Handler) GetItemsByListID(c *fiber.Ctx) error {
	listID := c.Params("listId")
	userID := c.Locals("userID").(string)
	
	items, err := h.svc.GetItemsByListID(c.Context(), listID, userID)
	if err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list not found")
		}
		if err == ErrForbidden {
			return fiber.NewError(fiber.StatusForbidden, "access denied to view items of this list")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve items for the list")
	}
	
	return c.Status(fiber.StatusOK).JSON(items)
}

func (h *Handler) UpdateListItem(c *fiber.Ctx) error {
	var item ListItem
	if err := c.BodyParser(&item); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	item.ID = c.Params("itemId")
	userID := c.Locals("userID").(string)
	
	if err := h.svc.UpdateListItem(c.Context(), &item, userID); err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list item not found")
		}
		if err == ErrForbidden {
			return fiber.NewError(fiber.StatusForbidden, "access denied to update this list item")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update list item")
	}
	
	return c.Status(fiber.StatusOK).JSON(item)
}

func (h *Handler) DeleteListItem(c *fiber.Ctx) error {
	itemID := c.Params("itemId")
	userID := c.Locals("userID").(string)
	
	if err := h.svc.DeleteListItem(c.Context(), itemID, userID); err != nil {
		if err == ErrNotFound {
			return fiber.NewError(fiber.StatusNotFound, "list item not found")
		}
		if err == ErrForbidden {
			return fiber.NewError(fiber.StatusForbidden, "access denied to delete this list item")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to delete list item")
	}
	
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) GetLists(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	lists, err := h.svc.GetListsByUserID(c.Context(), userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to retrieve lists")
	}
	return c.Status(fiber.StatusOK).JSON(lists)
}	

