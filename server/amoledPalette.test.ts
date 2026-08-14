import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pageRoot = path.join(projectRoot, "client/src/pages");
const ownedComponents = [
  path.join(projectRoot, "client/src/components/DashboardLayout.tsx"),
  path.join(projectRoot, "client/src/components/ManusDialog.tsx"),
];
const uiFiles = [
  ...readdirSync(pageRoot, { recursive: true })
    .filter(file => typeof file === "string" && file.endsWith(".tsx"))
    .map(file => path.join(pageRoot, file as string)),
  ...ownedComponents,
];

const forbiddenClassPatterns = [
  /bg-gradient(?:-[^\s"`]+)?/, /\b(?:from|via|to)-(?:violet|cyan|emerald|amber|rose|orange|pink|green|yellow|indigo|purple|teal)-/, 
  /\b(?:bg|text|border|ring)-(?:violet|cyan|emerald|amber|rose|orange|pink|green|yellow|indigo|purple|teal)-/, /\bbg-white(?:\/[^\s"`]+)?/, 
  /\b(?:shadow-xl|shadow-lg|shadow-md|blur-3xl)\b/, /#f8f8f7/, /rgba\(0,0,0,0\.08\)/,
];

describe("strict Black AMOLED palette", () => {
  it("keeps user-facing TSX free of forbidden color and gradient utilities", () => {
    const violations = uiFiles.flatMap(file => {
      const source = readFileSync(file, "utf8");
      return forbiddenClassPatterns.filter(pattern => pattern.test(source)).map(pattern => `${path.relative(projectRoot, file)}: ${pattern}`);
    });
    expect(violations).toEqual([]);
  });

  it("defines pure black, dark cards, and blue-only chart tokens", () => {
    const css = readFileSync(path.join(projectRoot, "client/src/index.css"), "utf8");
    expect(css).toContain("--background: #000000");
    expect(css).toContain("--card: #0b0f17");
    expect(css).toContain("--primary: #3b82f6");
    expect(css).toContain("--chart-1: #3b82f6");
  });
});
