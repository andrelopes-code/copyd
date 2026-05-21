import { ClipboardList } from "lucide-solid";
import type { Component } from "solid-js";

interface EmptyStateProps {
  title: string;
  description?: string;
}

const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div class="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <ClipboardList size={22} strokeWidth={1.5} class="text-muted-3" />
      <div class="flex max-w-60 flex-col gap-1">
        <p class="text-sm font-medium text-foreground">{props.title}</p>
        {props.description && (
          <p class="text-xs leading-relaxed text-muted-2">
            {props.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
