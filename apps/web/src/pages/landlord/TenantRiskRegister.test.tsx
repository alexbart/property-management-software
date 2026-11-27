// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTenantsRisk } from "../../hooks/useTenantsRisk";
import TenantRiskRegister from "./TenantRiskRegister";

vi.mock("../../hooks/useTenantsRisk", () => ({
  useTenantsRisk: vi.fn(),
}));

const mockedUseTenantsRisk = vi.mocked(useTenantsRisk);

describe("TenantRiskRegister", () => {
  it("renders tenants ranked by risk with the highest first", () => {
    mockedUseTenantsRisk.mockReturnValue({
      data: [
        {
          id: "1",
          firstName: "Low",
          lastName: "Risk",
          phone: "+254700000001",
          riskScore: 10,
          riskFlags: [],
        },
        {
          id: "2",
          firstName: "High",
          lastName: "Risk",
          phone: "+254700000002",
          riskScore: 80,
          riskFlags: ["HIGH_RISK", "CHRONIC_LATE"],
        },
        {
          id: "3",
          firstName: "Medium",
          lastName: "Risk",
          phone: "+254700000003",
          riskScore: 30,
          riskFlags: ["CHRONIC_LATE"],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    } as never);

    render(<TenantRiskRegister />);

    const rows = screen.getAllByRole("row");
    // Header + three tenants.
    expect(rows).toHaveLength(4);
    expect(rows[1].textContent).toContain("High Risk");
    expect(rows[1].className).toContain("bg-rose-50");
    expect(rows[2].textContent).toContain("Medium Risk");
    expect(rows[3].textContent).toContain("Low Risk");
  });
});