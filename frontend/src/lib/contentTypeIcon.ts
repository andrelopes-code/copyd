import {
  AlignJustify,
  AlignLeft,
  AtSign,
  Braces,
  Code,
  FileCode,
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
  code: Code,
  json: Braces,
  yaml: FileCode,
  path: FolderTree,
  command: Terminal,
  image: Image,
  multiline: AlignJustify,
};

export function iconForContentType(type: ContentType): IconComponent {
  return iconByType[type];
}
