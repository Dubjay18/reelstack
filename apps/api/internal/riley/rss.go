package riley

import (
	"context"
	"log/slog"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/mmcdole/gofeed"
)

// Free movie-news RSS feeds Riley reads from.
var newsFeeds = []struct {
	Name string
	URL  string
}{
	{"Variety", "https://variety.com/feed/"},
	{"Deadline", "https://deadline.com/feed/"},
	{"The Hollywood Reporter", "https://www.hollywoodreporter.com/feed/"},
	{"/Film", "https://www.slashfilm.com/feed/"},
	{"IndieWire", "https://www.indiewire.com/feed/"},
}

const (
	maxFeedItems   = 30
	maxItemAge     = 48 * time.Hour
	feedTimeout    = 10 * time.Second
	maxSummaryLen  = 300
	feedUserAgent  = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

type FeedItem struct {
	Title     string
	Summary   string
	Link      string
	Source    string
	Published time.Time
}

// FetchAllFeeds pulls all news feeds concurrently, tolerating individual
// failures, and returns fresh, deduped items sorted newest-first (capped).
func FetchAllFeeds(ctx context.Context) []FeedItem {
	var (
		mu    sync.Mutex
		items []FeedItem
		wg    sync.WaitGroup
	)

	for _, feed := range newsFeeds {
		wg.Add(1)
		go func(name, url string) {
			defer wg.Done()
			fetched, err := fetchFeed(ctx, name, url)
			if err != nil {
				slog.Warn("riley: feed fetch failed", "feed", name, "error", err)
				return
			}
			mu.Lock()
			items = append(items, fetched...)
			mu.Unlock()
		}(feed.Name, feed.URL)
	}
	wg.Wait()

	items = dedupeItems(items)
	sort.Slice(items, func(i, j int) bool { return items[i].Published.After(items[j].Published) })
	if len(items) > maxFeedItems {
		items = items[:maxFeedItems]
	}
	return items
}

func fetchFeed(ctx context.Context, name, url string) ([]FeedItem, error) {
	fctx, cancel := context.WithTimeout(ctx, feedTimeout)
	defer cancel()

	parser := gofeed.NewParser()
	parser.UserAgent = feedUserAgent
	feed, err := parser.ParseURLWithContext(url, fctx)
	if err != nil {
		return nil, err
	}

	cutoff := time.Now().Add(-maxItemAge)
	var items []FeedItem
	for _, entry := range feed.Items {
		published := time.Now()
		if entry.PublishedParsed != nil {
			published = *entry.PublishedParsed
		} else if entry.UpdatedParsed != nil {
			published = *entry.UpdatedParsed
		}
		if published.Before(cutoff) {
			continue
		}
		items = append(items, FeedItem{
			Title:     strings.TrimSpace(entry.Title),
			Summary:   truncate(stripHTML(entry.Description), maxSummaryLen),
			Link:      entry.Link,
			Source:    name,
			Published: published,
		})
	}
	return items, nil
}

var (
	htmlTagRe    = regexp.MustCompile(`<[^>]*>`)
	nonAlphanumRe = regexp.MustCompile(`[^a-z0-9 ]+`)
	spaceRe      = regexp.MustCompile(`\s+`)
)

func stripHTML(s string) string {
	return strings.TrimSpace(spaceRe.ReplaceAllString(htmlTagRe.ReplaceAllString(s, " "), " "))
}

// normalizeTitle lowercases and strips punctuation so near-identical
// headlines from different outlets collapse to the same key.
func normalizeTitle(title string) string {
	t := strings.ToLower(title)
	t = nonAlphanumRe.ReplaceAllString(t, "")
	return spaceRe.ReplaceAllString(strings.TrimSpace(t), " ")
}

func dedupeItems(items []FeedItem) []FeedItem {
	seen := make(map[string]bool, len(items))
	var out []FeedItem
	for _, item := range items {
		key := normalizeTitle(item.Title)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, item)
	}
	return out
}
