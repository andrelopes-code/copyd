package item

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

type ContentType string

const (
	TypeText      ContentType = "text"
	TypeURL       ContentType = "url"
	TypeEmail     ContentType = "email"
	TypeColor     ContentType = "color"
	TypeJSON      ContentType = "json"
	TypePath      ContentType = "path"
	TypeCommand   ContentType = "command"
	TypeImage     ContentType = "image"
	TypeMultiline ContentType = "multiline"
)

type Item struct {
	ID          string      `json:"id"`
	Content     string      `json:"content"`
	ContentType ContentType `json:"contentType"`
	Preview     string      `json:"preview"`
	Pinned      bool        `json:"pinned"`
	CreatedAt   int64       `json:"createdAt"`
	LastUsedAt  int64       `json:"lastUsedAt"`
	UseCount    int         `json:"useCount"`
	Size        int         `json:"size"`
	SourceApp   string      `json:"sourceApp,omitempty"`
	Width       int         `json:"width,omitempty"`
	Height      int         `json:"height,omitempty"`
}

const previewMaxLen = 200

// Detection is intentionally conservative: only types we can verify with
// near-100% confidence get their own classification. Markdown, YAML and
// generic code get bucketed into multiline/text — better than misleading
// the user with a wrong icon.
var (
	urlRegex     = regexp.MustCompile(`^[a-z][a-z0-9+.\-]*://\S+$`)
	emailRegex   = regexp.MustCompile(`^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$`)
	colorRegex   = regexp.MustCompile(`^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\([^)]+\))$`)
	pathRegex    = regexp.MustCompile(`^(/|[A-Za-z]:[\\/]|~/|\./|\.\./)[\w\-./~ ]+$`)
	commandRegex = regexp.MustCompile(`^(sudo|cd|ls|rm|mv|cp|cat|grep|find|awk|sed|git|npm|pnpm|yarn|bun|go|cargo|rustc|docker|kubectl|helm|python|python3|pip|node|deno|curl|wget|ssh|scp|make|tar|brew|apt|dnf|pacman)\s`)
)

func DetectType(content string) ContentType {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return TypeText
	}

	if !strings.Contains(trimmed, "\n") {
		switch {
		case urlRegex.MatchString(trimmed):
			return TypeURL
		case emailRegex.MatchString(trimmed):
			return TypeEmail
		case colorRegex.MatchString(trimmed):
			return TypeColor
		case commandRegex.MatchString(trimmed):
			return TypeCommand
		case pathRegex.MatchString(trimmed):
			return TypePath
		}
	}

	if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
		var v any
		if err := json.Unmarshal([]byte(trimmed), &v); err == nil {
			return TypeJSON
		}
	}

	if strings.Contains(content, "\n") {
		return TypeMultiline
	}
	return TypeText
}

// TextPreview returns the first non-blank line of content, rune-safely
// truncated. Items copied with leading blank lines used to render with an
// empty preview because the first line itself was "".
func TextPreview(content string) string {
	var line string
	for l := range strings.SplitSeq(content, "\n") {
		if t := strings.TrimSpace(l); t != "" {
			line = t
			break
		}
	}
	if line == "" {
		return ""
	}
	if utf8.RuneCountInString(line) <= previewMaxLen {
		return line
	}
	runes := []rune(line)
	return string(runes[:previewMaxLen]) + "…"
}

func ImagePreview(width, height int) string {
	if width > 0 && height > 0 {
		return fmt.Sprintf("Image %d×%d", width, height)
	}
	return "Image"
}
