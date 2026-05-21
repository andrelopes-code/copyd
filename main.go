package main

import (
	"embed"
	"flag"
	"log"
	"os"
	"path/filepath"

	"github.com/adrg/xdg"
	"github.com/wailsapp/wails/v3/pkg/application"

	"cromenockle/internal/clipboard"
	"cromenockle/internal/service"
	"cromenockle/internal/store"
)

//go:embed all:frontend/dist
var assets embed.FS

const (
	appName      = "cromenockle"
	appUniqueID  = "io.cromenockle.app"
	windowWidth  = 720
	windowHeight = 480
)

func main() {
	var startHidden bool
	flag.BoolVar(&startHidden, "hidden", false, "start without showing the window (use for autostart on login)")
	flag.Parse()

	dbPath, err := xdg.DataFile(filepath.Join(appName, "items.db"))
	if err != nil {
		log.Fatalf("resolve data path: %v", err)
	}
	imageDir := filepath.Join(filepath.Dir(dbPath), "images")
	if err := os.MkdirAll(imageDir, 0o755); err != nil {
		log.Fatalf("create image dir: %v", err)
	}

	st, err := store.Open(dbPath)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}

	monitor, err := clipboard.NewMonitor()
	if err != nil {
		log.Fatalf("init clipboard: %v", err)
	}

	svc := service.New(st, monitor, imageDir)

	var window *application.WebviewWindow

	app := application.New(application.Options{
		Name:        appName,
		Description: "Wayland clipboard manager",
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Services: []application.Service{
			application.NewService(svc),
		},
		// Re-launching the binary while one instance is already running
		// is how the global hotkey reaches us: Wayland will not deliver
		// keystrokes to background apps, so the desktop environment binds
		// the shortcut to `cromenockle` and the running instance toggles
		// the window in/out of view here.
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: appUniqueID,
			OnSecondInstanceLaunch: func(_ application.SecondInstanceData) {
				if window == nil {
					return
				}
				if window.IsVisible() {
					window.Hide()
					return
				}
				window.Show()
				window.Focus()
			},
		},
	})

	window = app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            appName,
		Width:            windowWidth,
		Height:           windowHeight,
		MinWidth:         windowWidth,
		MinHeight:        windowHeight,
		MaxWidth:         windowWidth,
		MaxHeight:        windowHeight,
		DisableResize:    true,
		Frameless:        true,
		AlwaysOnTop:      true,
		Hidden:           startHidden,
		InitialPosition:  application.WindowCentered,
		BackgroundType:   application.BackgroundTypeTranslucent,
		BackgroundColour: application.NewRGBA(15, 15, 17, 200),
		HideOnEscape:     true,
		HideOnFocusLost:  true,
		URL:              "/",
		Windows: application.WindowsWindow{
			BackdropType: application.Acrylic,
		},
		Linux: application.LinuxWindow{
			WindowIsTranslucent: true,
		},
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
