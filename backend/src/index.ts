import "dotenv/config";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { apiRouter } from "./routes";
import { swaggerSpec } from "./swagger";
import { startDailyMissionScheduler } from "./lib/daily-mission-job";

dotenv.config({ path: ".env.local" });

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Backend is running");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", apiRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  startDailyMissionScheduler();
});
