package clipboard

import (
	"context"
	"log/slog"

	xclip "golang.design/x/clipboard"
)

// x11Backend wraps golang.design/x/clipboard. It polls the X11 selection
// every second via libxcb; it is the right choice on pure-X11 sessions
// but it cannot observe native Wayland clipboard owners.
type x11Backend struct{}

func newX11Backend() (*x11Backend, error) {
	if err := xclip.Init(); err != nil {
		return nil, err
	}
	return &x11Backend{}, nil
}

func (*x11Backend) name() string { return "x11" }

func (*x11Backend) start(ctx context.Context, dispatch func([]byte, Format), _ *slog.Logger) {
	textCh := xclip.Watch(ctx, xclip.FmtText)
	imageCh := xclip.Watch(ctx, xclip.FmtImage)
	for {
		select {
		case <-ctx.Done():
			return
		case data, ok := <-textCh:
			if !ok {
				return
			}
			dispatch(data, FormatText)
		case data, ok := <-imageCh:
			if !ok {
				return
			}
			dispatch(data, FormatImage)
		}
	}
}

func (*x11Backend) writeText(s string) error {
	xclip.Write(xclip.FmtText, []byte(s))
	return nil
}

func (*x11Backend) writeImage(data []byte) error {
	xclip.Write(xclip.FmtImage, data)
	return nil
}
