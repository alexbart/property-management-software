import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "./lib/auth";
import LoginPage from "./pages/LoginPage";

describe("LoginPage", () => {
  it("renders the login form", () => {
    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(AuthProvider, null, createElement(LoginPage)),
      ),
    );

    expect(html).toContain("Sign in");
    expect(html).toContain("Email");
    expect(html).toContain("Password");
  });
});