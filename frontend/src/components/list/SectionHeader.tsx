import type { Component } from "solid-js";

interface SectionHeaderProps {
  label: string;
}

const SectionHeader: Component<SectionHeaderProps> = (props) => {
  const isPinned = () => props.label.toLowerCase() === "pinned";

  return (
    <div class="flex h-7 shrink-0 items-center gap-2 px-3.5 pb-1 pt-3 first:pt-2">
      <span
        aria-hidden="true"
        class="h-1 w-1 shrink-0 rounded-full"
        style={{
          "background-color": isPinned()
            ? "var(--color-accent)"
            : "rgba(235, 235, 245, 0.32)",
          "box-shadow": isPinned()
            ? "0 0 6px rgba(107, 122, 240, 0.6)"
            : "none",
        }}
      />
      <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-3">
        {props.label}
      </span>
      <span class="section-line" aria-hidden="true" />
    </div>
  );
};

export default SectionHeader;
