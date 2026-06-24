package users

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/pkg/cache"
	"github.com/google/uuid"
)

var (
	ErrNotFound = errors.New("not found")
)

type IUserService interface {
	GetPublicProfile(ctx context.Context, identifier string) (*PublicProfile, error)
}

type UserService struct {
	repo     IUserRepository
	listRepo lists.IListRepository
	cache    *cache.Client
}

func NewUserService(repo IUserRepository, listRepo lists.IListRepository, cache *cache.Client) *UserService {
	return &UserService{
		repo:     repo,
		listRepo: listRepo,
		cache:    cache,
	}
}

func (s *UserService) GetPublicProfile(ctx context.Context, identifier string) (*PublicProfile, error) {
	// 1. Try to fetch from Redis cache first
	cacheKey := "profile:user:" + identifier
	cachedData, err := s.cache.Get(ctx, cacheKey)
	if err == nil {
		var profile PublicProfile
		if err := json.Unmarshal([]byte(cachedData), &profile); err == nil {
			return &profile, nil
		}
	}

	// 2. Cache Miss: Retrieve from database
	var user *User
	var dbErr error
	if _, err := uuid.Parse(identifier); err == nil {
		user, dbErr = s.repo.GetUserByID(identifier)
	} else {
		user, dbErr = s.repo.GetUserByUsername(identifier)
	}

	if dbErr != nil {
		return nil, dbErr
	}
	if user == nil {
		return nil, ErrNotFound
	}

	// Fetch all public lists for this user
	publicLists, err := s.listRepo.GetPublicListsByUserID(ctx, user.ID.String())
	if err != nil {
		return nil, err
	}

	// Map and construct public profile (exclude email)
	profile := &PublicProfile{
		ID:          user.ID,
		Username:    user.Username,
		AvatarURL:   user.AvatarURL,
		Bio:         user.Bio,
		PublicLinks: publicLists,
	}

	// Sum item count across all public lists
	var totalItems int
	for _, l := range publicLists {
		totalItems += l.ItemCount
	}
	profile.ItemCount = totalItems

	// 3. Serialize and save to Redis cache for 5 minutes (UserProfileTTL)
	profileBytes, err := json.Marshal(profile)
	if err == nil {
		_ = s.cache.Set(ctx, cacheKey, profileBytes, cache.UserProfileTTL)
	}

	return profile, nil
}