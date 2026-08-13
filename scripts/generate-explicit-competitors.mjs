import { writeFile } from "node:fs/promises";
import { seedIdeas } from "../server/seedData.ts";

const entries = seedIdeas.map(idea => `  ${JSON.stringify(idea.slug)}: ${JSON.stringify(idea.competitors, null, 2)},`).join("\n");
const output = `import type { SeedCompetitor } from \"./seedData\";\n\n// Generated from the reviewed catalog. Each slug owns three concrete competitor records.\nexport const explicitCompetitors: Record<string, SeedCompetitor[]> = {\n${entries}\n};\n`;
await writeFile(new URL("../server/explicitCompetitors.ts", import.meta.url), output, "utf8");
console.log(`Generated ${seedIdeas.length} idea competitor sets.`);
