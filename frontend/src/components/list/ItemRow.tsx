import { Show, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "../../lib/cn";
import { iconForContentType } from "../../lib/contentTypeIcon";
import { formatRelativeTime } from "../../lib/formatTime";
import type { ClipboardItem, ContentType } from "../../types/item";

interface ItemRowProps {
  item: ClipboardItem;
  selected: boolean;
  copied: boolean;
  onSelect: () => void;
  onActivate: () => void;
  ref?: (el: HTMLDivElement) => void;
}

const MONO_TYPES: ReadonlySet<ContentType> = new Set([
  "code",
  "json",
  "yaml",
  "path",
  "command",
]);

const ItemRow: Component<ItemRowProps> = (props) => {
  const isMono = () => MONO_TYPES.has(props.item.contentType);

  const handlePointerEnter = () => {
    if (!props.copied) props.onSelect();
  };

  return (
    <div
      ref={props.ref}
      role="option"
      aria-selected={props.selected}
      onPointerEnter={handlePointerEnter}
      onClick={props.onActivate}
      class={cn(
        "relative flex h-9 shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-md pl-3 pr-3",
        "transition-colors duration-300 ease-out outline-accent",
        props.copied
          ? "copy-row bg-[rgba(94,106,210,0.16)]"
          : props.selected
            ? "bg-surface-selected outline-1 outline-offset-2"
            : "hover:bg-surface-hover",
      )}
    >
      <Show when={props.item.pinned}>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute left-1 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-accent"
        />
      </Show>

      <span
        class={cn(
          "relative flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-300 ease-out",
          props.copied
            ? "text-accent"
            : props.selected
              ? "text-foreground"
              : "text-muted-2",
        )}
      >
        <Show
          when={props.item.contentType === "color"}
          fallback={
            <Dynamic
              component={iconForContentType(props.item.contentType)}
              size={16}
              strokeWidth={3}
            />
          }
        >
          <span
            class="h-3 w-3 rounded-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
            style={{ "background-color": props.item.content }}
          />
        </Show>
      </span>

      <span
        class={cn(
          "min-w-0 flex-1 truncate text-sm transition-colors duration-300 ease-out",
          isMono() && "font-mono text-[13px]",
          props.copied || props.selected ? "text-foreground" : "text-muted",
        )}
      >
        {props.item.preview}
      </span>

      <span class="grid shrink-0 text-right text-xs tabular-nums leading-none">
        <span
          class={cn(
            "col-start-1 row-start-1 transition-all duration-300 ease-out text-muted-2",
            props.copied
              ? "opacity-0 -translate-x-2"
              : "opacity-100 translate-x-0",
          )}
        >
          {formatRelativeTime(props.item.lastUsedAt)}
        </span>
        <span
          class={cn(
            "col-start-1 row-start-1 font-medium text-accent transition-all duration-300 ease-out",
            props.copied
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-2",
          )}
        >
          Copied
        </span>
      </span>
    </div>
  );
};

export default ItemRow;
