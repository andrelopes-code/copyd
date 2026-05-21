package item

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

type ContentType string

const (
	TypeText      ContentType = "text"
	TypeURL       ContentType = "url"
	TypeEmail     ContentType = "email"
	TypeColor     ContentType = "color"
	TypeCode      ContentType = "code"
	TypeJSON      ContentType = "json"
	TypeYAML      ContentType = "yaml"
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

var (
	urlRegex     = regexp.MustCompile(`^[a-z][a-z0-9+.\-]*://\S+$`)
	emailRegex   = regexp.MustCompile(`^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$`)
	colorRegex   = regexp.MustCompile(`^(#[0-9a-fA-F]{3,8}|(rgb|hsl)a?\([^)]+\))$`)
	pathRegex    = regexp.MustCompile(`^(/|[A-Za-z]:[\\/]|~/|\./|\.\./)`)
	commandRegex = regexp.MustCompile(`^(sudo|cd|ls|rm|mv|cp|cat|grep|find|awk|sed|git|npm|pnpm|yarn|bun|go|cargo|rustc|docker|kubectl|helm|python|python3|pip|node|deno|curl|wget|ssh|scp|make|tar|brew|apt|dnf|pacman)\s`)
	yamlRegex    = regexp.MustCompile(`(?m)^\s*[A-Za-z_][A-Za-z0-9_\-]*:(\s|$)`)
	codeHints    = regexp.MustCompile(`(?m)(^\s*(func|fn|def|class|interface|type|public|private|export|import|package|use|impl|trait|struct|enum)\b|=>|::|;\s*$|\b(let|const|var)\s+\w+\s*=)`)
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

	if codeHints.MatchString(trimmed) {
		return TypeCode
	}

	if yamlRegex.MatchString(trimmed) && strings.Contains(trimmed, "\n") {
		return TypeYAML
	}

	if strings.Contains(content, "\n") {
		return TypeMultiline
	}

	return TypeText
}

func TextPreview(content string) string {
	line := content
	if i := strings.IndexByte(line, '\n'); i >= 0 {
		line = line[:i]
	}
	line = strings.TrimSpace(line)
	if len(line) > previewMaxLen {
		line = line[:previewMaxLen]
	}
	return line
}

func ImagePreview(width, height int) string {
	if width > 0 && height > 0 {
		return fmt.Sprintf("Image %d×%d", width, height)
	}
	return "Image"
}
