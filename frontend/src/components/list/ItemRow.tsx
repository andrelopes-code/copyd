import { Show, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "../../lib/cn";
import { iconForContentType } from "../../lib/contentTypeIcon";
import { formatRelativeTime } from "../../lib/formatTime";
import type { ClipboardItem, ContentType } from "../../types/item";

interface ItemRowProps {
  item: ClipboardItem;
  selected: boolean;
  onSelect: () => void;
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

  return (
    <div
      ref={props.ref}
      role="option"
      aria-selected={props.selected}
      onClick={props.onSelect}
      class={cn(
        "relative flex h-9 shrink-0 cursor-default items-center gap-3 rounded-md pl-3 pr-3",
        props.selected ? "bg-surface-selected" : "hover:bg-surface-hover",
      )}
    >
      <Show when={props.item.pinned}>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
        />
      </Show>

      <span
        class={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center",
          props.selected ? "text-foreground" : "text-muted-2",
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
          "min-w-0 flex-1 truncate text-sm",
          isMono() && "font-mono text-[13px]",
          props.selected ? "text-foreground" : "text-muted",
        )}
      >
        {props.item.preview}
      </span>

      <span class="shrink-0 text-xs tabular-nums text-muted-2">
        {formatRelativeTime(props.item.lastUsedAt)}
      </span>
    </div>
  );
};

export default ItemRow;
