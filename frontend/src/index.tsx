/* @refresh reload */
import { ErrorBoundary } from "solid-js";
import { render } from "solid-js/web";

import "./index.css";
import App from "./App";
import RootErrorFallback from "@components/feedback/RootErrorFallback";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found in index.html");
}

render(
  () => (
    <ErrorBoundary
      fallback={(err, reset) => (
        <RootErrorFallback error={err} onReset={reset} />
      )}
    >
      <App />
    </ErrorBoundary>
  ),
  root,
);
