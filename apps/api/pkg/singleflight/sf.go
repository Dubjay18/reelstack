// Package singleflight wraps golang.org/x/sync/singleflight to prevent
// cache stampedes on the TMDB and streaming availability endpoints.
//
// When N concurrent requests all miss Redis cache for the same key,
// only ONE upstream API call is made. The rest wait and share the result.
// This is critical for the movie search hot path.
package singleflight

import "golang.org/x/sync/singleflight"

type Group struct {
	g singleflight.Group
}

// Do executes fn only once per key across concurrent callers.
// All callers blocking on the same key receive the same result.
func (g *Group) Do(key string, fn func() (interface{}, error)) (interface{}, error, bool) {
	return g.g.Do(key, fn)
}
