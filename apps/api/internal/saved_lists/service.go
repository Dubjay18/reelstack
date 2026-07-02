package saved_lists

import (
	"context"
	"errors"

	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/internal/notifications"
	"github.com/Dubjay18/reelstack/api/internal/queue"
)

var (
	ErrCannotSaveOwnList = errors.New("cannot save your own list")
	ErrListNotFound      = errors.New("list not found")
	ErrListNotPublic     = errors.New("cannot save a private list")
)

type ISavedListService interface {
	Save(ctx context.Context, userID, listID string) error
	Unsave(ctx context.Context, userID, listID string) error
	IsSaved(ctx context.Context, userID, listID string) (bool, error)
	GetSavedLists(ctx context.Context, userID string) ([]*SavedListResponse, error)
	GetSaveCount(ctx context.Context, listID string) (int, error)
}

type SavedListService struct {
	repo      ISavedListRepository
	listRepo  lists.IListRepository
	notifSvc  notifications.INotificationService
	enqueuer  queue.Enqueuer
}

func NewSavedListService(repo ISavedListRepository, listRepo lists.IListRepository, notifSvc notifications.INotificationService, enqueuer queue.Enqueuer) *SavedListService {
	return &SavedListService{
		repo:     repo,
		listRepo: listRepo,
		notifSvc: notifSvc,
		enqueuer: enqueuer,
	}
}

func (s *SavedListService) Save(ctx context.Context, userID, listID string) error {
	list, err := s.listRepo.GetListByID(ctx, listID)
	if err != nil {
		return err
	}
	if list == nil {
		return ErrListNotFound
	}
	if list.UserID == userID {
		return ErrCannotSaveOwnList
	}
	if !list.IsPublic {
		return ErrListNotPublic
	}

	err = s.repo.Save(ctx, userID, listID)
	if err != nil {
		return err
	}

	_ = s.enqueuer.Enqueue(ctx, queue.JobTypeSendNotification, queue.SendNotificationPayload{
		UserID:   list.UserID,
		ActorID:  userID,
		Type:     "list_saved",
		EntityID: &listID,
	})

	return nil
}

func (s *SavedListService) Unsave(ctx context.Context, userID, listID string) error {
	list, err := s.listRepo.GetListByID(ctx, listID)
	if err != nil {
		return err
	}
	if list == nil {
		return ErrListNotFound
	}

	err = s.repo.Unsave(ctx, userID, listID)
	if err != nil {
		return err
	}

	_ = s.notifSvc.DeleteSavedListNotification(ctx, list.UserID, userID, listID)

	return nil
}

func (s *SavedListService) IsSaved(ctx context.Context, userID, listID string) (bool, error) {
	return s.repo.IsSaved(ctx, userID, listID)
}

func (s *SavedListService) GetSavedLists(ctx context.Context, userID string) ([]*SavedListResponse, error) {
	return s.repo.GetSavedLists(ctx, userID)
}

func (s *SavedListService) GetSaveCount(ctx context.Context, listID string) (int, error) {
	return s.repo.GetSaveCount(ctx, listID)
}
