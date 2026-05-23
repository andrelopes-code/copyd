//go:build linux && !android

// GdkClipboard bridge — reactive clipboard listener and reader for the
// Wayland (and X11) backends. Runs in-process inside the existing GTK
// connection that Wails has already initialised, so there is no extra
// Wayland client and no dock flicker. All non-trivial functions assume
// they are called on the GTK main thread; callers route through Wails'
// InvokeSync.

#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <gtk/gtk.h>
#include <gio/gio.h>

extern void goClipboardChanged(uintptr_t handle);

static void on_clipboard_changed(GdkClipboard *clipboard, gpointer user_data) {
    (void)clipboard;
    uintptr_t handle = (uintptr_t)user_data;
    goClipboardChanged(handle);
}

// Connect a Go-side handle to the default clipboard's "changed" signal.
// Returns 0 on success, non-zero if the display or clipboard is unavailable.
int copyd_clipboard_connect(uintptr_t handle) {
    GdkDisplay *display = gdk_display_get_default();
    if (display == NULL) return 1;
    GdkClipboard *clipboard = gdk_display_get_clipboard(display);
    if (clipboard == NULL) return 2;
    g_signal_connect(clipboard, "changed", G_CALLBACK(on_clipboard_changed),
                     (gpointer)handle);
    return 0;
}

// ---- text read (sync via async + main loop iteration) ----

static char    *text_result = NULL;
static gboolean text_done   = FALSE;

static void on_text_finish(GObject *source, GAsyncResult *result, gpointer user_data) {
    (void)user_data;
    GdkClipboard *clipboard = GDK_CLIPBOARD(source);
    GError *error = NULL;
    text_result = gdk_clipboard_read_text_finish(clipboard, result, &error);
    if (error != NULL) {
        g_error_free(error);
        text_result = NULL;
    }
    text_done = TRUE;
}

// Reads the clipboard's text content. Returns a g_malloc'd buffer the
// caller must release via copyd_g_free, or NULL on empty/error.
char *copyd_clipboard_read_text(void) {
    GdkDisplay *display = gdk_display_get_default();
    if (display == NULL) return NULL;
    GdkClipboard *clipboard = gdk_display_get_clipboard(display);
    if (clipboard == NULL) return NULL;

    text_done   = FALSE;
    text_result = NULL;
    gdk_clipboard_read_text_async(clipboard, NULL, on_text_finish, NULL);
    GMainContext *ctx = g_main_context_default();
    while (!text_done) {
        g_main_context_iteration(ctx, TRUE);
    }
    return text_result;
}

// ---- PNG read ----

static GInputStream *png_stream = NULL;
static gboolean      png_done   = FALSE;

static void on_png_finish(GObject *source, GAsyncResult *result, gpointer user_data) {
    (void)user_data;
    GdkClipboard *clipboard = GDK_CLIPBOARD(source);
    GError *error = NULL;
    png_stream = gdk_clipboard_read_finish(clipboard, result, NULL, &error);
    if (error != NULL) {
        g_error_free(error);
        png_stream = NULL;
    }
    png_done = TRUE;
}

// Reads the clipboard's image/png content. Returns a g_malloc'd buffer of
// *out_len bytes via *out (caller releases via copyd_g_free), or sets *out
// to NULL when no image is offered. Returns 0 on success (including the
// no-offer case), non-zero on hard error.
int copyd_clipboard_read_png(unsigned char **out, size_t *out_len) {
    *out     = NULL;
    *out_len = 0;

    GdkDisplay *display = gdk_display_get_default();
    if (display == NULL) return 1;
    GdkClipboard *clipboard = gdk_display_get_clipboard(display);
    if (clipboard == NULL) return 2;

    const char *mimes[] = {"image/png", NULL};
    png_done   = FALSE;
    png_stream = NULL;
    gdk_clipboard_read_async(clipboard, mimes, G_PRIORITY_DEFAULT, NULL,
                             on_png_finish, NULL);

    GMainContext *ctx = g_main_context_default();
    while (!png_done) {
        g_main_context_iteration(ctx, TRUE);
    }

    if (png_stream == NULL) return 0; // no PNG offer; not an error

    GByteArray *bytes = g_byte_array_new();
    guint8      buf[8192];
    GError     *err = NULL;
    for (;;) {
        gssize n = g_input_stream_read(png_stream, buf, sizeof(buf), NULL, &err);
        if (n <= 0) break;
        g_byte_array_append(bytes, buf, (guint)n);
    }
    g_input_stream_close(png_stream, NULL, NULL);
    g_object_unref(png_stream);
    png_stream = NULL;
    if (err != NULL) {
        g_error_free(err);
        g_byte_array_free(bytes, TRUE);
        return 3;
    }

    gsize          size = bytes->len;
    unsigned char *raw  = g_byte_array_free(bytes, FALSE);
    *out     = raw;
    *out_len = (size_t)size;
    return 0;
}

// ---- writes ----

int copyd_clipboard_set_text(const char *text, size_t len) {
    GdkDisplay *display = gdk_display_get_default();
    if (display == NULL) return 1;
    GdkClipboard *clipboard = gdk_display_get_clipboard(display);
    if (clipboard == NULL) return 2;
    GBytes             *bytes    = g_bytes_new(text, len);
    GdkContentProvider *provider = gdk_content_provider_new_for_bytes(
        "text/plain;charset=utf-8", bytes);
    g_bytes_unref(bytes);
    gboolean ok = gdk_clipboard_set_content(clipboard, provider);
    g_object_unref(provider);
    return ok ? 0 : 3;
}

int copyd_clipboard_set_png(const unsigned char *data, size_t len) {
    // Publishing an image via a generic image/png bytes provider used to
    // freeze the app: after gdk_clipboard_set_content fires the "changed"
    // signal our monitor goroutine runs gdk_clipboard_read_async for
    // image/png against the bytes-stream provider, which deadlocks on
    // Wayland. Building a GdkTexture and using the dedicated
    // gdk_clipboard_set_texture API sidesteps the stream dance entirely
    // — the texture advertises every format GDK can serialize it into,
    // and the readback path is the well-tested texture serializer.
    GdkDisplay *display = gdk_display_get_default();
    if (display == NULL) return 1;
    GdkClipboard *clipboard = gdk_display_get_clipboard(display);
    if (clipboard == NULL) return 2;

    GBytes *bytes = g_bytes_new(data, len);
    GError *error = NULL;
    GdkTexture *texture = gdk_texture_new_from_bytes(bytes, &error);
    g_bytes_unref(bytes);
    if (error != NULL) {
        g_error_free(error);
        return 3;
    }
    if (texture == NULL) return 4;

    gdk_clipboard_set_texture(clipboard, texture);
    g_object_unref(texture);
    return 0;
}

// ---- memory release ----

void copyd_g_free(void *ptr) {
    if (ptr != NULL) g_free(ptr);
}
