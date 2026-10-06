// server/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "../src/generated/prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/api/users", async (_req, res) => {
  const users = await prisma.users.findMany({
    take: 10,
  });

  res.json(users);
});

app.listen(3001, () => {
  console.log("Backend running at http://localhost:3001");
});