import type { Component } from "solid-js";

interface SectionHeaderProps {
  label: string;
}

const SectionHeader: Component<SectionHeaderProps> = (props) => {
  return (
    <div class="flex h-7 shrink-0 items-end px-3 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-3 first:pt-1.5">
      {props.label}
    </div>
  );
};

export default SectionHeader;
