import { Search, X } from "lucide-solid";
import type { Component } from "solid-js";
import { Window } from "@wailsio/runtime";

interface TitleBarProps {
  value: string;
  onInput: (value: string) => void;
}

const TitleBar: Component<TitleBarProps> = (props) => {
  return (
    <header
      class="flex h-10 shrink-0 items-center gap-2.5 border-b border-border pl-3.5 pr-1.5"
      style={{ "--wails-draggable": "drag" }}
    >
      <Search
        size={13}
        strokeWidth={2.25}
        class="shrink-0 text-muted-3"
        aria-hidden="true"
      />
      <input
        type="text"
        autofocus
        spellcheck={false}
        autocomplete="off"
        placeholder="Search"
        value={props.value}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        class="min-w-0 flex-1 bg-transparent text-[14px] leading-none text-foreground placeholder:text-muted-2 focus:outline-none"
        style={{ "--wails-draggable": "no-drag" }}
      />
      <button
        type="button"
        aria-label="Close window"
        onClick={() => Window.Hide()}
        class="flex h-6 w-6 items-center justify-center rounded-md text-muted-2 transition-colors hover:bg-white/[0.06] hover:text-foreground active:bg-white/[0.1]"
        style={{ "--wails-draggable": "no-drag" }}
      >
        <X size={13} strokeWidth={2.25} />
      </button>
    </header>
  );
};

export default TitleBar;
