import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";

import { Events, Window } from "@wailsio/runtime";

import { ClipboardService } from "../bindings/cromenockle/internal/service";
import EmptyState from "./components/list/EmptyState";
import ItemList from "./components/list/ItemList";
import TitleBar from "./components/window/TitleBar";
import type { ClipboardItem } from "./types/item";

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
  const copyItem = async (id: string) => {
    try {
      await ClipboardService.Copy(id);
    } catch (err) {
      console.error("ClipboardService.Copy failed", err);
      return;
    }

    setCopiedId(id);
    if (copyTimer !== undefined) window.clearTimeout(copyTimer);

    if (import.meta.env.DEV) {
      // In dev there is no IPC trigger yet to re-show the window, so keep
      // it open. The "Copied" feedback lingers long enough to be obvious.
      copyTimer = window.setTimeout(() => setCopiedId(undefined), COPY_DEV_LINGER_MS);
      return;
    }

    copyTimer = window.setTimeout(() => {
      void Window.Hide();
      window.setTimeout(() => setCopiedId(undefined), 80);
    }, COPY_ANIMATION_MS);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const list = items();
    if (!list.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, list.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const current = list[selectedIndex()];
      if (current) void copyItem(current.id);
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
      <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
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
            onSelect={setSelectedIndex}
            onActivate={(id) => void copyItem(id)}
            showSections={!query()}
          />
        </Show>
      </main>
    </div>
  );
};

export default App;
