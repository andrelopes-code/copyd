import { createResource, Show, type Component } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "../../lib/cn";
import { iconForContentType } from "../../lib/contentTypeIcon";
import { getImageData, imageDataUrl } from "../../lib/imageCache";
import type { ClipboardItem, ContentType } from "../../types/item";

interface QuickLookProps {
  item: ClipboardItem;
  onClose: () => void;
}

const MONO_TYPES: ReadonlySet<ContentType> = new Set([
  "code",
  "json",
  "yaml",
  "path",
  "command",
]);

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const QuickLook: Component<QuickLookProps> = (props) => {
  const isMono = () => MONO_TYPES.has(props.item.contentType);
  const isImage = () => props.item.contentType === "image";

  const metaLine = () => {
    const parts: string[] = [props.item.contentType];
    if (isImage() && props.item.width && props.item.height) {
      parts.push(`${props.item.width}×${props.item.height}`);
    }
    parts.push(formatBytes(props.item.size));
    return parts.join(" · ");
  };

  return (
    <div class="quicklook absolute inset-0 z-20 flex flex-col bg-background/80 backdrop-blur-md">
      <div class="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-4">
        <span class="flex items-center gap-2 text-xs text-muted-2">
          <Dynamic
            component={iconForContentType(props.item.contentType)}
            size={12}
            strokeWidth={2.5}
            class="text-muted-3"
          />
          <span class="font-medium uppercase tracking-[0.08em]">
            {metaLine()}
          </span>
        </span>
        <span class="text-[10px] uppercase tracking-[0.1em] text-muted-3">
          → / Esc to close
        </span>
      </div>

      <div class="flex min-h-0 flex-1 overflow-hidden">
        <Show when={isImage()} fallback={<TextBody item={props.item} mono={isMono()} />}>
          <ImageBody id={props.item.id} />
        </Show>
      </div>
    </div>
  );
};

const TextBody: Component<{ item: ClipboardItem; mono: boolean }> = (props) => {
  return (
    <pre
      class={cn(
        "min-h-0 w-full overflow-auto px-5 py-4 text-[13px] leading-relaxed text-foreground",
        "whitespace-pre-wrap break-words",
        props.mono ? "font-mono" : "font-sans",
      )}
    >
      {props.item.content}
    </pre>
  );
};

const ImageBody: Component<{ id: string }> = (props) => {
  const [data] = createResource(() => props.id, getImageData);

  return (
    <div class="flex min-h-0 flex-1 items-center justify-center p-4">
      <Show
        when={data()}
        fallback={
          <span class="text-xs text-muted-3">
            {data.error ? "Failed to load image" : "Loading…"}
          </span>
        }
      >
        <img
          src={imageDataUrl(data()!)}
          alt=""
          class="max-h-full max-w-full rounded-md object-contain shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
          draggable={false}
        />
      </Show>
    </div>
  );
};

export default QuickLook;
