import { describe, expect, it } from "vitest";
import { API_VERSION } from "./index";

describe("shared contracts", () => {
  it("exposes the API version", () => {
    expect(API_VERSION).toBe("v1");
  });
});
