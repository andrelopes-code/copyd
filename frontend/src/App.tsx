import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";

import { Events, Window } from "@wailsio/runtime";

import { ClipboardService } from "@bindings/cromenockle/internal/service";
import EmptyState from "@components/list/EmptyState";
import ItemList from "@components/list/ItemList";
import QuickLook from "@components/preview/QuickLook";
import TitleBar from "@components/window/TitleBar";
import type { ClipboardItem } from "@app-types/item";

const CLIPBOARD_CHANGED = "clipboard:changed";
// Time the "copied" state stays applied before window hides in prod. Long
// enough for the spotlight to cross the row and the border glow to peak.
const COPY_ANIMATION_MS = 620;
// In dev there is no IPC trigger to re-show the window, so we keep the
// "copied" state applied long enough to see the full intro + a clear hold +
// the outro transitions back to baseline.
const COPY_DEV_LINGER_MS = 1500;

const App: Component = () => {
  const [query, setQuery] = createSignal("");
  const [items, setItems] = createSignal<ClipboardItem[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [copiedId, setCopiedId] = createSignal<string | undefined>();
  const [isCopying, setIsCopying] = createSignal(false);
  const [peekOpen, setPeekOpen] = createSignal(false);

  const currentItem = createMemo<ClipboardItem | undefined>(() => items()[selectedIndex()]);

  const refresh = async () => {
    try {
      const result = await ClipboardService.List(query());
      setItems(result as unknown as ClipboardItem[]);
    } catch (err) {
      console.error("ClipboardService.List failed", err);
    }
  };

  createEffect(() => {
    query();
    void refresh();
  });

  createEffect(() => {
    items();
    setSelectedIndex(0);
  });

  let unsubscribe: (() => void) | undefined;
  onMount(() => {
    unsubscribe = Events.On(CLIPBOARD_CHANGED, () => {
      void refresh();
    });
  });
  onCleanup(() => unsubscribe?.());

  let copyTimer: number | undefined;

  const finishCopy = () => {
    setCopiedId(undefined);
    setIsCopying(false);
  };

  const copyItem = async (id: string) => {
    if (isCopying()) return;
    setIsCopying(true);

    try {
      await ClipboardService.Copy(id);
    } catch (err) {
      console.error("ClipboardService.Copy failed", err);
      setIsCopying(false);
      return;
    }

    setPeekOpen(false);
    setCopiedId(id);
    if (copyTimer !== undefined) window.clearTimeout(copyTimer);

    if (import.meta.env.DEV) {
      copyTimer = window.setTimeout(finishCopy, COPY_DEV_LINGER_MS);
      return;
    }

    copyTimer = window.setTimeout(() => {
      void Window.Hide();
      window.setTimeout(finishCopy, 80);
    }, COPY_ANIMATION_MS);
  };

  const activateSelected = () => {
    const current = currentItem();
    if (current) void copyItem(current.id);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Escape is tiered: close peek -> clear query -> let Wails hide.
    if (event.key === "Escape") {
      if (peekOpen()) {
        event.preventDefault();
        setPeekOpen(false);
        return;
      }
      if (query()) {
        event.preventDefault();
        setQuery("");
      }
      return;
    }

    const list = items();
    if (!list.length) return;

    // Quick Look toggle. Right arrow opens or closes the peek for the
    // currently selected item. Arrow-up/down keeps working while open so
    // the user can scrub through items with the peek as a live viewer.
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (currentItem()) setPeekOpen((v) => !v);
      return;
    }
    if (event.key === "ArrowLeft" && peekOpen()) {
      event.preventDefault();
      setPeekOpen(false);
      return;
    }

    const isDown = event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey);
    const isUp = event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey);

    if (isDown) {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, list.length - 1));
      return;
    }

    if (isUp) {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      activateSelected();
      return;
    }

    // Space activates only when the search is empty, so typing is not
    // interrupted mid-query.
    if (event.key === " " && !query()) {
      event.preventDefault();
      activateSelected();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
    if (copyTimer !== undefined) window.clearTimeout(copyTimer);
  });

  return (
    <div class="flex h-full w-full flex-col bg-background">
      <TitleBar value={query()} onInput={setQuery} />
      <main class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <Show
          when={items().length > 0}
          fallback={
            <EmptyState
              title={query() ? "No matching items" : "No items captured yet"}
              description={
                query()
                  ? "Try a different search term."
                  : "Items copied to the clipboard will appear here."
              }
            />
          }
        >
          <ItemList
            items={items()}
            selectedIndex={selectedIndex()}
            copiedId={copiedId()}
            onActivate={(id) => void copyItem(id)}
            showSections={!query()}
          />
        </Show>

        <Show when={peekOpen() && currentItem()}>
          <QuickLook
            item={currentItem()!}
            onClose={() => setPeekOpen(false)}
          />
        </Show>
      </main>
    </div>
  );
};

export default App;
