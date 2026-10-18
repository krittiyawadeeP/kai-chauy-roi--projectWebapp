import { Router } from "express";

import { badRequest, notFound, sendJson } from "../lib/http";
import { prisma } from "../lib/prisma";
import { getCurrentPolicy } from "../policy/policy";

export const grantRoutes = Router();

// --- Grant allocation: assign budget to a citizen ---
grantRoutes.post("/", async (req, res) => {
  const { Citizen_ID, Grant_Name } = req.body;
  const policy = await getCurrentPolicy();
  const Total_Grant_Amount = Number(policy.Grant_Amount);

  if (!Citizen_ID || !Total_Grant_Amount) {
    return badRequest(res, "Citizen_ID and Total_Grant_Amount are required");
  }

  const user = await prisma.users.findUnique({ where: { Citizen_ID } });
  if (!user) {
    return notFound(res, "User not found");
  }

  const grant = await prisma.user_grants.create({
    data: {
      User_ID: user.User_ID,
      Grant_Name: Grant_Name ?? "โครงการไทยช่วยไทย",
      Total_Grant_Amount,
      Remaining_Amount: Total_Grant_Amount,
      Status: "ACTIVE",
    },
  });

  sendJson(res, grant, 201);
});

// --- List all grants (with user info) ---
grantRoutes.get("/", async (_req, res) => {
  const grants = await prisma.user_grants.findMany({
    include: { users: { select: { Citizen_ID: true, Phone: true } } },
    orderBy: { Granted_At: "desc" },
    take: 100,
  });
  sendJson(res, grants);
});
