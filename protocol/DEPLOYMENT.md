# Deploy Frontend + Backend + MySQL + Ollama

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
3. Set OLLAMA_MODEL (default qwen3:4b). Ollama is included in this Compose stack.
   Backend always uses http://ollama:11434; old OLLAMA_BASE_URL and OLLAMA_API_KEY
   entries in .env.docker.local are ignored by Compose and can be removed.
   Set OLLAMA_TIMEOUT_MS=300000 for a longer CPU inference timeout.
   The server needs enough available RAM/disk for the model and the web/database services.
   The default configuration uses CPU, so inference can take longer than on a GPU.
4. Set FRONTEND_ORIGIN to the public website origin when deploying remotely.
   Keep VITE_API_BASE_URL=/api: Nginx forwards requests to Backend.

## Start

PowerShell or Linux shell:

```sh
docker compose --env-file .env.docker.local config --quiet
docker compose --env-file .env.docker.local up -d --build
docker compose --env-file .env.docker.local ps
docker compose --env-file .env.docker.local logs --tail=100 mysql ollama ollama-init backend
```

The default deployment starts mysql, ollama, backend, frontend and phpmyadmin.
The temporary ollama-init service checks whether the selected model exists and downloads
it if missing. It should finish with exit code 0; it is not a long-running service.
Backend waits for MySQL to be healthy AND for model initialization to succeed.
Frontend waits for Backend. First startup needs internet access to download the image/model
and can take several minutes. Models persist in ollama-data across restarts.
If initialization fails, inspect ollama-init logs and rerun the up command after fixing the cause.
MySQL imports the original dump using root, including its GTID metadata.

For an existing deployment, keep the same project directory/name and existing database
passwords so Compose reuses mysql-data. Run up directly; do not delete volumes.
An older standalone container named ollama-ai is separate from this stack. This configuration
does not stop or delete it, and does not reuse its model files. After verifying the new stack,
you may stop that old container if no other application needs it.

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

Check that the model was downloaded:

```sh
docker compose --env-file .env.docker.local exec ollama ollama list
```

Check AI connectivity from the Backend container:

```sh
docker compose --env-file .env.docker.local exec backend node --input-type=module -e "const r=await fetch('http://ollama:11434/api/tags',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('AI status: '+r.status);console.log(await r.json());"
```

Then use the Admin reanalysis action to exercise the actual weekly AI slot selection.
Set OLLAMA_TIMEOUT_MS=300000 in .env.docker.local (five minutes per AI request).
Nginx waits up to 660 seconds because weekly analysis can call AI twice sequentially.
If requests still time out, inspect `docker compose --env-file .env.docker.local logs --tail=100 ollama backend`
and `docker compose --env-file .env.docker.local exec ollama ollama ps` during analysis.
Existing weekly missions keep their saved times until a new analysis creates replacements.
Ollama is available on the Docker host at http://127.0.0.1:11435.
Backend still uses http://ollama:11434 through the Compose network.
The Ollama service requests GPU access with gpus: all for this machine's NVIDIA GPU.
After changing GPU configuration, recreate Ollama with:

```sh
docker compose --env-file .env.docker.local up -d --no-deps --force-recreate ollama
docker compose --env-file .env.docker.local exec ollama nvidia-smi
```

During analysis, run `docker compose --env-file .env.docker.local exec ollama ollama ps`
to confirm GPU use. Deployment on a machine without compatible GPU support requires removing gpus: all.
If the old standalone ollama-ai container still binds port 11435, stop it before starting
this stack with `docker stop ollama-ai`. Stopping it preserves its container and model data.

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
