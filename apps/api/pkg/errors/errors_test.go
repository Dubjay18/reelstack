package errors_test

import (
	"errors"
	"fmt"
	"testing"

	apperrors "github.com/Dubjay18/reelstack/api/pkg/errors"
	"github.com/lib/pq"
)

func TestAppError(t *testing.T) {
	err := apperrors.New(409, "item already exists")
	if err.Code != 409 {
		t.Errorf("want code 409, got %d", err.Code)
	}
	if err.Error() != "item already exists" {
		t.Errorf("want message 'item already exists', got %s", err.Error())
	}
}

func TestAppErrorWrap(t *testing.T) {
	inner := errors.New("inner error")
	err := apperrors.Wrap(500, "something failed", inner)
	if err.Code != 500 {
		t.Errorf("want code 500, got %d", err.Code)
	}
	if !errors.Is(err, inner) {
		t.Errorf("expected errors.Is to find wrapped error")
	}
}

func TestIsAppError(t *testing.T) {
	appErr := apperrors.New(404, "not found")
	regularErr := errors.New("regular error")

	if _, ok := apperrors.IsAppError(appErr); !ok {
		t.Error("expected IsAppError to return true for AppError")
	}
	if _, ok := apperrors.IsAppError(regularErr); ok {
		t.Error("expected IsAppError to return false for regular error")
	}
}

func TestSentinelToStatus(t *testing.T) {
	tests := []struct {
		err       error
		wantCode  int
	}{
		{apperrors.ErrNotFound, 404},
		{apperrors.ErrForbidden, 403},
		{apperrors.ErrConflict, 409},
		{apperrors.ErrDuplicate, 409},
		{apperrors.ErrInvalidInput, 400},
		{apperrors.ErrUnauthorized, 401},
		{errors.New("unknown"), 0},
		{nil, 0},
	}
	for _, tt := range tests {
		code := apperrors.SentinelToStatus(tt.err)
		if code != tt.wantCode {
			t.Errorf("SentinelToStatus(%v) = %d, want %d", tt.err, code, tt.wantCode)
		}
	}
}

func TestIsUniqueViolation(t *testing.T) {
	pqErr := &pq.Error{Code: "23505"}
	wrapped := fmt.Errorf("wrapped: %w", pqErr)

	if !apperrors.IsUniqueViolation(pqErr) {
		t.Error("expected IsUniqueViolation to return true for pq.Error with code 23505")
	}
	if !apperrors.IsUniqueViolation(wrapped) {
		t.Error("expected IsUniqueViolation to detect wrapped pq.Error")
	}
	if apperrors.IsUniqueViolation(errors.New("some error")) {
		t.Error("expected IsUniqueViolation to return false for regular error")
	}
	if apperrors.IsUniqueViolation(nil) {
		t.Error("expected IsUniqueViolation to return false for nil")
	}
}

func TestIsForeignKeyViolation(t *testing.T) {
	pqErr := &pq.Error{Code: "23503"}
	if !apperrors.IsForeignKeyViolation(pqErr) {
		t.Error("expected IsForeignKeyViolation to return true for pq.Error with code 23503")
	}
	if apperrors.IsForeignKeyViolation(errors.New("some error")) {
		t.Error("expected IsForeignKeyViolation to return false for regular error")
	}
	if apperrors.IsForeignKeyViolation(nil) {
		t.Error("expected IsForeignKeyViolation to return false for nil")
	}
}

func TestMapError_AlreadyAppError(t *testing.T) {
	original := apperrors.New(409, "custom conflict")
	mapped := apperrors.MapError(original)
	if mapped != original {
		t.Error("expected MapError to return the same AppError unchanged")
	}
}

func TestMapError_Sentinel(t *testing.T) {
	mapped := apperrors.MapError(apperrors.ErrNotFound)
	if mapped == nil || mapped.Code != 404 {
		t.Errorf("want 404, got %v", mapped)
	}
}

func TestMapError_UniqueViolation(t *testing.T) {
	pqErr := &pq.Error{Code: "23505", Message: "duplicate key value"}
	mapped := apperrors.MapError(pqErr)
	if mapped == nil || mapped.Code != 409 {
		t.Errorf("want 409 for unique violation, got %v", mapped)
	}
}

func TestMapError_ForeignKeyViolation(t *testing.T) {
	pqErr := &pq.Error{Code: "23503", Message: "foreign key violation"}
	mapped := apperrors.MapError(pqErr)
	if mapped == nil || mapped.Code != 400 {
		t.Errorf("want 400 for foreign key violation, got %v", mapped)
	}
}

func TestMapError_Generic(t *testing.T) {
	mapped := apperrors.MapError(errors.New("something bad"))
	if mapped == nil || mapped.Code != 500 {
		t.Errorf("want 500 for generic error, got %v", mapped)
	}
	if mapped.Message != "internal server error" {
		t.Errorf("want sanitized message, got %s", mapped.Message)
	}
}

func TestMapError_Nil(t *testing.T) {
	if mapped := apperrors.MapError(nil); mapped != nil {
		t.Error("expected nil for nil input")
	}
}

func TestSanitize(t *testing.T) {
	original := errors.New("sensitive db error")
	sanitized := apperrors.Sanitize(original)
	if sanitized.Code != 500 {
		t.Errorf("want code 500, got %d", sanitized.Code)
	}
	if sanitized.Message != "internal server error" {
		t.Errorf("want sanitized message, got %s", sanitized.Message)
	}
	if !errors.Is(sanitized, original) {
		t.Error("expected sanitized error to wrap the original")
	}
}
