import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ensureSeededIdeas, getIdeaDetail, getIdeasForComparison, getPersonalWorkspace, getMarketingDescriptionArchive } from "../db";
import { streamFlutterBlueprintZip } from "../flutterBlueprint";
import { refreshCompetitorMonitorByTaskUid } from "../competitorMonitoring";
import { sdk } from "./sdk";
import { comparisonToMarkdown, ideaToMarkdown, marketingDescriptionToMarkdown, streamReportPdf } from "../reports";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
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
  app.get("/api/exports/flutter-blueprint.zip", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const workspace = await getPersonalWorkspace(user.id);
      if (!workspace?.flutterBlueprint || Object.keys(workspace.flutterBlueprint).length === 0) return res.status(404).json({ error: "Generate a Flutter blueprint first" });
      return streamFlutterBlueprintZip(res, workspace.flutterBlueprint);
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : "Authentication required" });
    }
  });
  app.get("/api/exports/marketing-description/:id.pdf", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Invalid marketing description ID" });
      const archive = await getMarketingDescriptionArchive(user.id, id);
      if (!archive) return res.status(404).json({ error: "Marketing description not found" });
      return streamReportPdf(res, `marketing-description-${id}.pdf`, archive.appName, marketingDescriptionToMarkdown(archive));
    } catch (error) {
      return res.status(401).json({ error: error instanceof Error ? error.message : "Authentication required" });
    }
  });
  app.post("/api/scheduled/competitor-monitor", async (req, res) => {
    const requestContext = { url: req.originalUrl, timestamp: new Date().toISOString() };
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const result = await refreshCompetitorMonitorByTaskUid(user.taskUid);
      return res.json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, context: requestContext });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
