import "dotenv/config";
import cors from "cors";
import express from "express";

import { adminRoutes } from "./routes/admin.routes";
import { aiRoutes } from "./routes/ai.routes";
import { citizenRoutes } from "./routes/citizen.routes";
import { merchantRoutes } from "./routes/merchant.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Backend is running");
});

app.use("/api", citizenRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

app.listen(3001, () => {
  console.log("Backend running at http://localhost:3001");
});
