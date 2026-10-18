import { Router } from "express";
import { adminRoutes } from "./admin.routes";
import { aiRoutes } from "./ai.routes";
import { citizenRoutes } from "./citizen.routes";
import { merchantRoutes } from "./merchant.routes";
import { publicPolicyRoutes } from "../policy/policy.routes";

export const apiRouter = Router();

apiRouter.use("/merchants", merchantRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/ai", aiRoutes);
apiRouter.use("/policy", publicPolicyRoutes);
apiRouter.use("/", citizenRoutes);

export { adminRoutes, aiRoutes, citizenRoutes, merchantRoutes };
