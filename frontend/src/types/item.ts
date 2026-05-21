export type ContentType =
  | "text"
  | "url"
  | "email"
  | "color"
  | "code"
  | "json"
  | "yaml"
  | "path"
  | "command"
  | "image"
  | "multiline";

export interface ClipboardItem {
  id: string;
  content: string;
  contentType: ContentType;
  preview: string;
  pinned: boolean;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  size: number;
  sourceApp?: string;
  width?: number;
  height?: number;
}
