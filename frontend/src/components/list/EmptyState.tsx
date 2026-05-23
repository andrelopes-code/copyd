import { ClipboardList, SearchX } from "lucide-solid";
import { Show, type Component } from "solid-js";

interface EmptyStateProps {
  title: string;
  description?: string;
  variant?: "initial" | "no-match";
  query?: string;
}

const EmptyState: Component<EmptyStateProps> = (props) => {
  const isNoMatch = () => props.variant === "no-match";

  return (
    <div class="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
      <div class="empty-well">
        <Show
          when={isNoMatch()}
          fallback={
            <ClipboardList
              size={24}
              strokeWidth={1.5}
              class="text-muted-2"
              aria-hidden="true"
            />
          }
        >
          <SearchX
            size={24}
            strokeWidth={1.5}
            class="text-muted-2"
            aria-hidden="true"
          />
        </Show>
      </div>

      <div class="flex max-w-64 flex-col gap-1.5">
        <p class="text-[13.5px] font-medium tracking-[0.005em] text-foreground">
          {props.title}
        </p>
        <Show
          when={isNoMatch() && props.query}
          fallback={
            <Show when={props.description}>
              <p class="text-xs leading-relaxed text-muted-2">
                {props.description}
              </p>
            </Show>
          }
        >
          <p class="text-xs leading-relaxed text-muted-2">
            No match for{" "}
            <code class="rounded-[5px] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-foreground break-all">
              {props.query}
            </code>
          </p>
        </Show>
      </div>
    </div>
  );
};

export default EmptyState;
