# App Idea Hub

**App Idea Hub** is a professional, full-stack personal platform engineered for solo Android and Flutter developers [1]. It provides a complete end-to-end workflow for discovering, validating, scraping, and developing mobile apps and games—from an initial catalog of 200 curated opportunities [1] to automated competitor monitoring [3], ASO optimization [4], and direct Flutter Blueprint export for Claude Code [5].

---

## Key Features

- **200 Curated App & Game Ideas**: Detailed product briefs, target audience analysis, monetization models, competition scores, and competitor matrices [1].
- **AppScraper**: Ingest single store URLs or batch lists from Google Play and Apple App Store, automatically capturing normalized metadata, ratings, version numbers, screenshots, and review excerpts [2].
- **Review Intelligence Miner**: AI-powered analysis of competitor reviews extracting recurring complaints, feature requests, and positive/negative sentiment ratios [3].
- **Opportunity Score Map & Decision Engine**: Weighted scoring across market demand, competition, monetization feasibility, and personal maker fit, returning actionable build recommendations [6].
- **ASO Keyword Explorer**: Search and analyze keyword difficulties, store signals, and generate AI marketing description drafts with pre-save archiving, editing, and TXT/PDF exports [4].
- **Claude Code Flutter Blueprint Exporter**: Generate production-ready Flutter MVP architectures (feature-first + Riverpod, repository patterns, offline-first data layers) packaged as an instant ZIP download for Claude Code [5].
- **Founder Cockpit**: A 14-tool intelligence suite including monetization lab scenario modeling, validation experiment tracking, build scope estimation, pre-release QA test case generation, launch checklists, evidence vaults, idea portfolio boards, and post-launch learning logs [6].
- **Strict Black AMOLED Theme**: Designed exclusively with pure black backgrounds (`#000000`), deep charcoal surfaces (`#0b0f17`), electric blue accents (`#3b82f6`), and flat monochrome/blue icons [8].

---

## Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, shadcn/ui components, Recharts, Streamdown, wouter, tRPC client [7].
- **Backend**: Node.js, Express 4, tRPC 11, Drizzle ORM, MySQL/TiDB [7].
- **AI & Integrations**: OpenRouter integration supporting multi-model selection and contextual prompt execution [11].
- **Testing & Quality**: Vitest unit and UI test suite (68 passing tests), strict palette guardrails, and automated Drizzle migrations [7] [8].

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 22+ and pnpm
- MySQL / TiDB instance

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/h93lab/app-idea-hub.git
   cd app-idea-hub
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Configure environment variables in a local `.env` file:
   ```dotenv
   DATABASE_URL=mysql://user:password@localhost:3306/app_idea_hub
   JWT_SECRET=your-random-secret
   PORT=3000
   ```
4. Run database migrations and start the dev server:
   ```bash
   pnpm drizzle-kit migrate
   pnpm dev
   ```

---

## Self-Hosting with Docker

App Idea Hub ships with a production-ready Dockerfile and Docker Compose stack [16].

1. Create a `.env` file from the template in `SELF_HOSTING.md` [16].
2. Build and start the services:
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```
3. The entrypoint script automatically executes pending Drizzle migrations before starting the web server on port 3000 [16].

---

## Testing

Run the automated Vitest test suite:
```bash
pnpm test
```

Run TypeScript type checks:
```bash
pnpm check
```

---

## License

Personal and private founder project. All rights reserved.
