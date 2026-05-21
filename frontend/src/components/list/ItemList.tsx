import { For, createEffect, type Component } from "solid-js";

import ItemRow from "./ItemRow";
import SectionHeader from "./SectionHeader";
import type { ClipboardItem } from "../../types/item";

interface ItemListProps {
  items: ClipboardItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  showSections: boolean;
}

const ItemList: Component<ItemListProps> = (props) => {
  const rowRefs: HTMLDivElement[] = [];

  createEffect(() => {
    const el = rowRefs[props.selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  });

  const isPinnedBoundary = (index: number) => {
    if (!props.showSections) return false;
    const item = props.items[index];
    if (!item.pinned) return false;
    if (index === 0) return true;
    return !props.items[index - 1].pinned;
  };

  const isRecentBoundary = (index: number) => {
    if (!props.showSections) return false;
    const item = props.items[index];
    if (item.pinned) return false;
    if (index === 0) return true;
    return props.items[index - 1].pinned;
  };

  return (
    <div
      role="listbox"
      class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto scroll-pt-9 scroll-pb-2 px-1.5 pb-2"
    >
      <For each={props.items}>
        {(item, index) => (
          <>
            {isPinnedBoundary(index()) && <SectionHeader label="Pinned" />}
            {isRecentBoundary(index()) && <SectionHeader label="Recent" />}
            <ItemRow
              item={item}
              selected={index() === props.selectedIndex}
              onSelect={() => props.onSelect(index())}
              ref={(el) => {
                rowRefs[index()] = el;
              }}
            />
          </>
        )}
      </For>
    </div>
  );
};

export default ItemList;
