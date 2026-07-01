package errors

import (
	"errors"
	"fmt"

	"github.com/lib/pq"
)

// AppError represents an application-level error with an HTTP status code,
// a user-safe message, and an optional internal wrapped error for logging.
type AppError struct {
	Code    int
	Message string
	Err     error
}

func (e *AppError) Error() string {
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// New creates a new AppError with the given status code and message.
func New(code int, message string) *AppError {
	return &AppError{Code: code, Message: message}
}

// Wrap creates a new AppError wrapping an underlying error.
func Wrap(code int, message string, err error) *AppError {
	return &AppError{Code: code, Message: message, Err: err}
}

// Sentinel errors shared across packages.
var (
	ErrNotFound      = errors.New("not found")
	ErrForbidden     = errors.New("forbidden")
	ErrConflict      = errors.New("conflict")
	ErrInvalidInput  = errors.New("invalid input")
	ErrDuplicate     = errors.New("duplicate entry")
	ErrUnauthorized  = errors.New("unauthorized")
)

// IsAppError reports whether err is an *AppError.
func IsAppError(err error) (*AppError, bool) {
	var e *AppError
	if ok := errors.As(err, &e); ok {
		return e, true
	}
	return nil, false
}

// IsUniqueViolation checks whether err is a PostgreSQL unique constraint violation.
func IsUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return pqErr.Code == "23505"
	}
	// Walk the chain for wrapped errors
	return false
}

// IsForeignKeyViolation checks whether err is a PostgreSQL foreign key violation.
func IsForeignKeyViolation(err error) bool {
	if err == nil {
		return false
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return pqErr.Code == "23503"
	}
	return false
}

// Sanitize returns a safe, user-facing message for a generic error.
// The full error is embedded in the returned AppError's Err field for logging.
func Sanitize(err error) *AppError {
	return Wrap(500, "internal server error", err)
}

// SentinelToStatus maps common sentinel errors to their HTTP status codes.
// Returns 0 if the error is not a recognized sentinel.
func SentinelToStatus(err error) int {
	if errors.Is(err, ErrNotFound) {
		return 404
	}
	if errors.Is(err, ErrForbidden) {
		return 403
	}
	if errors.Is(err, ErrConflict) || errors.Is(err, ErrDuplicate) {
		return 409
	}
	if errors.Is(err, ErrInvalidInput) {
		return 400
	}
	if errors.Is(err, ErrUnauthorized) {
		return 401
	}
	return 0
}

// MapError takes a domain error and returns the appropriate AppError.
// It handles sentinel errors, PG constraint violations, and generic errors.
func MapError(err error) *AppError {
	if err == nil {
		return nil
	}

	// Already an AppError
	if appErr, ok := IsAppError(err); ok {
		return appErr
	}

	// Check sentinel errors
	if code := SentinelToStatus(err); code != 0 {
		return New(code, err.Error())
	}

	// Check PG unique constraint violation
	if IsUniqueViolation(err) {
		return New(409, fmt.Sprintf("duplicate entry: %s", err.Error()))
	}

	// Check PG foreign key violation
	if IsForeignKeyViolation(err) {
		return New(400, "referenced resource does not exist")
	}

	// Generic fallback
	return Sanitize(err)
}
