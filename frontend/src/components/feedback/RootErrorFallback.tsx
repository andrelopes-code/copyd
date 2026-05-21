import { AlertOctagon, RefreshCw } from "lucide-solid";
import type { Component } from "solid-js";

interface RootErrorFallbackProps {
  error: unknown;
  onReset: () => void;
}

const RootErrorFallback: Component<RootErrorFallbackProps> = (props) => {
  const message =
    props.error instanceof Error
      ? props.error.message
      : typeof props.error === "string"
        ? props.error
        : "Unexpected failure";

  return (
    <div class="flex h-full w-full items-center justify-center bg-background px-8">
      <div class="flex max-w-sm flex-col items-center gap-3 text-center">
        <div
          class="flex h-11 w-11 items-center justify-center rounded-full text-danger"
          style={{ "background-color": "rgba(224, 107, 107, 0.12)" }}
        >
          <AlertOctagon size={20} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-foreground">
            Something went wrong
          </p>
          <p class="text-xs leading-relaxed text-muted-2 break-words">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={props.onReset}
          class="mt-1 flex items-center gap-1.5 rounded-md bg-surface-selected px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.12] active:bg-white/[0.16]"
        >
          <RefreshCw size={11} strokeWidth={2.5} aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
};

export default RootErrorFallback;
