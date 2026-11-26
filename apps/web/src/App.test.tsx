import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the platform title", () => {
    const queryClient = new QueryClient();
    const html = renderToString(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MemoryRouter, null, createElement(App)),
      ),
    );

    expect(html).toContain("Property Management Platform");
  });
});