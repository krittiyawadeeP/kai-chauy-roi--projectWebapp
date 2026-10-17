import { Router } from "express";
import { adminRoutes } from "./admin.routes";
import { aiRoutes } from "./ai.routes";
import { citizenRoutes } from "./citizen.routes";
import { merchantRoutes } from "./merchant.routes";

export const apiRouter = Router();

apiRouter.use("/merchants", merchantRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/ai", aiRoutes);
apiRouter.use("/", citizenRoutes);

export { adminRoutes, aiRoutes, citizenRoutes, merchantRoutes };
