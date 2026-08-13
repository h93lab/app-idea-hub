import { readFile, writeFile } from "node:fs/promises";
const path = new URL("../server/seedData.ts", import.meta.url);
const source = await readFile(path, "utf8");
const start = source.indexOf("const pools: Record<IdeaCategory, SeedCompetitor[]> = {");
const end = source.indexOf("function slugify", start);
if (start < 0 || end < 0) throw new Error("Legacy pool boundaries not found");
const next = `${source.slice(0, start)}${source.slice(end)}`;
await writeFile(path, next, "utf8");
console.log("Removed legacy category pools.");
