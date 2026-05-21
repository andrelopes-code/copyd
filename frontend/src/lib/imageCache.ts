import { ClipboardService } from "../../bindings/cromenockle/internal/service";

// Per-id memoisation of the base64 PNG payload. Item IDs are SHA-256
// hashes of content, so a given id always resolves to the same bytes:
// once fetched, the entry stays valid until the page reloads.
const cache = new Map<string, Promise<string>>();

export function getImageData(id: string): Promise<string> {
  let pending = cache.get(id);
  if (!pending) {
    pending = ClipboardService.GetImage(id) as unknown as Promise<string>;
    pending.catch(() => cache.delete(id));
    cache.set(id, pending);
  }
  return pending;
}

export function imageDataUrl(base64: string): string {
  return `data:image/png;base64,${base64}`;
}
