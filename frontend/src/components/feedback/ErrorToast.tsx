import { AlertCircle, X } from "lucide-solid";
import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type Component,
} from "solid-js";

import { cn } from "@lib/cn";

interface ErrorToastProps {
  message: string | undefined;
  onDismiss: () => void;
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 5000;
const EXIT_ANIMATION_MS = 160;

const ErrorToast: Component<ErrorToastProps> = (props) => {
  // What's actually rendered. Decoupled from props.message so the exit
  // animation can play out after the parent clears the error.
  const [shown, setShown] = createSignal<string | undefined>();
  const [exiting, setExiting] = createSignal(false);

  let dismissTimer: number | undefined;
  let exitTimer: number | undefined;

  const clearTimers = () => {
    if (dismissTimer !== undefined) {
      window.clearTimeout(dismissTimer);
      dismissTimer = undefined;
    }
    if (exitTimer !== undefined) {
      window.clearTimeout(exitTimer);
      exitTimer = undefined;
    }
  };

  createEffect(() => {
    const next = props.message;
    if (next) {
      // A new (or replacement) message — cancel any pending exit, play enter.
      if (exitTimer !== undefined) {
        window.clearTimeout(exitTimer);
        exitTimer = undefined;
      }
      setExiting(false);
      setShown(next);
      if (dismissTimer !== undefined) window.clearTimeout(dismissTimer);
      const duration = props.durationMs ?? DEFAULT_DURATION_MS;
      dismissTimer = window.setTimeout(() => props.onDismiss(), duration);
      return;
    }
    if (shown() !== undefined && !exiting()) {
      // Parent cleared the message — play exit, then unmount.
      if (dismissTimer !== undefined) {
        window.clearTimeout(dismissTimer);
        dismissTimer = undefined;
      }
      setExiting(true);
      exitTimer = window.setTimeout(() => {
        setShown(undefined);
        setExiting(false);
        exitTimer = undefined;
      }, EXIT_ANIMATION_MS);
    }
  });

  onCleanup(clearTimers);

  return (
    <Show when={shown()}>
      <div
        role="status"
        aria-live="polite"
        class={cn(
          "pointer-events-auto absolute bottom-3 left-1/2 z-20 flex max-w-[82%] items-center gap-2.5",
          "rounded-lg border border-border-strong px-3 py-2 text-xs",
          "shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md",
          exiting() ? "error-toast-exit" : "error-toast-enter",
        )}
        style={{ "background-color": "rgba(22, 22, 26, 0.88)" }}
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-danger"
          style={{ "background-color": "rgba(224, 107, 107, 0.16)" }}
        >
          <AlertCircle size={11} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span class="min-w-0 flex-1 truncate text-foreground">{shown()}</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => props.onDismiss()}
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-2 transition-colors hover:bg-white/[0.08] hover:text-foreground"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      </div>
    </Show>
  );
};

export default ErrorToast;
