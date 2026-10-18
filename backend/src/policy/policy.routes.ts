import { Router } from "express";

import { badRequest, sendJson } from "../lib/http";
import { prisma } from "../lib/prisma";
import { getCurrentPolicy, currentPolicyOrder, validatePolicy } from "./policy";

export const policyRoutes = Router();
export const publicPolicyRoutes = Router();

publicPolicyRoutes.get('/', async (_req, res) => {
  const policy = await getCurrentPolicy();
  sendJson(res, { Gov_Pay_Ratio: policy.Gov_Pay_Ratio, User_Pay_Ratio: policy.User_Pay_Ratio, Grant_Amount: policy.Grant_Amount });
});

// --- Grant Policy: get current (latest) rate ---
policyRoutes.get("/", async (_req, res) => {
  sendJson(res, await getCurrentPolicy());
});

// --- Grant Policy: full history (audit log) ---
policyRoutes.get("/history", async (_req, res) => {
  const history = await prisma.grant_policy.findMany({
    orderBy: currentPolicyOrder,
    include: { users: { select: { Citizen_ID: true } } },
    take: 50,
  });
  sendJson(res, history);
});

// --- Grant Policy: set new rate ---
policyRoutes.post("/", async (req, res) => {
  const { Gov_Pay_Ratio, Grant_Amount, Note } = req.body;
  const adminReq = req as import("../lib/auth").AuthRequest;

  if (!adminReq.user) return sendJson(res, { message: "Unauthorized" }, 401);

  const validationError = validatePolicy(req.body);
  if (validationError) return badRequest(res, validationError);
  const govRatio = Gov_Pay_Ratio;

  const policy = await prisma.grant_policy.create({
    data: {
      Gov_Pay_Ratio: govRatio,
      User_Pay_Ratio: parseFloat((1 - govRatio).toFixed(4)),
      Grant_Amount: Grant_Amount ?? 1000.00,
      Created_By: adminReq.user.userId,
      Note: Note ?? null,
    },
    include: { users: { select: { Citizen_ID: true } } },
  });

  sendJson(res, policy, 201);
});
