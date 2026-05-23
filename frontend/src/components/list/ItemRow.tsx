import {
  createMemo,
  createResource,
  For,
  Show,
  type Component,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "@lib/cn";
import {
  iconForContentType,
  tintForContentType,
} from "@lib/contentTypeIcon";
import { formatRelativeTime } from "@lib/formatTime";
import { getImageData, imageDataUrl } from "@lib/imageCache";
import type { ClipboardItem, ContentType } from "@app-types/item";

interface ItemRowProps {
  item: ClipboardItem;
  selected: boolean;
  copied: boolean;
  onActivate: () => void;
  ref?: (el: HTMLDivElement) => void;
}

const MONO_TYPES: ReadonlySet<ContentType> = new Set([
  "json",
  "path",
  "command",
]);

const PREVIEW_SEP = " ↵ ";

const ItemRow: Component<ItemRowProps> = (props) => {
  const isMono = () => MONO_TYPES.has(props.item.contentType);
  const showRail = () => props.item.pinned || props.selected;

  // Type tint for the icon. At rest the hue sits at low alpha so it
  // reads as a quiet signal; selected bumps near-opaque; copied yields
  // to the accent flash and we skip the tint entirely.
  const iconStyle = (): JSX.CSSProperties | undefined => {
    if (props.copied) return undefined;
    const alpha = props.selected ? 0.95 : 0.6;
    const color = tintForContentType(props.item.contentType, alpha);
    return color ? { color } : undefined;
  };

  // If the backend stitched the preview, split on the separator so we
  // can dim the ↵ glyphs visually — they're hints, not content.
  const previewSegments = createMemo<string[]>(() =>
    props.item.preview.includes(PREVIEW_SEP)
      ? props.item.preview.split(PREVIEW_SEP)
      : [props.item.preview],
  );

  return (
    <div
      ref={props.ref}
      role="option"
      aria-selected={props.selected}
      onClick={props.onActivate}
      class={cn(
        "relative flex h-9 shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-md pl-3.5 pr-3",
        "transition-colors duration-300 ease-out",
        props.copied
          ? "copy-row bg-[rgba(107,122,240,0.18)]"
          : props.selected
            ? "row-selected"
            : "hover:bg-surface-hover",
      )}
    >
      <Show when={showRail()}>
        <span
          aria-hidden="true"
          class={cn(
            "row-rail",
            !props.selected && !props.copied && "row-rail-muted",
          )}
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
        style={iconStyle()}
      >
        <RowGlyph item={props.item} />
      </span>

      <span
        class={cn(
          "min-w-0 flex-1 truncate text-[13.5px] tracking-[0.005em] transition-colors duration-300 ease-out",
          isMono() && "font-mono text-[12.5px] tracking-normal",
          props.copied
            ? "text-foreground"
            : props.selected
              ? "text-foreground"
              : "text-muted",
        )}
      >
        <For each={previewSegments()}>
          {(part, i) => (
            <>
              <Show when={i() > 0}>
                <span
                  class="mx-1.5 select-none text-muted-3 opacity-70"
                  aria-hidden="true"
                >
                  ↵
                </span>
              </Show>
              {part}
            </>
          )}
        </For>
      </span>

      <div class="flex shrink-0 items-center gap-2.5">
        <Show when={props.item.useCount > 1 && !props.copied}>
          <span
            class={cn(
              "text-[10.5px] tabular-nums leading-none transition-colors duration-300 ease-out",
              props.selected ? "text-muted-2" : "text-muted-3",
            )}
            title={`Copied ${props.item.useCount} times`}
          >
            {props.item.useCount}×
          </span>
        </Show>

        <span class="grid text-right text-[11px] tabular-nums leading-none">
          <span
            class={cn(
              "col-start-1 row-start-1 transition-all duration-300 ease-out",
              props.copied
                ? "opacity-0 -translate-x-2"
                : props.selected
                  ? "opacity-100 translate-x-0 text-muted"
                  : "opacity-100 translate-x-0 text-muted-3",
            )}
          >
            {formatRelativeTime(props.item.lastUsedAt)}
          </span>
          <span
            class={cn(
              "col-start-1 row-start-1 font-medium uppercase tracking-[0.08em] text-accent transition-all duration-300 ease-out",
              props.copied
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-2",
            )}
          >
            Copied
          </span>
        </span>
      </div>
    </div>
  );
};

const RowGlyph: Component<{ item: ClipboardItem }> = (props) => {
  return (
    <Show
      when={props.item.contentType === "color"}
      fallback={
        <Show
          when={props.item.contentType === "image"}
          fallback={
            <Dynamic
              component={iconForContentType(props.item.contentType)}
              size={14}
              strokeWidth={2.5}
            />
          }
        >
          <ImageGlyph id={props.item.id} />
        </Show>
      }
    >
      <span
        class="h-3.5 w-3.5 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.45)]"
        style={{ "background-color": props.item.content }}
      />
    </Show>
  );
};

const ImageGlyph: Component<{ id: string }> = (props) => {
  const [data] = createResource(() => props.id, getImageData);
  return (
    <Show
      when={data()}
      fallback={
        <Dynamic
          component={iconForContentType("image")}
          size={14}
          strokeWidth={2.5}
        />
      }
    >
      <img
        src={imageDataUrl(data()!)}
        alt=""
        class="h-4 w-4 rounded-[3px] object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
        draggable={false}
      />
    </Show>
  );
};

export default ItemRow;
