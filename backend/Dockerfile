FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend

# tsx is a dev dependency but is also used by npm start.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --include=dev
COPY backend/ ./
COPY shared/ /app/shared/
# Generate Linux Prisma binaries without copying or connecting to a real database.
RUN DATABASE_URL=mysql://build:build@localhost:3306/build npm run prisma:generate \
    && npm run build

ENV NODE_ENV=production
ENV PORT=4001
USER node
EXPOSE 4001
CMD ["npm", "start"]
