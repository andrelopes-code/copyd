package clipboard

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"sync"

	"golang.design/x/clipboard"
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

type Monitor struct {
	mu       sync.Mutex
	lastHash string
	skipNext map[string]struct{}
}

func NewMonitor() (*Monitor, error) {
	if err := clipboard.Init(); err != nil {
		return nil, err
	}
	return &Monitor{skipNext: make(map[string]struct{})}, nil
}

// Start blocks until ctx is cancelled. For each new clipboard payload it
// calls onChange. Repeated or self-written payloads (registered via
// IgnoreNext) are silently dropped.
func (m *Monitor) Start(ctx context.Context, onChange func(Capture)) {
	textCh := clipboard.Watch(ctx, clipboard.FmtText)
	imageCh := clipboard.Watch(ctx, clipboard.FmtImage)

	for {
		select {
		case <-ctx.Done():
			return

		case data, ok := <-textCh:
			if !ok {
				return
			}
			m.dispatch(data, FormatText, onChange)

		case data, ok := <-imageCh:
			if !ok {
				return
			}
			m.dispatch(data, FormatImage, onChange)
		}
	}
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
	clipboard.Write(clipboard.FmtText, data)
	return hashBytes(data)
}

func (m *Monitor) WriteImage(data []byte) string {
	clipboard.Write(clipboard.FmtImage, data)
	return hashBytes(data)
}

func Hash(data []byte) string {
	return hashBytes(data)
}

func hashBytes(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
