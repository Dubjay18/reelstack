package auth

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/Dubjay18/reelstack/api/internal/users"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// IAuthService is the contract consumed by the HTTP handler.
type IAuthService interface {
	RegisterUser(email, password, username string) (*users.User, error)
	LoginUser(email, password string) (string, error)
	GoogleRedirectURL(state string) string
	GoogleCallback(ctx context.Context, code string) (string, error)
}

// AuthService implements IAuthService.
type AuthService struct {
	userRepo    users.IUserRepository
	secret      string
	oauthConfig *oauth2.Config
}

// NewAuthService wires all dependencies into the service.
func NewAuthService(
	userRepo users.IUserRepository,
	secret, clientID, clientSecret, redirectURL string,
) *AuthService {
	oauthCfg := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
	return &AuthService{
		userRepo:    userRepo,
		secret:      secret,
		oauthConfig: oauthCfg,
	}
}

// ── Password auth ─────────────────────────────────────────────────────────────

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// RegisterUser creates a new password-based user and returns a JWT.
func (s *AuthService) RegisterUser(email, password, username string) (*users.User, error) {
	existing, _ := s.userRepo.GetUserByEmail(email)
	if existing != nil {
		return nil, fmt.Errorf("user with email %s already exists", email)
	}

	hash, err := hashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	newUser := &users.User{
		ID:           uuid.New(),
		Email:        email,
		Username:     username,
		PasswordHash: &hash,
	}
	if err := s.userRepo.CreateUser(newUser); err != nil {
		return nil, err
	}
	return newUser, nil
}

// LoginUser validates credentials and returns a signed JWT.
func (s *AuthService) LoginUser(email, password string) (string, error) {
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil || user == nil {
		return "", fmt.Errorf("invalid email or password")
	}
	if user.PasswordHash == nil {
		return "", fmt.Errorf("this account uses Google sign-in; no password set")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		return "", fmt.Errorf("invalid email or password")
	}

	return GenerateToken(user.ID.String(), user.Username, s.secret)
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

// GoogleRedirectURL returns the Google consent URL for the given CSRF state.
func (s *AuthService) GoogleRedirectURL(state string) string {
	return s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOnline)
}

// GoogleCallback exchanges the authorization code for a token, fetches the
// Google profile, upserts the user row, and returns a signed JWT.
func (s *AuthService) GoogleCallback(ctx context.Context, code string) (string, error) {
	oauthToken, err := s.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return "", fmt.Errorf("exchange code: %w", err)
	}

	profile, err := googleProfileFetcher(oauthToken.AccessToken)
	if err != nil {
		return "", fmt.Errorf("fetch profile: %w", err)
	}

	return s.processGoogleProfile(profile)
}

// generateUsername creates a URL-safe username from a Google display name,
// appending a suffix from the Google sub to avoid collisions.
var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9_]`)

func generateUsername(displayName, googleSub string) string {
	base := strings.ToLower(strings.ReplaceAll(displayName, " ", "_"))
	base = nonAlphanumeric.ReplaceAllString(base, "")
	if base == "" {
		base = "user"
	}
	// append last 6 chars of googleSub for uniqueness
	suffix := googleSub
	if len(suffix) > 6 {
		suffix = suffix[len(suffix)-6:]
	}
	return base + "_" + suffix
}

// GoogleCallbackWithToken skips the OAuth code exchange and executes the
// profile-fetch → upsert → JWT path directly from an access token.
// This is used by unit tests to avoid needing a real OAuth flow.
func (s *AuthService) GoogleCallbackWithToken(ctx context.Context, accessToken string) (string, error) {
	profile, err := googleProfileFetcher(accessToken)
	if err != nil {
		return "", fmt.Errorf("fetch profile: %w", err)
	}
	return s.processGoogleProfile(profile)
}

// processGoogleProfile is the shared upsert-and-tokenise logic used by both
// GoogleCallback and GoogleCallbackWithToken.
func (s *AuthService) processGoogleProfile(profile *GoogleProfile) (string, error) {
	user, _ := s.userRepo.GetUserByGoogleID(profile.ID)
	if user == nil {
		user, _ = s.userRepo.GetUserByEmail(profile.Email)
	}

	if user == nil {
		username := generateUsername(profile.Name, profile.ID)
		picture := profile.Picture
		googleID := profile.ID
		user = &users.User{
			ID:        uuid.New(),
			Email:     profile.Email,
			Username:  username,
			AvatarURL: &picture,
			GoogleID:  &googleID,
		}
	} else {
		picture := profile.Picture
		user.AvatarURL = &picture
		if user.GoogleID == nil {
			googleID := profile.ID
			user.GoogleID = &googleID
		}
	}

	if err := s.userRepo.UpsertGoogleUser(user); err != nil {
		return "", fmt.Errorf("upsert user: %w", err)
	}
	return GenerateToken(user.ID.String(), user.Username, s.secret)
}