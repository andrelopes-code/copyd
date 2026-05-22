package clipboard

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type Format int

const (
	FormatText Format = iota
	FormatImage
)

type Capture struct {
	Format Format
	Text   string
	Image  []byte
	Hash   string
}

// backend abstracts the platform-specific clipboard plumbing.
type backend interface {
	start(ctx context.Context, dispatch func([]byte, Format), log *slog.Logger)
	writeText(s string) error
	writeImage(data []byte) error
	name() string
}

type Monitor struct {
	mu       sync.Mutex
	lastHash string
	skipNext map[string]struct{}

	backend backend
	logger  *slog.Logger
	app     *application.App
}

// NewMonitor builds the Monitor with no backend yet. The backend is chosen
// lazily, either by SetApp (preferred — uses GDK in-process clipboard) or
// on the first call to Start (falls back to the X11 libxcb backend).
func NewMonitor() (*Monitor, error) {
	return &Monitor{
		skipNext: make(map[string]struct{}),
		logger:   slog.Default(),
	}, nil
}

// SetApp wires the Wails application instance so the Monitor can use the
// GdkClipboard backend (in-process, reactive, no subprocess flicker).
// Must be called before Start. Returns an error if backend creation fails.
func (m *Monitor) SetApp(app *application.App) error {
	m.app = app
	b, err := newGdkBackend(app)
	if err != nil {
		return err
	}
	m.backend = b
	return nil
}

// SetLogger swaps the default logger for one owned by the caller.
func (m *Monitor) SetLogger(l *slog.Logger) {
	if l == nil {
		return
	}
	m.logger = l
}

// Backend returns the active backend identifier for startup diagnostics.
func (m *Monitor) Backend() string {
	if m.backend == nil {
		return "pending"
	}
	return m.backend.name()
}

// Start blocks until ctx is cancelled. For each new clipboard payload it
// calls onChange. Repeated or self-written payloads (registered via
// IgnoreNext) are silently dropped.
func (m *Monitor) Start(ctx context.Context, onChange func(Capture)) {
	if m.backend == nil {
		b, err := newX11Backend()
		if err != nil {
			m.logger.Error("no clipboard backend available", "err", err)
			return
		}
		m.backend = b
		m.logger.Info("clipboard backend selected (fallback)", "backend", m.backend.name())
	}
	m.backend.start(ctx, func(data []byte, f Format) {
		m.dispatch(data, f, onChange)
	}, m.logger)
}

func (m *Monitor) dispatch(data []byte, format Format, onChange func(Capture)) {
	if len(data) == 0 {
		return
	}
	hash := hashBytes(data)
	if m.consume(hash) {
		return
	}
	c := Capture{Format: format, Hash: hash}
	if format == FormatText {
		c.Text = string(data)
	} else {
		c.Image = data
	}
	onChange(c)
}

// consume returns true when the payload should be dropped (either it's a
// self-write previously announced via IgnoreNext, or identical to the
// most recent capture).
func (m *Monitor) consume(hash string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, skip := m.skipNext[hash]; skip {
		delete(m.skipNext, hash)
		m.lastHash = hash
		return true
	}
	if hash == m.lastHash {
		return true
	}
	m.lastHash = hash
	return false
}

func (m *Monitor) IgnoreNext(hash string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.skipNext[hash] = struct{}{}
}

func (m *Monitor) WriteText(s string) string {
	data := []byte(s)
	hash := hashBytes(data)
	// Pre-register before the write closes the race window: the
	// backend may publish the new selection before this function
	// returns, and any listener can observe it at any moment.
	m.IgnoreNext(hash)
	if err := m.backend.writeText(s); err != nil {
		m.logger.Error("clipboard write text", "err", err, "backend", m.backend.name())
	}
	return hash
}

func (m *Monitor) WriteImage(data []byte) string {
	hash := hashBytes(data)
	m.IgnoreNext(hash)
	if err := m.backend.writeImage(data); err != nil {
		m.logger.Error("clipboard write image", "err", err, "backend", m.backend.name())
	}
	return hash
}

func Hash(data []byte) string {
	return hashBytes(data)
}

func hashBytes(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
