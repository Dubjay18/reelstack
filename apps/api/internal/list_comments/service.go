package list_comments

import (
	"context"
	"errors"
	"strings"

	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/internal/queue"
	"github.com/google/uuid"
)

var (
	ErrNotFound      = errors.New("comment not found")
	ErrForbidden     = errors.New("forbidden")
	ErrBodyTooLong   = errors.New("comment body must be under 1000 characters")
	ErrBodyRequired  = errors.New("comment body is required")
	ErrInvalidType   = errors.New("type must be 'comment' or 'suggestion'")
	ErrListNotFound  = errors.New("list not found")
	ErrListNotPublic = errors.New("cannot comment on a private list")
)

const maxBodyLength = 1000

type IListCommentService interface {
	GetComments(ctx context.Context, listID string) ([]*ListComment, error)
	CreateComment(ctx context.Context, userID, listID string, input CreateListCommentInput) (*ListComment, error)
	DeleteComment(ctx context.Context, id, userID string) error
}

type ListCommentService struct {
	repo     IListCommentRepository
	listRepo lists.IListRepository
	enqueuer queue.Enqueuer
}

func NewListCommentService(repo IListCommentRepository, listRepo lists.IListRepository, enqueuer queue.Enqueuer) *ListCommentService {
	return &ListCommentService{
		repo:     repo,
		listRepo: listRepo,
		enqueuer: enqueuer,
	}
}

func (s *ListCommentService) getPublicList(ctx context.Context, listID string) (*lists.List, error) {
	list, err := s.listRepo.GetListByID(ctx, listID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		return nil, ErrListNotFound
	}
	if !list.IsPublic {
		return nil, ErrListNotPublic
	}
	return list, nil
}

func (s *ListCommentService) GetComments(ctx context.Context, listID string) ([]*ListComment, error) {
	if _, err := s.getPublicList(ctx, listID); err != nil {
		return nil, err
	}
	return s.repo.GetByListID(ctx, listID)
}

func (s *ListCommentService) CreateComment(ctx context.Context, userID, listID string, input CreateListCommentInput) (*ListComment, error) {
	list, err := s.getPublicList(ctx, listID)
	if err != nil {
		return nil, err
	}

	body := strings.TrimSpace(input.Body)
	if body == "" {
		return nil, ErrBodyRequired
	}
	if len(body) > maxBodyLength {
		return nil, ErrBodyTooLong
	}

	commentType := input.Type
	if commentType == "" {
		commentType = "comment"
	}
	if commentType != "comment" && commentType != "suggestion" {
		return nil, ErrInvalidType
	}

	comment := &ListComment{
		ID:       uuid.NewString(),
		ListID:   listID,
		UserID:   userID,
		Type:     commentType,
		Body:     body,
		ParentID: input.ParentID,
	}

	if err := s.repo.Create(ctx, comment); err != nil {
		return nil, err
	}

	if s.enqueuer != nil && list.UserID != userID {
		_ = s.enqueuer.Enqueue(ctx, queue.JobTypeSendNotification, queue.SendNotificationPayload{
			UserID:   list.UserID,
			ActorID:  userID,
			Type:     "list_comment",
			EntityID: &comment.ID,
		})
	}

	return comment, nil
}

func (s *ListCommentService) DeleteComment(ctx context.Context, id, userID string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrNotFound
	}
	if existing.UserID != userID {
		return ErrForbidden
	}
	return s.repo.Delete(ctx, id, userID)
}
