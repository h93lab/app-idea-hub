import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { buildFlutterBlueprintFiles, streamFlutterBlueprintZip } from "./flutterBlueprint";

describe("Flutter Blueprint export", () => {
  it("builds a sanitized project bundle with Claude Code guidance", () => {
    const result = buildFlutterBlueprintFiles({ projectName: "Invoice App / Arabic", screens: ["Home", "Invoices"], claudePrompt: "Build the smallest invoice workflow." });
    expect(result.projectName).toBe("invoice_app_arabic");
    expect(result.files["CLAUDE.md"]).toContain("Build the smallest invoice workflow.");
    expect(result.files["blueprint.json"]).toContain("Invoices");
    expect(result.files["lib/main.dart"]).toContain("BlueprintApp");
    expect(result.files["test/widget_test.dart"]).toContain("shows the first workflow placeholder");
  });

  it("streams a valid ZIP response with expected archive entries", async () => {
    const response = new PassThrough() as PassThrough & { headersSent: boolean; status: (code: number) => PassThrough; setHeader: (name: string, value: string) => void; json: (value: unknown) => PassThrough };
    response.headersSent = false;
    response.status = () => response;
    response.setHeader = () => undefined;
    response.json = value => { response.end(JSON.stringify(value)); return response; };
    const chunks: Buffer[] = [];
    response.on("data", chunk => chunks.push(Buffer.from(chunk)));
    const ended = new Promise<void>(resolve => response.on("end", () => resolve()));

    streamFlutterBlueprintZip(response as any, { projectName: "test_app" });
    await ended;

    const zip = Buffer.concat(chunks);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.toString("utf8")).toContain("CLAUDE.md");
    expect(zip.toString("utf8")).toContain("blueprint.json");
    expect(zip.toString("utf8")).toContain("lib/main.dart");
  });
});
