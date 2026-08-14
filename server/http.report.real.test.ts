import { describe, expect, it } from "vitest";
import http from "node:http";
import express from "express";
import { ensureSeededIdeas, getIdeaDetail, getIdeasForComparison } from "./db";
import { comparisonToMarkdown, ideaToMarkdown, streamReportPdf } from "./reports";

const app = express();
app.get("/api/reports/idea/:id/:format", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const format = req.params.format;
    if (!Number.isInteger(id) || !["markdown", "pdf"].includes(format)) return res.status(400).json({ error: "Invalid report request" });
    await ensureSeededIdeas();
    const idea = await getIdeaDetail(id);
    if (!idea) return res.status(404).json({ error: "Idea not found" });
    const markdown = ideaToMarkdown(idea);
    if (format === "markdown") {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="idea-${id}.md"`);
      return res.send(markdown);
    }
    return streamReportPdf(res, `idea-${id}.pdf`, idea.title, markdown);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unable to build report" });
  }
});

app.get("/api/reports/compare/:ids/:format", async (req, res) => {
  try {
    const ids = String(req.params.ids).split(",").map(Number).filter(Number.isInteger);
    const format = req.params.format;
    if (ids.length < 2 || ids.length > 4 || !["markdown", "pdf"].includes(format)) return res.status(400).json({ error: "Select two to four idea IDs" });
    await ensureSeededIdeas();
    const ideas = await getIdeasForComparison(ids);
    if (ideas.length < 2) return res.status(404).json({ error: "Ideas not found" });
    const markdown = comparisonToMarkdown(ideas);
    if (format === "markdown") {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="idea-comparison.md"`);
      return res.send(markdown);
    }
    return streamReportPdf(res, "idea-comparison.pdf", "Idea comparison", markdown);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unable to build comparison report" });
  }
});

describe("Real HTTP report route integration tests", () => {
  it("downloads idea markdown report with correct headers", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const result = await new Promise<{ status?: number; contentType?: string; body: string }>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/idea/1/markdown`, res => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => resolve({ status: res.statusCode, contentType: res.headers["content-type"], body }));
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(result.status).toBe(200);
    expect(result.contentType).toContain("text/markdown");
    expect(result.body).toContain("# ");
  });

  it("returns 404 for non-existent idea report", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const status = await new Promise<number | undefined>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/idea/99999/markdown`, res => {
        res.resume();
        resolve(res.statusCode);
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(status).toBe(404);
  });

  it("downloads idea PDF report with correct content-type header", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const result = await new Promise<{ status?: number; contentType?: string }>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/idea/1/pdf`, res => {
        res.resume();
        resolve({ status: res.statusCode, contentType: res.headers["content-type"] });
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(result.status).toBe(200);
    expect(result.contentType).toContain("application/pdf");
  });

  it("downloads comparison markdown report for valid ids", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const result = await new Promise<{ status?: number; body: string }>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/compare/1,2/markdown`, res => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(result.status).toBe(200);
    expect(result.body).toContain("Idea comparison");
  });

  it("rejects comparison request with fewer than two ids", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const status = await new Promise<number | undefined>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/compare/1/markdown`, res => {
        res.resume();
        resolve(res.statusCode);
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(status).toBe(400);
  });

  it("downloads comparison PDF report successfully", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const result = await new Promise<{ status?: number; contentType?: string }>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/compare/1,2/pdf`, res => {
        res.resume();
        resolve({ status: res.statusCode, contentType: res.headers["content-type"] });
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(result.status).toBe(200);
    expect(result.contentType).toContain("application/pdf");
  });

  it("rejects invalid format for idea report", async () => {
    const server = http.createServer(app);
    // cleaned up stray placeholder
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const status = await new Promise<number | undefined>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/idea/1/doc`, res => {
        res.resume();
        resolve(res.statusCode);
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(status).toBe(400);
  });

  it("rejects invalid format for comparison report", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const status = await new Promise<number | undefined>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/compare/1,2/doc`, res => {
        res.resume();
        resolve(res.statusCode);
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(status).toBe(400);
  });

  it("includes content-disposition attachment header on report downloads", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const disposition = await new Promise<string | undefined>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/idea/1/markdown`, res => {
        res.resume();
        resolve(res.headers["content-disposition"]);
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(disposition).toContain("attachment; filename=");
  });

  it("includes content-disposition attachment header on comparison downloads", async () => {
    const server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const disposition = await new Promise<string | undefined>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/api/reports/compare/1,2/markdown`, res => {
        res.resume();
        resolve(res.headers["content-disposition"]);
      }).on("error", reject);
    });

    await new Promise<void>(resolve => server.close(() => resolve()));
    expect(disposition).toContain("attachment; filename=");
  });
});
