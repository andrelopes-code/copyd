import { AlertTriangle } from "lucide-solid";
import type { Component } from "solid-js";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry: () => void;
}

const ErrorState: Component<ErrorStateProps> = (props) => {
  return (
    <div class="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <div
        class="flex h-9 w-9 items-center justify-center rounded-full text-danger"
        style={{ "background-color": "rgba(224, 107, 107, 0.12)" }}
      >
        <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
      </div>
      <div class="flex max-w-60 flex-col gap-1">
        <p class="text-sm font-medium text-foreground">{props.title}</p>
        <p class="text-xs leading-relaxed text-muted-2 break-words">
          {props.description}
        </p>
      </div>
      <button
        type="button"
        onClick={props.onRetry}
        class="mt-1 rounded-md bg-surface-selected px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.12] active:bg-white/[0.16]"
      >
        Try again
      </button>
    </div>
  );
};

export default ErrorState;
