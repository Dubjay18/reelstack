package lists

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrNotFound  = errors.New("not found")
	ErrForbidden = errors.New("forbidden")
)

func GenerateSlug(title string) string {
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	
	var b strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			b.WriteRune(r)
		}
	}
	result := b.String()
	
	// Remove consecutive dashes
	for strings.Contains(result, "--") {
		result = strings.ReplaceAll(result, "--", "-")
	}
	result = strings.Trim(result, "-")
	if result == "" {
		result = "untitled"
	}
	return result
}

type IListService interface {
	// List operations
	CreateList(ctx context.Context, list *List) error
	GetListByID(ctx context.Context, id string, requesterUserID string) (*List, error)
	GetListsByUserID(ctx context.Context, userID string) ([]*List, error)
	UpdateList(ctx context.Context, list *List, requesterUserID string) error
	DeleteList(ctx context.Context, id string, requesterUserID string) error
	
	// List item operations
	AddItemToList(ctx context.Context, listID string, item *ListItem, requesterUserID string) error
	GetItemsByListID(ctx context.Context, listID string, requesterUserID string) ([]*ListItem, error)
	UpdateListItem(ctx context.Context, item *ListItem, requesterUserID string) error
	DeleteListItem(ctx context.Context, id string, requesterUserID string) error
}

type ListService struct {
	repo IListRepository
}

func NewListService(repo IListRepository) *ListService {
	return &ListService{repo: repo}
}

func (s *ListService) CreateList(ctx context.Context, list *List) error {
	if list.ID == "" {
		list.ID = uuid.NewString()
	}
	list.Slug = GenerateSlug(list.Title)
	return s.repo.CreateList(ctx, list)
}

func (s *ListService) GetListsByUserID(ctx context.Context, userID string) ([]*List, error) {
	return s.repo.GetListsByUserID(ctx, userID)
}

func (s *ListService) GetListByID(ctx context.Context, id string, requesterUserID string) (*List, error) {
	list, err := s.repo.GetListByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if list == nil {
		return nil, ErrNotFound
	}
	
	// Visibility check: public lists accessible to all, private only to owner.
	if !list.IsPublic && list.UserID != requesterUserID {
		return nil, ErrForbidden
	}
	
	return list, nil
}

func (s *ListService) UpdateList(ctx context.Context, list *List, requesterUserID string) error {
	existing, err := s.repo.GetListByID(ctx, list.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrNotFound
	}
	
	// Ownership check
	if existing.UserID != requesterUserID {
		return ErrForbidden
	}
	
	// Keep the owner
	list.UserID = existing.UserID

	// Merge fields if they are zero/nil (partial update safety)
	if list.Title == "" {
		list.Title = existing.Title
	}
	if list.Description == nil {
		list.Description = existing.Description
	}
	
	// Generate a new slug if the title has changed
	if list.Title != existing.Title {
		list.Slug = GenerateSlug(list.Title)
	} else {
		list.Slug = existing.Slug
	}
	
	return s.repo.UpdateList(ctx, list)
}

func (s *ListService) DeleteList(ctx context.Context, id string, requesterUserID string) error {
	existing, err := s.repo.GetListByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrNotFound
	}
	
	// Ownership check
	if existing.UserID != requesterUserID {
		return ErrForbidden
	}
	
	return s.repo.DeleteList(ctx, id)
}

func (s *ListService) AddItemToList(ctx context.Context, listID string, item *ListItem, requesterUserID string) error {
	list, err := s.repo.GetListByID(ctx, listID)
	if err != nil {
		return err
	}
	if list == nil {
		return ErrNotFound
	}
	
	// Ownership check
	if list.UserID != requesterUserID {
		return ErrForbidden
	}
	
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	
	return s.repo.AddItemToList(ctx, listID, item)
}

func (s *ListService) GetItemsByListID(ctx context.Context, listID string, requesterUserID string) ([]*ListItem, error) {
	list, err := s.repo.GetListByID(ctx, listID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		return nil, ErrNotFound
	}
	
	// Visibility check
	if !list.IsPublic && list.UserID != requesterUserID {
		return nil, ErrForbidden
	}
	
	return s.repo.GetItemsByListID(ctx, listID)
}

func (s *ListService) UpdateListItem(ctx context.Context, item *ListItem, requesterUserID string) error {
	existingItem, err := s.repo.GetListItemByID(ctx, item.ID)
	if err != nil {
		return err
	}
	if existingItem == nil {
		return ErrNotFound
	}
	
	list, err := s.repo.GetListByID(ctx, existingItem.ListID)
	if err != nil {
		return err
	}
	if list == nil {
		return ErrNotFound
	}
	
	// Ownership check
	if list.UserID != requesterUserID {
		return ErrForbidden
	}
	
	// Keep immutable fields
	item.ListID = existingItem.ListID
	item.TMDBID = existingItem.TMDBID
	item.MediaType = existingItem.MediaType
	
	return s.repo.UpdateListItem(ctx, item)
}

func (s *ListService) DeleteListItem(ctx context.Context, id string, requesterUserID string) error {
	existingItem, err := s.repo.GetListItemByID(ctx, id)
	if err != nil {
		return err
	}
	if existingItem == nil {
		return ErrNotFound
	}
	
	list, err := s.repo.GetListByID(ctx, existingItem.ListID)
	if err != nil {
		return err
	}
	if list == nil {
		return ErrNotFound
	}
	
	// Ownership check
	if list.UserID != requesterUserID {
		return ErrForbidden
	}
	
	return s.repo.DeleteListItem(ctx, id)
}