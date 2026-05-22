//go:build linux && !android

package clipboard

/*
#cgo pkg-config: gtk4
#include <stdlib.h>
#include <stdint.h>

extern int  copyd_clipboard_connect(uintptr_t handle);
extern char *copyd_clipboard_read_text(void);
extern int  copyd_clipboard_read_png(unsigned char **out, size_t *out_len);
extern int  copyd_clipboard_set_text(const char *text, size_t len);
extern int  copyd_clipboard_set_png(const unsigned char *data, size_t len);
extern void copyd_g_free(void *ptr);
*/
import "C"

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"runtime/cgo"
	"unsafe"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// gdkBackend reads and writes the system clipboard through GTK4's
// GdkClipboard, which Wails has already initialised by the time this
// backend starts. The "changed" signal drives capture (no polling), and
// reads/writes happen in-process — no `wl-paste` or `wl-copy` subprocess
// is ever launched, so the compositor sees no extra Wayland clients and
// the dock stays quiet.
type gdkBackend struct {
	app    *application.App
	notify chan struct{}
}

func newGdkBackend(app *application.App) (*gdkBackend, error) {
	if app == nil {
		return nil, errors.New("gdk backend: nil app")
	}
	return &gdkBackend{
		app:    app,
		notify: make(chan struct{}, 1),
	}, nil
}

func (*gdkBackend) name() string { return "gdk" }

// fire pokes the backend's processing goroutine. Coalesces — multiple
// closely-spaced calls collapse into one wakeup.
func (b *gdkBackend) fire() {
	select {
	case b.notify <- struct{}{}:
	default:
	}
}

func (b *gdkBackend) start(ctx context.Context, dispatch func([]byte, Format), log *slog.Logger) {
	log.Info("gdk clipboard listener starting")

	handle := cgo.NewHandle(b)
	// The signal stays connected for the lifetime of the process; we
	// only release the handle when the backend's goroutine exits.
	defer handle.Delete()

	var connectErr error
	application.InvokeSync(func() {
		if rc := int(C.copyd_clipboard_connect(C.uintptr_t(handle))); rc != 0 {
			connectErr = fmt.Errorf("gdk_clipboard_connect failed: rc=%d", rc)
		}
	})
	if connectErr != nil {
		log.Error("gdk clipboard connect", "err", connectErr)
		return
	}

	// Prime an initial read so existing clipboard contents land in the
	// store without waiting for a fresh "changed" signal.
	b.fire()

	var lastTextHash, lastImageHash string

	for {
		select {
		case <-ctx.Done():
			return
		case <-b.notify:
			if text, ok := b.readText(); ok && text != "" {
				h := hashBytes([]byte(text))
				if h != lastTextHash {
					lastTextHash = h
					dispatch([]byte(text), FormatText)
				}
			}
			if img, ok := b.readPNG(); ok && len(img) > 0 {
				h := hashBytes(img)
				if h != lastImageHash {
					lastImageHash = h
					dispatch(img, FormatImage)
				}
			}
		}
	}
}

func (b *gdkBackend) readText() (string, bool) {
	var result string
	var ok bool
	application.InvokeSync(func() {
		cText := C.copyd_clipboard_read_text()
		if cText == nil {
			return
		}
		result = C.GoString(cText)
		C.copyd_g_free(unsafe.Pointer(cText))
		ok = true
	})
	return result, ok
}

func (b *gdkBackend) readPNG() ([]byte, bool) {
	var result []byte
	var ok bool
	application.InvokeSync(func() {
		var out *C.uchar
		var size C.size_t
		rc := C.copyd_clipboard_read_png(&out, &size)
		if rc != 0 || out == nil || size == 0 {
			return
		}
		result = C.GoBytes(unsafe.Pointer(out), C.int(size))
		C.copyd_g_free(unsafe.Pointer(out))
		ok = true
	})
	return result, ok
}

func (b *gdkBackend) writeText(s string) error {
	var rc C.int
	application.InvokeSync(func() {
		cs := C.CString(s)
		defer C.free(unsafe.Pointer(cs))
		rc = C.copyd_clipboard_set_text(cs, C.size_t(len(s)))
	})
	if rc != 0 {
		return fmt.Errorf("gdk_clipboard_set_text: rc=%d", int(rc))
	}
	return nil
}

func (b *gdkBackend) writeImage(data []byte) error {
	if len(data) == 0 {
		return errors.New("gdk write image: empty payload")
	}
	var rc C.int
	application.InvokeSync(func() {
		rc = C.copyd_clipboard_set_png(
			(*C.uchar)(unsafe.Pointer(&data[0])),
			C.size_t(len(data)),
		)
	})
	if rc != 0 {
		return fmt.Errorf("gdk_clipboard_set_png: rc=%d", int(rc))
	}
	return nil
}

// goClipboardChanged is the C-side callback for GdkClipboard "changed".
// It runs on the GTK main thread, so it must return fast — we just poke
// the backend goroutine via fire(). If the handle has been deleted (the
// backend's start goroutine returned), recover swallows the panic from
// cgo.Handle.Value so the C signal cannot crash the process.
//
//export goClipboardChanged
func goClipboardChanged(handle C.uintptr_t) {
	defer func() { _ = recover() }()
	v := cgo.Handle(uintptr(handle)).Value()
	if b, ok := v.(*gdkBackend); ok {
		b.fire()
	}
}
