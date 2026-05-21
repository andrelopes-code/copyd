package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	_ "image/png"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"

	"copyd/internal/clipboard"
	"copyd/internal/item"
	"copyd/internal/store"
)

const (
	EventClipboardChanged = "clipboard:changed"
	defaultListLimit      = 500
)

type ClipboardService struct {
	store    *store.Store
	monitor  *clipboard.Monitor
	imageDir string

	app    *application.App
	logger *slog.Logger
}

func New(st *store.Store, m *clipboard.Monitor, imageDir string) *ClipboardService {
	return &ClipboardService{
		store:    st,
		monitor:  m,
		imageDir: imageDir,
	}
}

// ServiceStartup is called by Wails after the application is constructed.
// We capture the app handle (for event emission) and start the clipboard
// monitor on a goroutine bound to the service context.
func (s *ClipboardService) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	s.app = application.Get()
	s.logger = s.app.Logger.With("service", "clipboard")

	go s.monitor.Start(ctx, s.onCapture)
	return nil
}

func (s *ClipboardService) ServiceShutdown() error {
	return s.store.Close()
}

func (s *ClipboardService) ServiceName() string {
	return "ClipboardService"
}

// ----- Clipboard monitor handler -----

func (s *ClipboardService) onCapture(cap clipboard.Capture) {
	ctx := context.Background()
	now := time.Now().UnixMilli()

	exists, err := s.store.FindByID(ctx, cap.Hash)
	if err != nil {
		s.logger.Error("lookup item", "err", err)
		return
	}
	if exists {
		if err := s.store.Touch(ctx, cap.Hash, now); err != nil {
			s.logger.Error("touch item", "err", err)
			return
		}
		s.emitChanged()
		return
	}

	var (
		it        item.Item
		imagePath string
	)
	switch cap.Format {
	case clipboard.FormatText:
		it = s.buildTextItem(cap, now)
	case clipboard.FormatImage:
		var err error
		it, imagePath, err = s.buildImageItem(cap, now)
		if err != nil {
			s.logger.Error("persist image", "err", err)
			return
		}
	}

	if err := s.store.Insert(ctx, it, imagePath); err != nil {
		s.logger.Error("insert item", "err", err)
		return
	}
	s.emitChanged()
}

func (s *ClipboardService) buildTextItem(cap clipboard.Capture, ts int64) item.Item {
	ct := item.DetectType(cap.Text)
	return item.Item{
		ID:          cap.Hash,
		Content:     cap.Text,
		ContentType: ct,
		Preview:     item.TextPreview(cap.Text),
		CreatedAt:   ts,
		LastUsedAt:  ts,
		UseCount:    1,
		Size:        len(cap.Text),
	}
}

func (s *ClipboardService) buildImageItem(cap clipboard.Capture, ts int64) (item.Item, string, error) {
	width, height := decodeImageBounds(cap.Image)

	path := filepath.Join(s.imageDir, cap.Hash+".png")
	if err := os.WriteFile(path, cap.Image, 0o600); err != nil {
		return item.Item{}, "", err
	}

	return item.Item{
		ID:          cap.Hash,
		Content:     "",
		ContentType: item.TypeImage,
		Preview:     item.ImagePreview(width, height),
		CreatedAt:   ts,
		LastUsedAt:  ts,
		UseCount:    1,
		Size:        len(cap.Image),
		Width:       width,
		Height:      height,
	}, path, nil
}

func decodeImageBounds(data []byte) (int, int) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return 0, 0
	}
	return cfg.Width, cfg.Height
}

func (s *ClipboardService) emitChanged() {
	if s.app != nil {
		s.app.Event.Emit(EventClipboardChanged)
	}
}

// ----- Frontend-callable API -----

func (s *ClipboardService) List(query string) ([]item.Item, error) {
	items, err := s.store.List(context.Background(), query, defaultListLimit)
	if err != nil {
		return nil, err
	}
	for i := range items {
		// Heal legacy rows captured before detection was tightened and
		// before TextPreview learned to skip leading blank lines.
		switch string(items[i].ContentType) {
		case "yaml", "code":
			items[i].ContentType = item.TypeMultiline
		}
		if items[i].Preview == "" && items[i].Content != "" {
			items[i].Preview = item.TextPreview(items[i].Content)
		}
	}
	return items, nil
}

func (s *ClipboardService) Pin(id string) error {
	if err := s.store.Pin(context.Background(), id, true); err != nil {
		return err
	}
	s.emitChanged()
	return nil
}

func (s *ClipboardService) Unpin(id string) error {
	if err := s.store.Pin(context.Background(), id, false); err != nil {
		return err
	}
	s.emitChanged()
	return nil
}

func (s *ClipboardService) Delete(id string) error {
	imagePath, err := s.store.Delete(context.Background(), id)
	if err != nil {
		return err
	}
	if imagePath != "" {
		_ = os.Remove(imagePath)
	}
	s.emitChanged()
	return nil
}

func (s *ClipboardService) Clear() error {
	paths, err := s.store.ClearUnpinned(context.Background())
	if err != nil {
		return err
	}
	for _, p := range paths {
		_ = os.Remove(p)
	}
	s.emitChanged()
	return nil
}

func (s *ClipboardService) Copy(id string) error {
	ctx := context.Background()
	it, imagePath, err := s.store.Get(ctx, id)
	if err != nil {
		return err
	}

	var writtenHash string
	switch it.ContentType {
	case item.TypeImage:
		if imagePath == "" {
			return errors.New("image file missing for item")
		}
		data, err := os.ReadFile(imagePath)
		if err != nil {
			return fmt.Errorf("read image: %w", err)
		}
		writtenHash = s.monitor.WriteImage(data)
	default:
		writtenHash = s.monitor.WriteText(it.Content)
	}

	s.monitor.IgnoreNext(writtenHash)
	if err := s.store.Touch(ctx, id, time.Now().UnixMilli()); err != nil {
		return err
	}
	s.emitChanged()
	return nil
}

// GetImage returns a base64-encoded PNG suitable for embedding in a data URL.
func (s *ClipboardService) GetImage(id string) (string, error) {
	_, imagePath, err := s.store.Get(context.Background(), id)
	if err != nil {
		return "", err
	}
	if imagePath == "" {
		return "", errors.New("item is not an image")
	}
	data, err := os.ReadFile(imagePath)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(data), nil
}
