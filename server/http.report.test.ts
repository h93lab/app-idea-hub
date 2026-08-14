import { describe, expect, it } from "vitest";
import http from "node:http";
import express from "express";
import { ensureSeededIdeas, getIdeaDetail } from "./db";
import { ideaToMarkdown } from "./reports";

const app = express();
app.get("/api/reports/test/:id/:format", async (req, res) => {
  const id = Number(req.params.id);
  const format = req.params.format;
  if (!Number.isInteger(id) || !["markdown", "pdf"].includes(format)) return res.status(400).json({ error: "Invalid" });
  await ensureSeededIdeas();
  const idea = await getIdeaDetail(id);
  if (!idea) return res.status(404).json({ error: "Not found" });
  const md = ideaToMarkdown(idea);
  res.setHeader("Content-Type", format === "markdown" ? "text/markdown" : "application/pdf");
  res.send(md);
});

describe("HTTP report route tests", () => {
  it("downloads markdown report over HTTP request", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address() as { port: number };
    const port = address.port;

    const responseText = await new Promise<string>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/test/1/markdown`, res => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve(data));
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(responseText).toContain("App Idea Hub");
  });
});
