import { Search, X } from "lucide-solid";
import { onCleanup, onMount, type Component } from "solid-js";
import { Events, Window } from "@wailsio/runtime";

// Emitted by the Go side whenever the window is shown (e.g. via the global
// shortcut). autofocus only fires on the first render, so we re-focus here.
const WINDOW_SHOWN = "window:shown";

interface TitleBarProps {
  value: string;
  onInput: (value: string) => void;
}

const TitleBar: Component<TitleBarProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;

  const focusSearch = () => inputRef?.focus();

  onMount(() => {
    focusSearch();
    const unsubscribe = Events.On(WINDOW_SHOWN, focusSearch);
    onCleanup(unsubscribe);
  });

  return (
    <header
      class="relative flex h-12 shrink-0 items-center gap-2.5 px-3"
      style={{ "--wails-draggable": "drag" }}
    >
      <div
        class="search-pill flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-full pl-3.5 pr-4"
        style={{ "--wails-draggable": "no-drag" }}
      >
        <Search
          size={13}
          strokeWidth={2.5}
          class="shrink-0 text-muted-2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          spellcheck={false}
          autocomplete="off"
          placeholder="Search"
          value={props.value}
          onInput={(event) => props.onInput(event.currentTarget.value)}
          class="min-w-0 flex-1 bg-transparent text-[13px] leading-none tracking-[0.005em] text-foreground placeholder:text-muted-2 focus:outline-none"
        />
      </div>

      <button
        type="button"
        aria-label="Close window"
        onClick={() => Window.Hide()}
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-white/[0.06] hover:text-foreground active:bg-white/[0.1]"
        style={{ "--wails-draggable": "no-drag" }}
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      <div class="spectrum-hairline bottom-0" aria-hidden="true" />
    </header>
  );
};

export default TitleBar;
