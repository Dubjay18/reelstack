package users

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"time"

	"github.com/Dubjay18/reelstack/api/internal/lists"
	"github.com/Dubjay18/reelstack/api/pkg/cache"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrUsernameTaken = errors.New("username already taken")
	ErrInvalidInput  = errors.New("invalid username or bio format")
)

type UpdateProfileInput struct {
	Username  *string `json:"username"`
	Bio       *string `json:"bio"`
	AvatarURL *string `json:"avatar_url"`
}

type IUserService interface {
	GetPublicProfile(ctx context.Context, identifier string) (*PublicProfile, error)
	UpdateProfile(ctx context.Context, userID string, input UpdateProfileInput) (*User, string, error)
}

type UserService struct {
	repo      IUserRepository
	listRepo  lists.IListRepository
	cache     *cache.Client
	jwtSecret string
}

func NewUserService(repo IUserRepository, listRepo lists.IListRepository, cache *cache.Client, jwtSecret string) *UserService {
	return &UserService{
		repo:      repo,
		listRepo:  listRepo,
		cache:     cache,
		jwtSecret: jwtSecret,
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

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,50}$`)

func (s *UserService) UpdateProfile(ctx context.Context, userID string, input UpdateProfileInput) (*User, string, error) {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, "", err
	}
	if user == nil {
		return nil, "", ErrNotFound
	}

	oldUsername := user.Username
	usernameChanged := false

	// Validate and update username
	if input.Username != nil && *input.Username != user.Username {
		newUsername := *input.Username
		if !usernameRegex.MatchString(newUsername) {
			return nil, "", ErrInvalidInput
		}

		existing, err := s.repo.GetUserByUsername(newUsername)
		if err != nil {
			return nil, "", err
		}
		if existing != nil {
			return nil, "", ErrUsernameTaken
		}

		user.Username = newUsername
		usernameChanged = true
	}

	// Validate and update bio
	if input.Bio != nil {
		if len(*input.Bio) > 160 {
			return nil, "", ErrInvalidInput
		}
		user.Bio = input.Bio
	}

	// Update avatar URL
	if input.AvatarURL != nil {
		user.AvatarURL = input.AvatarURL
	}

	// Persist
	if err := s.repo.UpdateUser(user); err != nil {
		return nil, "", err
	}

	// Invalidate Redis cache keys
	cacheKeyOld := "profile:user:" + oldUsername
	cacheKeyID := "profile:user:" + userID
	_ = s.cache.Delete(ctx, cacheKeyOld)
	_ = s.cache.Delete(ctx, cacheKeyID)

	if usernameChanged {
		cacheKeyNew := "profile:user:" + user.Username
		_ = s.cache.Delete(ctx, cacheKeyNew)
	}

	// Generate new JWT token
	token, err := s.generateToken(user.ID.String(), user.Username)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

func (s *UserService) generateToken(userID, username string) (string, error) {
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      time.Now().Add(time.Hour * 72).Unix(),
	})
	return tk.SignedString([]byte(s.jwtSecret))
}