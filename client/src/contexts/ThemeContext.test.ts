import { describe, expect, it } from "vitest";
import { nextTheme, themeClasses } from "./ThemeContext";

describe("theme helpers", () => {
  it("cycles light to dark to AMOLED and back to light", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("amoled");
    expect(nextTheme("amoled")).toBe("light");
  });

  it("enables both dark and AMOLED classes only for AMOLED mode", () => {
    expect(themeClasses("light")).toEqual({ dark: false, amoled: false });
    expect(themeClasses("dark")).toEqual({ dark: true, amoled: false });
    expect(themeClasses("amoled")).toEqual({ dark: true, amoled: true });
  });
});
