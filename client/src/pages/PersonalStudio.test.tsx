// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { type ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

const mocks = vi.hoisted(() => ({
  personalGet: vi.fn(), personalDecision: vi.fn(), personalExport: vi.fn(), personalUpdate: vi.fn(), personalReset: vi.fn(), personalGenerate: vi.fn(), validationGenerate: vi.fn(),
}));

vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/trpc", () => ({ trpc: { personal: { get: { useQuery: () => ({ data: mocks.personalGet(), isLoading: false, refetch: vi.fn() }) }, decision: { useQuery: () => ({ data: mocks.personalDecision(), isLoading: false }) }, export: { useQuery: () => ({ refetch: mocks.personalExport }) }, update: { useMutation: () => ({ mutate: mocks.personalUpdate, isPending: false }) }, reset: { useMutation: () => ({ mutate: mocks.personalReset, isPending: false }) }, generate: { useMutation: () => ({ mutate: mocks.personalGenerate, data: undefined, isPending: false, error: undefined }) }, validationGenerate: { useMutation: () => ({ mutate: mocks.validationGenerate, isPending: false }) } } } }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

import PersonalStudio from "./PersonalStudio";

afterEach(() => cleanup());

const workspace = { status: "Inbox", customScore: 70, decisionLog: "", customNotes: "", validationChecklist: ["Define the problem", "Interview users"], validationArtifacts: {}, flutterBlueprint: {}, financialModel: { price: 9, monthlyDownloads: 1000, conversionRate: 2, storeFee: 15, monthlyInfra: 50, monthlyAiCost: 20, monthlyMarketing: 0 }, asoMetadata: { title: "", shortDescription: "", longDescription: "", keywords: [], releaseNotes: "" }, backlogTasks: [] };

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={() => toggleTheme?.()}>{theme}</button>;
}

describe("Personal Studio UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.personalGet.mockReturnValue(workspace);
    mocks.personalDecision.mockReturnValue({ score: 62, recommendation: "Validate one assumption next" });
    mocks.personalExport.mockResolvedValue({ exportedAt: "2026-08-14T00:00:00Z", workspace });
  });

  it("renders decision engine and persists validation lab actions", async () => {
    render(<PersonalStudio />);
    expect(screen.getByText("Validate one assumption next")).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: /Validation Lab/i }));
    expect(screen.getAllByText("Validation Lab").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByPlaceholderText(/Describe the idea/i), { target: { value: "Offline invoice app" } });
    await userEvent.click(screen.getByRole("button", { name: /Generate landing copy/i }));
    expect(mocks.validationGenerate).toHaveBeenCalledWith({ type: "landingCopy", brief: "Offline invoice app" });
  });

  it("runs backup and reset actions from the personal header", async () => {
    const click = userEvent.setup();
    render(<PersonalStudio />);
    await click.click(screen.getByRole("button", { name: "JSON" }));
    await waitFor(() => expect(mocks.personalExport).toHaveBeenCalled());
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await click.click(screen.getByRole("button", { name: "Reset" }));
    expect(mocks.personalReset).toHaveBeenCalled();
  });
});

describe("Black AMOLED theme runtime", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("persists the AMOLED mode and applies dark plus amoled classes", async () => {
    const click = userEvent.setup();
    render(<ThemeProvider defaultTheme="light" switchable><ThemeButton /></ThemeProvider>);
    await click.click(screen.getByRole("button", { name: "light" }));
    await click.click(screen.getByRole("button", { name: "dark" }));
    expect(screen.getByRole("button", { name: "amoled" })).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("amoled")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("amoled");
  });
});
