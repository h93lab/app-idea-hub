// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { type ReactNode } from "react";

const mocks = vi.hoisted(() => ({ save: vi.fn(), review: vi.fn(), mission: vi.fn(), refetch: vi.fn() }));

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    personal: { get: { useQuery: () => ({ data: {}, isLoading: false, refetch: mocks.refetch }) }, update: { useMutation: () => ({ mutate: mocks.save, isPending: false }) } },
    professionalTools: {
      save: { useMutation: () => ({ mutate: mocks.save, isPending: false }) },
      reviewIntelligence: { useMutation: () => ({ mutate: mocks.review, isPending: false }) },
      claudeCodeGenerator: { useMutation: () => ({ mutate: mocks.mission, isPending: false }) },
    },
  },
}));

import FounderCockpit from "./FounderCockpit";

afterEach(() => cleanup());

beforeEach(() => vi.clearAllMocks());

describe("Founder Cockpit UI", () => {
  it("persists opportunity scoring changes through the professional save route", () => {
    render(<FounderCockpit />);
    fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "8" } });
    expect(mocks.save).toHaveBeenCalledWith({ key: "opportunityScoring", value: expect.objectContaining({ marketDemand: 8 }) });
  });

  it("records a keyword gap from the launch workspace", async () => {
    const user = userEvent.setup();
    render(<FounderCockpit />);
    await user.click(screen.getByRole("tab", { name: /Launch and learn/i }));
    await user.type(screen.getByPlaceholderText("Keyword gap to investigate"), "offline invoice");
    await user.click(screen.getByRole("button", { name: "Add keyword gap" }));
    expect(mocks.save).toHaveBeenCalledWith({ key: "asoRankTracker", value: expect.objectContaining({ gaps: expect.arrayContaining([expect.objectContaining({ keyword: "offline invoice" })]) }) });
  });
});
