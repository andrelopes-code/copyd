import {
  AlignJustify,
  AlignLeft,
  AtSign,
  Braces,
  FolderTree,
  Image,
  Link,
  Palette,
  Terminal,
} from "lucide-solid";
import type { Component } from "solid-js";

import type { ContentType } from "@app-types/item";

type IconComponent = Component<{
  size?: number;
  strokeWidth?: number;
  class?: string;
}>;

const iconByType: Record<ContentType, IconComponent> = {
  text: AlignLeft,
  url: Link,
  email: AtSign,
  color: Palette,
  json: Braces,
  path: FolderTree,
  command: Terminal,
  image: Image,
  multiline: AlignJustify,
};

export function iconForContentType(type: ContentType): IconComponent {
  return iconByType[type];
}

// Subtle hue per content type — gives the icon column a glanceable
// chromatic signature without going carnival. Only types with a clear
// "color identity" get a tint; neutral types fall back to muted greys.
// Returned as an rgb triplet so callers can compose alpha freely for
// rest / selected / copied states.
type Rgb = readonly [number, number, number];

const TINT_BY_TYPE: Partial<Record<ContentType, Rgb>> = {
  url: [116, 220, 208], // cyan
  email: [161, 99, 232], // violet
  json: [232, 164, 99], // amber
  path: [107, 122, 240], // indigo
  command: [136, 216, 112], // green
  multiline: [185, 165, 222], // soft lilac
};

export function tintForContentType(
  type: ContentType,
  alpha: number,
): string | undefined {
  const rgb = TINT_BY_TYPE[type];
  if (!rgb) return undefined;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
