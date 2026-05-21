import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { Events, Window } from "@wailsio/runtime";

import { ClipboardService } from "@bindings/copyd/internal/service";
import type { ClipboardItem } from "@app-types/item";

const CLIPBOARD_CHANGED = "clipboard:changed";
// Time the "copied" state stays applied before the window hides in prod. Long
// enough for the spotlight to cross the row and the border glow to peak.
const COPY_ANIMATION_MS = 620;
// In dev there is no IPC trigger to re-show the window, so the "copied" state
// lingers long enough to see intro + a clear hold + outro back to baseline.
const COPY_DEV_LINGER_MS = 1500;
// Small tail after Window.Hide() so the copy state resets before the next show.
const COPY_HIDE_TAIL_MS = 80;

export function createClipboardStore() {
  const [query, setQuery] = createSignal("");
  const [items, setItems] = createSignal<ClipboardItem[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [copiedId, setCopiedId] = createSignal<string | undefined>();
  const [isCopying, setIsCopying] = createSignal(false);
  const [loadError, setLoadError] = createSignal<string | undefined>();
  const [actionError, setActionError] = createSignal<string | undefined>();

  const currentItem = createMemo<ClipboardItem | undefined>(
    () => items()[selectedIndex()],
  );

  const refresh = async () => {
    try {
      const result = await ClipboardService.List(query());
      setItems(result as unknown as ClipboardItem[]);
      setLoadError(undefined);
    } catch (err) {
      console.error("ClipboardService.List failed", err);
      setLoadError(
        messageFromError(err) ?? "Couldn't load clipboard history.",
      );
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
  const clearCopyTimer = () => {
    if (copyTimer !== undefined) {
      window.clearTimeout(copyTimer);
      copyTimer = undefined;
    }
  };
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
      setActionError(
        messageFromError(err) ?? "Couldn't copy to clipboard.",
      );
      return;
    }

    setActionError(undefined);
    setCopiedId(id);
    clearCopyTimer();

    if (import.meta.env.DEV) {
      copyTimer = window.setTimeout(finishCopy, COPY_DEV_LINGER_MS);
      return;
    }

    copyTimer = window.setTimeout(() => {
      void Window.Hide();
      copyTimer = window.setTimeout(finishCopy, COPY_HIDE_TAIL_MS);
    }, COPY_ANIMATION_MS);
  };

  onCleanup(clearCopyTimer);

  const moveSelection = (delta: number) => {
    const max = items().length - 1;
    if (max < 0) return;
    setSelectedIndex((i) => Math.min(Math.max(i + delta, 0), max));
  };

  return {
    query,
    setQuery,
    items,
    selectedIndex,
    setSelectedIndex,
    moveSelection,
    currentItem,
    copiedId,
    isCopying,
    copyItem,
    loadError,
    actionError,
    retry: refresh,
    dismissActionError: () => setActionError(undefined),
  };
}

export type ClipboardStore = ReturnType<typeof createClipboardStore>;

function messageFromError(err: unknown): string | undefined {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.length > 0) return err;
  return undefined;
}
