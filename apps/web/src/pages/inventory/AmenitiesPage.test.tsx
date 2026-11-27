// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AmenitiesPage from "./AmenitiesPage";

vi.mock("../../hooks/useInventory", () => ({
  useAmenities: vi.fn(),
  usePolicies: vi.fn(),
}));

vi.mock("../../hooks/useInventoryMutations", () => ({
  useDeactivateAmenity: () => ({ mutateAsync: vi.fn() }),
  useCreateAmenity: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateAmenity: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ user: { role: "PLATFORM_ADMIN" } }),
}));

import { useAmenities } from "../../hooks/useInventory";

const mockedUseAmenities = vi.mocked(useAmenities);

afterEach(cleanup);

describe("AmenitiesPage", () => {
  it("renders the amenity rows for an admin", () => {
    mockedUseAmenities.mockReturnValue({
      data: [
        { id: "1", key: "wifi", name: "Wi-Fi", category: "AMENITY" },
        { id: "2", key: "borehole", name: "Borehole", category: "UTILITY" },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAmenities>);

    render(<AmenitiesPage />);

    expect(screen.getByText("Wi-Fi")).toBeTruthy();
    expect(screen.getByText("Borehole")).toBeTruthy();
    expect(screen.getByText("Amenity")).toBeTruthy();
    expect(screen.getByText("Utility")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
  });

  it("renders an empty state when there are no amenities", () => {
    mockedUseAmenities.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAmenities>);

    render(<AmenitiesPage />);

    expect(screen.getByText("No amenities yet")).toBeTruthy();
  });

  it("renders an error state with retry when loading fails", () => {
    const refetch = vi.fn();
    mockedUseAmenities.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch,
    } as unknown as ReturnType<typeof useAmenities>);

    render(<AmenitiesPage />);

    expect(screen.getByText("boom")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});