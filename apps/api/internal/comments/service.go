package comments

import (
	"context"
	"errors"
	"strings"

	"github.com/Dubjay18/reelstack/api/internal/queue"
	"github.com/google/uuid"
)

var (
	ErrNotFound      = errors.New("comment not found")
	ErrForbidden     = errors.New("forbidden")
	ErrBodyTooLong   = errors.New("comment body must be under 1000 characters")
	ErrBodyRequired  = errors.New("comment body is required")
)

const maxBodyLength = 1000

type ICommentService interface {
	GetComments(ctx context.Context, tmdbID int, mediaType string) ([]*Comment, error)
	CreateComment(ctx context.Context, userID string, tmdbID int, mediaType string, input CreateCommentInput) (*Comment, error)
	DeleteComment(ctx context.Context, id, userID string) error
}

type CommentService struct {
	repo     ICommentRepository
	enqueuer queue.Enqueuer
}

func NewCommentService(repo ICommentRepository, enqueuer queue.Enqueuer) *CommentService {
	return &CommentService{
		repo:     repo,
		enqueuer: enqueuer,
	}
}

func (s *CommentService) GetComments(ctx context.Context, tmdbID int, mediaType string) ([]*Comment, error) {
	return s.repo.GetByContent(ctx, tmdbID, mediaType)
}

func (s *CommentService) CreateComment(ctx context.Context, userID string, tmdbID int, mediaType string, input CreateCommentInput) (*Comment, error) {
	body := strings.TrimSpace(input.Body)
	if body == "" {
		return nil, ErrBodyRequired
	}
	if len(body) > maxBodyLength {
		return nil, ErrBodyTooLong
	}

	comment := &Comment{
		ID:        uuid.NewString(),
		UserID:    userID,
		TMDBID:    tmdbID,
		MediaType: mediaType,
		Body:      body,
		ParentID:  input.ParentID,
	}

	if err := s.repo.Create(ctx, comment); err != nil {
		return nil, err
	}

	// Notify parent comment author on reply
	if input.ParentID != nil && s.enqueuer != nil {
		parent, err := s.repo.GetByID(ctx, *input.ParentID)
		if err == nil && parent != nil && parent.UserID != userID {
			_ = s.enqueuer.Enqueue(ctx, queue.JobTypeSendNotification, queue.SendNotificationPayload{
				UserID:   parent.UserID,
				ActorID:  userID,
				Type:     "comment_reply",
				EntityID: &comment.ID,
			})
		}
	}

	return comment, nil
}

func (s *CommentService) DeleteComment(ctx context.Context, id, userID string) error {
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
