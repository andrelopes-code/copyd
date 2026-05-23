import { Show, createSignal, onCleanup, type Component } from "solid-js";

import ErrorState from "@components/feedback/ErrorState";
import ErrorToast from "@components/feedback/ErrorToast";
import EmptyState from "@components/list/EmptyState";
import ItemList from "@components/list/ItemList";
import QuickLook from "@components/preview/QuickLook";
import TitleBar from "@components/window/TitleBar";
import { createClipboardStore } from "@stores/clipboardStore";

const App: Component = () => {
  const store = createClipboardStore();
  const [peekOpen, setPeekOpen] = createSignal(false);

  // Copy is the user's final intent: close any open peek so the window
  // returns to a clean state, then hand off to the store (which hides the
  // window in production).
  const copy = (id: string) => {
    setPeekOpen(false);
    void store.copyItem(id);
  };

  const activateSelected = () => {
    const current = store.currentItem();
    if (current) copy(current.id);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Escape is tiered: close peek -> clear query -> let Wails hide.
    if (event.key === "Escape") {
      if (peekOpen()) {
        event.preventDefault();
        setPeekOpen(false);
        return;
      }
      if (store.query()) {
        event.preventDefault();
        store.setQuery("");
      }
      return;
    }

    const list = store.items();
    if (!list.length) return;

    // Quick Look toggle. Right arrow opens or closes the peek for the
    // currently selected item. Arrow-up/down keeps working while open so
    // the user can scrub through items with the peek as a live viewer.
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (store.currentItem()) setPeekOpen((v) => !v);
      return;
    }
    if (event.key === "ArrowLeft" && peekOpen()) {
      event.preventDefault();
      setPeekOpen(false);
      return;
    }

    const isDown =
      event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey);
    const isUp =
      event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey);

    if (isDown) {
      event.preventDefault();
      store.moveSelection(1);
      return;
    }

    if (isUp) {
      event.preventDefault();
      store.moveSelection(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      activateSelected();
      return;
    }

    // Space activates only when the search is empty, so typing is not
    // interrupted mid-query.
    if (event.key === " " && !store.query()) {
      event.preventDefault();
      activateSelected();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  onCleanup(() => window.removeEventListener("keydown", handleKeyDown));

  return (
    <div class="app-shell flex h-full w-full flex-col">
      <TitleBar value={store.query()} onInput={store.setQuery} />
      <main class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <Show
          when={!store.loadError()}
          fallback={
            <ErrorState
              title="Couldn't reach the clipboard service"
              description={store.loadError()!}
              onRetry={() => void store.retry()}
            />
          }
        >
          <Show
            when={store.items().length > 0}
            fallback={
              <EmptyState
                variant={store.query() ? "no-match" : "initial"}
                query={store.query()}
                title={
                  store.query() ? "No matching items" : "No items captured yet"
                }
                description={
                  store.query()
                    ? "Try a different search term."
                    : "Items copied to the clipboard will appear here."
                }
              />
            }
          >
            <ItemList
              items={store.items()}
              selectedIndex={store.selectedIndex()}
              copiedId={store.copiedId()}
              onActivate={copy}
              showSections={!store.query()}
            />
          </Show>

          <Show when={peekOpen() && store.currentItem()}>
            <QuickLook
              item={store.currentItem()!}
              onClose={() => setPeekOpen(false)}
            />
          </Show>
        </Show>

        <ErrorToast
          message={store.actionError()}
          onDismiss={store.dismissActionError}
        />
      </main>
    </div>
  );
};

export default App;
