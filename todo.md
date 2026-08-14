# App Idea Hub TODO

- [x] Design database schema for ideas, competitors, scraper items, and openrouter settings
- [x] Seed database with 200 comprehensive app and game ideas with 3 competitors each
- [x] Implement backend tRPC routers for ideas filtering, search, and details
- [x] Implement AppScraper engine for Google Play and App Store links
- [x] Implement OpenRouter settings and AI analysis/chat integration
- [x] Build Main Dashboard with statistics and quick actions using shadcn/ui
- [x] Build Ideas Explorer page with search, filters, and categories
- [x] Build Idea Detail page with competitors, implementation plan, and AI chat
- [x] Build AppScraper tool interface and saved scraped apps view
- [x] Build OpenRouter settings page and model selector
- [x] Add Vitest tests for tRPC procedures and scraper
- [x] Create Dockerfile, docker-compose.yml, and deployment guide
- [x] Replace shared competitor templates with idea-specific competitor records for all 200 seeded ideas
- [x] Make AppScraper re-scrapes idempotent and surface review-fetch status
- [x] Render stored implementation plans and visible AI message history on idea pages
- [x] Show actual scraped screenshots and review excerpts in the saved listings UI
- [x] Add Vitest coverage for new ideas, scraper, and AI tRPC procedures plus scraper persistence replacement behavior
- [x] Generate explicit distinct competitor selections and details for every one of the 200 ideas
- [x] Add Vitest coverage for scraper listing plus AI settings and history procedures
- [x] Generate a concrete 600-row per-idea competitor catalog from the rotated selections and persist it as seed source data
- [x] Add Vitest coverage for AI analyzeIdea and dashboard bootstrap/stats procedures

# Platform Expansion TODO
- [x] Add database schema and tRPC router for batch import jobs and items
- [x] Build side-by-side idea and competitor comparison view
- [x] Build batch URL import workspace with background processing simulation and progress tracking
- [x] Implement Markdown and formatted PDF report export for ideas and competitor analyses
- [x] Add Vitest coverage for comparison, batch import, and export procedures
- [x] Implement server-side automatic batch progression for background imports
- [x] Add Vitest tests for Markdown and PDF report download endpoints
- [ ] Implement asynchronous background queueing for batch jobs with observable progress
- [ ] Add integration tests for Express report download routes
