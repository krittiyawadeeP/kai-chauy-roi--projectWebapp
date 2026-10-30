# Deploy Frontend + Backend + MySQL (existing external AI)

## Before starting

Install Docker with Linux containers. Run commands from the project root.
Both Dockerfiles use the project root as their build context to include shared/.
For standalone builds use docker build -f frontend/Dockerfile . or docker build -f backend/Dockerfile .
The SQL dump is imported automatically into a NEW mysql-data volume.
Existing volumes are never re-imported. Keep the dump private: it contains application data.
Do not run Prisma migrate reset, db push, seed, or migrate deploy as part of this restore.

1. If .env.docker.local does not exist, copy .env.docker.example to it.
2. Set unique MYSQL_ROOT_PASSWORD and MYSQL_PASSWORD. Use letters/numbers for MYSQL_PASSWORD
   because Compose embeds it in the Prisma connection URL.
3. Set OLLAMA_BASE_URL to the existing AI server URL, without /api/chat.
   Set OLLAMA_MODEL to the model already installed there, and OLLAMA_API_KEY if required.
   localhost inside Backend refers to Backend, not the external AI server.
4. Set FRONTEND_ORIGIN to the public website origin when deploying remotely.
   Keep VITE_API_BASE_URL=/api: Nginx forwards requests to Backend.

## Start

PowerShell or Linux shell:

```sh
docker compose --env-file .env.docker.local config --quiet
docker compose --env-file .env.docker.local up -d --build
docker compose --env-file .env.docker.local ps
docker compose --env-file .env.docker.local logs --tail=100 mysql backend
```

The default deployment starts mysql, backend, frontend, phpmyadmin. It does NOT start Ollama.
If AI is running in this same Compose project already, leave that container running:
do not use --remove-orphans, down, or recreate ollama during this deployment.
MySQL imports the original dump using root, including its GTID metadata.
Backend waits until MySQL completes initialization; Frontend waits for Backend.

Open http://localhost:4000 (or http://SERVER_IP:4000).
Backend and Swagger are available on the Docker host at http://localhost:4001/api-docs.
MySQL has no published host port.
phpMyAdmin is available only on the Docker host at http://localhost:8080.
Log in as app with MYSQL_PASSWORD from .env.docker.local.
To add it to an already running deployment:

```sh
docker compose --env-file .env.docker.local up -d phpmyadmin
```

For public HTTPS, point your domain/reverse proxy to port 4000 and configure TLS there.
The actual domain, TLS, firewall and hosting server must be configured before public release.
Use one Backend instance because its mission scheduler runs inside the process.

## Verify imported database

```sh
docker compose --env-file .env.docker.local exec mysql mysql -uapp -p thai_chuay_thai_please -e "SHOW TABLES;"
```

Enter MYSQL_PASSWORD when prompted. Verify login and existing merchants/stamps in the UI.

Check AI connectivity from the Backend container (does not print API keys):

```sh
docker compose --env-file .env.docker.local exec backend node --input-type=module -e "const r=await fetch(process.env.OLLAMA_BASE_URL.replace(/\/$/,'')+'/api/tags',{headers:process.env.OLLAMA_API_KEY?{Authorization:'Bearer '+process.env.OLLAMA_API_KEY}:{},signal:AbortSignal.timeout(15000)}); console.log('AI status:',r.status); if(!r.ok)process.exit(1);const d=await r.json();console.log('Models:',d.models?.map(m=>m.name));"
```

If import fails, inspect mysql logs first. Do not start Backend against a partial restore.
The SQL dump includes schema and Prisma migration history; do not reapply old migrations blindly.

## Updates and stopping

```sh
docker compose --env-file .env.docker.local up -d --build backend frontend
docker compose --env-file .env.docker.local down
```

Data persists across restart/down. Never use down -v unless deliberately deleting all database data.
Back up the live database before updates; the original dump does not include new transactions.
Changing MYSQL_PASSWORD in the env file does not change a password in an existing MySQL volume.

## Optional local AI

Only when intentionally replacing the external AI: set OLLAMA_BASE_URL=http://ollama:11434,
then run with --profile local-ai and pull the selected model. External AI requires no local pull.
