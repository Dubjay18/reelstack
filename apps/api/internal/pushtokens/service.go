package pushtokens

import (
	"context"
	"errors"
)

var ErrInvalidPlatform = errors.New("platform must be \"android\" or \"ios\"")

type IPushTokenService interface {
	Register(ctx context.Context, userID, token, platform string) error
	Unregister(ctx context.Context, userID, token string) error
	GetTokensForUser(ctx context.Context, userID string) ([]string, error)
}

type PushTokenService struct {
	repo IPushTokenRepository
}

func NewPushTokenService(repo IPushTokenRepository) *PushTokenService {
	return &PushTokenService{repo: repo}
}

func (s *PushTokenService) Register(ctx context.Context, userID, token, platform string) error {
	if platform != "android" && platform != "ios" {
		return ErrInvalidPlatform
	}
	return s.repo.Upsert(ctx, userID, token, platform)
}

func (s *PushTokenService) Unregister(ctx context.Context, userID, token string) error {
	return s.repo.DeleteByUserAndToken(ctx, userID, token)
}

func (s *PushTokenService) GetTokensForUser(ctx context.Context, userID string) ([]string, error) {
	return s.repo.GetTokensForUser(ctx, userID)
}
