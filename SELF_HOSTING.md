# App Idea Hub self-hosting

## Requirements

Use a VPS with Docker Engine and Docker Compose v2. The application container serves the built Vite frontend and the Node/Express API on port 3000. MySQL is included as a persistent service with a named volume.

## First run

Create a local `.env` file from the variable list below. Do not commit it.

```dotenv
APP_PORT=3000
VITE_APP_TITLE=App Idea Hub
MYSQL_DATABASE=app_idea_hub
MYSQL_USER=app
MYSQL_PASSWORD=choose-a-strong-password
MYSQL_ROOT_PASSWORD=choose-a-different-root-password
JWT_SECRET=generate-a-long-random-value
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
OAUTH_SERVER_URL=
OWNER_OPEN_ID=
OWNER_NAME=App Idea Hub owner
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

Build and start the stack:

```bash
docker compose build --no-cache
docker compose up -d
```

The first startup creates the schema from the committed Drizzle migrations when the database is ready. Open `http://YOUR_VPS_IP:3000`, or put a reverse proxy such as Caddy or Nginx in front of the service and terminate TLS there.

## Updating

Pull the new source, rebuild the app image, and restart only the app service when the database schema is unchanged:

```bash
docker compose build app
docker compose up -d app
```

For schema changes, keep the new migration under `drizzle/`, back up MySQL, then restart the stack so the migration can be applied using the project’s migration command. Never remove the `mysql_data` volume during an update.

## Authentication and AI

The template uses Manus OAuth. A standalone VPS deployment needs valid OAuth configuration for `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, and `OWNER_NAME`; otherwise the protected dashboard remains unavailable. The application does not ship an OpenRouter key. Each authenticated user enters their own key in Settings, selects a model from the live OpenRouter catalog, and the server routes analysis and chat calls without returning the full key to the browser.

## Operational notes

The scraper uses public store listing clients and may receive partial results when a store blocks review endpoints or when regional data is unavailable. The database stores the normalized metadata, source screenshot URLs, and review excerpts. Re-scraping the same store app for the same user replaces its child screenshot and review rows instead of duplicating them.

Back up the database before upgrades:

```bash
docker compose exec db sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > app-idea-hub-backup.sql
```

Do not expose MySQL directly to the public internet. Put the app behind HTTPS, use a strong `JWT_SECRET`, rotate database credentials, and restrict VPS firewall rules to the ports you need.
