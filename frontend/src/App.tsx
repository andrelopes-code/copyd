import type { Component } from "solid-js";

const App: Component = () => {
  return (
    <main class="flex h-full w-full items-center justify-center bg-background text-foreground">
      <div class="flex flex-col items-center gap-2">
        <h1 class="text-2xl font-medium tracking-tight">cromenockle</h1>
        <p class="text-sm text-muted">Wayland clipboard manager</p>
      </div>
    </main>
  );
};

export default App;
