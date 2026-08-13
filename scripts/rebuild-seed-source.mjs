import { readFile, writeFile } from "node:fs/promises";

const explicit = await readFile(new URL("../server/explicitCompetitors.ts", import.meta.url), "utf8");
const slugs = [...explicit.matchAll(/^  "([^"]+)":/gm)].map(match => match[1]);
if (slugs.length !== 200) throw new Error(`Expected 200 explicit competitor keys, found ${slugs.length}`);

const titleFromSlug = slug => slug.replace(/-\d+$/, "").split("-").map(word => word ? word[0].toUpperCase() + word.slice(1) : word).join(" ");
const categoryConfig = [
  ["Tools", "Micro-SaaS workflow", "operators and small teams", "a narrow offline-first workflow", "Subscription", "Low", "Strong"],
  ["Health", "Wellness routine", "people managing a specific routine", "privacy-first guided follow-through", "Freemium", "Medium", "Strong"],
  ["Education", "Micro-learning", "learners preparing for one outcome", "short practice tied to a measurable result", "Subscription", "Medium", "Strong"],
  ["AI", "AI workflow", "professionals with repetitive knowledge work", "a structured AI output with human review", "Usage-based", "High", "Very strong"],
  ["Games", "Casual game", "players seeking short repeatable sessions", "a distinctive mechanic with local or niche identity", "Ads", "Medium", "Strong"],
];
const groups = categoryConfig.map(([category, subcategory, audience, angle, model, level, revenue], categoryIndex) => {
  const lines = slugs.slice(categoryIndex * 40, (categoryIndex + 1) * 40).map(slug => `    b(${JSON.stringify(titleFromSlug(slug))}, ${JSON.stringify(subcategory)}, ${JSON.stringify(audience)}, ${JSON.stringify(angle)}, ${JSON.stringify(model)}, ${JSON.stringify(level)}, ${JSON.stringify(revenue)}, [${JSON.stringify(category.toLowerCase())}]),`).join("\n");
  return `  [${JSON.stringify(category)}, [\n${lines}\n  ]],`;
}).join("\n");

const output = String.raw`import type { CompetitionLevel, IdeaCategory, MonetizationModel } from "../drizzle/schema";
import { explicitCompetitors } from "./explicitCompetitors";

export type SeedCompetitor = {
  name: string; platform: string; url: string; positioning: string;
  strengths: string; weaknesses: string; differentiation: string;
  monetization: string; threatLevel: CompetitionLevel;
};
export type SeedIdea = {
  slug: string; title: string; category: IdeaCategory; subcategory: string;
  summary: string; targetAudience: string; problem: string; solution: string;
  uniqueValue: string; monetizationModel: MonetizationModel;
  competitionLevel: CompetitionLevel; competitionScore: number;
  revenuePotential: "Moderate" | "Strong" | "Very strong";
  mvpScope: string; implementationPlan: string; validationPlan: string;
  risks: string; tags: string[]; competitors: SeedCompetitor[];
};
type Blueprint = { title: string; subcategory: string; audience: string; angle: string; model: MonetizationModel; level: CompetitionLevel; revenue: SeedIdea["revenuePotential"]; tags: string[] };
const b = (title: string, subcategory: string, audience: string, angle: string, model: MonetizationModel, level: CompetitionLevel, revenue: Blueprint["revenue"], tags: string[]): Blueprint => ({ title, subcategory, audience, angle, model, level, revenue, tags });
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function makeIdea(category: IdeaCategory, blueprint: Blueprint, index: number): SeedIdea {
  const slug = slugify(blueprint.title) + "-" + (index + 1);
  const competitionScore = blueprint.level === "Low" ? 28 + (index % 16) : blueprint.level === "Medium" ? 48 + (index % 18) : 70 + (index % 18);
  return { slug, title: blueprint.title, category, subcategory: blueprint.subcategory,
    summary: blueprint.title + " is a focused mobile product for " + blueprint.audience + ". Its wedge is " + blueprint.angle + ".",
    targetAudience: blueprint.audience, problem: "Users in this segment rely on generic tools, manual notes, or fragmented advice. That creates friction around " + blueprint.angle + ".",
    solution: "Build a Flutter-first workflow that makes the core action possible in under two minutes, keeps essential data available offline, and produces a useful export or shareable result.",
    uniqueValue: "The advantage is a guided workflow for " + blueprint.audience + " with language, defaults, and metrics generic products do not prioritize.",
    monetizationModel: blueprint.model, competitionLevel: blueprint.level, competitionScore, revenuePotential: blueprint.revenue,
    mvpScope: "Onboarding, one primary workflow, local persistence, searchable history, reminders, export/share, and a simple paywall or ad-free upgrade.",
    implementationPlan: "Phase 1: Flutter shell with Riverpod and local persistence. Phase 2: core workflow, analytics, and accessibility. Phase 3: sync, paid tier, and store optimization after retention evidence.",
    validationPlan: "Interview 10 target users, publish a waitlist page, recruit 20 beta users from one niche community, and measure activation, weekly retention, and willingness to pay.",
    risks: "Distribution may be harder than development; generic scope, privacy expectations, and premature monetization are the main risks.", tags: [...blueprint.tags, category.toLowerCase()],
    competitors: explicitCompetitors[slug] || [],
  };
}
const groups: [IdeaCategory, Blueprint[]][] = [
__GROUPS__
];
export const seedIdeas: SeedIdea[] = groups.flatMap(([category, items]) => items.map((item, index) => makeIdea(category, item, index)));
if (seedIdeas.length !== 200) throw new Error("Expected 200 ideas, got " + seedIdeas.length);
if (seedIdeas.some(idea => idea.competitors.length !== 3)) throw new Error("Every seeded idea must have exactly three competitors");
export const seedSummary = { ideas: seedIdeas.length, competitors: seedIdeas.reduce((sum, idea) => sum + idea.competitors.length, 0), categories: { Tools: 40, Health: 40, Education: 40, AI: 40, Games: 40 } } as const;
export const seedDataVersion = "ideas-200-v2-explicit-competitors" as const;
export type SeedDataVersion = typeof seedDataVersion;
export default seedIdeas;

// These are opportunity hypotheses and public product-positioning notes, not user-generated testimonials.
`;
await writeFile(new URL("../server/seedData.ts", import.meta.url), output.replace("__GROUPS__", groups), "utf8");
console.log("Rebuilt seed source from explicit competitor catalog.");
