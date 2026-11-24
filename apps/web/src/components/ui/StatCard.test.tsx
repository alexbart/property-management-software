// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders the title, value, trend and icon", () => {
    const { container } = render(
      <StatCard
        title="Total Collected"
        value="KES 15,000"
        trend="+5%"
        icon={Wallet}
      />,
    );

    expect(screen.getByText("Total Collected")).toBeTruthy();
    expect(screen.getByText("KES 15,000")).toBeTruthy();
    expect(screen.getByText("+5%")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
  });
});