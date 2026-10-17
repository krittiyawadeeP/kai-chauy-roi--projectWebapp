import { Router } from "express";

import { requireAdmin } from "../lib/auth";
import { badRequest, notFound, sendJson, toNumber } from "../lib/http";
import { prisma } from "../lib/prisma";

export const adminRoutes = Router();

adminRoutes.use(requireAdmin);

adminRoutes.get("/ai/analysis", async (_req, res) => {
  const analysis = await prisma.ai_sales_analysis.findMany({
    include: {
      merchants: true,
    },
    orderBy: {
      Analyzed_At: "desc",
    },
  });

  sendJson(res, analysis);
});

adminRoutes.get("/merchants", async (_req, res) => {
  const merchants = await prisma.merchants.findMany({
    include: {
      districts: true,
      users: true,
      ai_sales_analysis: {
        orderBy: {
          Analyzed_At: "desc",
        },
        take: 1,
      },
    },
  });

  sendJson(res, merchants);
});

adminRoutes.post("/missions", async (req, res) => {
  const {
    Mission_Name,
    Description,
    Target_Merchant_ID,
    Max_Recipients,
    Start_DateTime,
    End_DateTime,
    Status,
  } = req.body;

  if (!Mission_Name || !Target_Merchant_ID || !Max_Recipients || !Start_DateTime || !End_DateTime) {
    return badRequest(
      res,
      "Mission_Name, Target_Merchant_ID, Max_Recipients, Start_DateTime, and End_DateTime are required",
    );
  }

  const mission = await prisma.missions.create({
    data: {
      Mission_Name,
      Description,
      Target_Merchant_ID,
      Max_Recipients,
      Start_DateTime: new Date(Start_DateTime),
      End_DateTime: new Date(End_DateTime),
      Status: Status ?? "ACTIVE",
    },
  });

  sendJson(res, mission, 201);
});

adminRoutes.get("/missions", async (_req, res) => {
  const missions = await prisma.missions.findMany({
    include: {
      merchants: true,
      user_stamps: true,
    },
    orderBy: {
      Start_DateTime: "desc",
    },
  });

  sendJson(res, missions);
});

adminRoutes.get("/missions/:missionId", async (req, res) => {
  const missionId = toNumber(req.params.missionId);

  if (!missionId) {
    return badRequest(res, "Invalid missionId");
  }

  const mission = await prisma.missions.findUnique({
    where: {
      Mission_ID: missionId,
    },
    include: {
      merchants: true,
      user_stamps: true,
    },
  });

  if (!mission) {
    return notFound(res, "Mission not found");
  }

  sendJson(res, mission);
});

adminRoutes.patch("/missions/:missionId", async (req, res) => {
  const missionId = toNumber(req.params.missionId);

  if (!missionId) {
    return badRequest(res, "Invalid missionId");
  }

  const {
    Mission_Name,
    Description,
    Target_Merchant_ID,
    Max_Recipients,
    Start_DateTime,
    End_DateTime,
    Status,
  } = req.body;

  const mission = await prisma.missions.update({
    where: {
      Mission_ID: missionId,
    },
    data: {
      Mission_Name,
      Description,
      Target_Merchant_ID,
      Max_Recipients,
      Start_DateTime: Start_DateTime ? new Date(Start_DateTime) : undefined,
      End_DateTime: End_DateTime ? new Date(End_DateTime) : undefined,
      Status,
    },
  });

  sendJson(res, mission);
});

adminRoutes.post("/stamps", async (req, res) => {
  const { Stamp_Name, District_ID } = req.body;

  if (!Stamp_Name || !District_ID) {
    return badRequest(res, "Stamp_Name and District_ID are required");
  }

  const stamp = await prisma.district_stamps.create({
    data: {
      Stamp_Name,
      District_ID,
    },
  });

  sendJson(res, stamp, 201);
});

adminRoutes.patch("/stamps/:stampId", async (req, res) => {
  const stampId = toNumber(req.params.stampId);

  if (!stampId) {
    return badRequest(res, "Invalid stampId");
  }

  const { Stamp_Name, District_ID } = req.body;

  const stamp = await prisma.district_stamps.update({
    where: {
      Stamp_ID: stampId,
    },
    data: {
      Stamp_Name,
      District_ID,
    },
  });

  sendJson(res, stamp);
});

adminRoutes.post("/rewards", async (req, res) => {
  const { Reward_Name, Reward_Type, Description, Required_Stamp_Count, Status } = req.body;

  if (!Reward_Name || Required_Stamp_Count === undefined) {
    return badRequest(res, "Reward_Name and Required_Stamp_Count are required");
  }

  const reward = await prisma.rewards.create({
    data: {
      Reward_Name,
      Reward_Type,
      Description,
      Required_Stamp_Count,
      Status: Status ?? "ACTIVE",
    },
  });

  sendJson(res, reward, 201);
});

adminRoutes.patch("/rewards/:rewardId", async (req, res) => {
  const rewardId = toNumber(req.params.rewardId);

  if (!rewardId) {
    return badRequest(res, "Invalid rewardId");
  }

  const { Reward_Name, Reward_Type, Description, Required_Stamp_Count, Status } = req.body;

  const reward = await prisma.rewards.update({
    where: {
      Reward_ID: rewardId,
    },
    data: {
      Reward_Name,
      Reward_Type,
      Description,
      Required_Stamp_Count,
      Status,
    },
  });

  sendJson(res, reward);
});

// --- Dashboard: System-wide income/expense overview ---
adminRoutes.get("/dashboard", async (_req, res) => {
  const [txAgg, grantsAgg, grants] = await Promise.all([
    prisma.sales_transactions.aggregate({
      _sum: { Total_Amount: true, Gov_Subsidized_Amount: true, User_Paid_Amount: true },
      _count: { Tx_ID: true },
    }),
    prisma.user_grants.aggregate({
      _sum: { Total_Grant_Amount: true, Remaining_Amount: true },
      _count: { Grant_ID: true },
    }),
    prisma.user_grants.findMany({ select: { Status: true, Total_Grant_Amount: true, Remaining_Amount: true } }),
  ]);

  const totalBudgetAllocated = Number(grantsAgg._sum.Total_Grant_Amount ?? 0);
  const totalBudgetRemaining = Number(grantsAgg._sum.Remaining_Amount ?? 0);
  const totalBudgetSpent = totalBudgetAllocated - totalBudgetRemaining;

  sendJson(res, {
    transactions: {
      count: txAgg._count.Tx_ID,
      totalRevenue: Number(txAgg._sum.Total_Amount ?? 0),
      govSubsidized: Number(txAgg._sum.Gov_Subsidized_Amount ?? 0),
      userPaid: Number(txAgg._sum.User_Paid_Amount ?? 0),
    },
    grants: {
      count: grantsAgg._count.Grant_ID,
      totalAllocated: totalBudgetAllocated,
      totalSpent: totalBudgetSpent,
      totalRemaining: totalBudgetRemaining,
      activeGrants: grants.filter(g => g.Status === 'ACTIVE').length,
    },
  });
});

// --- Grant allocation: assign budget to a citizen ---
adminRoutes.post("/grants", async (req, res) => {
  const { Citizen_ID, Grant_Name, Total_Grant_Amount } = req.body;

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
adminRoutes.get("/grants", async (_req, res) => {
  const grants = await prisma.user_grants.findMany({
    include: { users: { select: { Citizen_ID: true, Phone: true } } },
    orderBy: { Granted_At: "desc" },
    take: 100,
  });
  sendJson(res, grants);
});

// --- Grant Policy: get current (latest) rate ---
adminRoutes.get("/policy", async (_req, res) => {
  const policy = await prisma.grant_policy.findFirst({
    orderBy: { Effective_From: "desc" },
    include: { users: { select: { Citizen_ID: true } } },
  });
  // Co-payment is fixed by program policy, even if an older DB row has the former ratio.
  sendJson(res, {
    ...(policy ?? {
      Policy_ID: null,
      Grant_Amount: "1000.00",
      Note: "ค่าเริ่มต้นของระบบ (ยังไม่มีการตั้งค่า)",
    }),
    Gov_Pay_Ratio: "0.6000",
    User_Pay_Ratio: "0.4000",
  });
});

// --- Grant Policy: full history (audit log) ---
adminRoutes.get("/policy/history", async (_req, res) => {
  const history = await prisma.grant_policy.findMany({
    orderBy: { Effective_From: "desc" },
    include: { users: { select: { Citizen_ID: true } } },
    take: 50,
  });
  sendJson(res, history);
});

// --- Grant Policy: set new rate ---
adminRoutes.post("/policy", async (req, res) => {
  const { Gov_Pay_Ratio, Grant_Amount, Note } = req.body;
  const adminReq = req as import("../lib/auth").AuthRequest;

  if (!adminReq.user) return sendJson(res, { message: "Unauthorized" }, 401);

  const govRatio = parseFloat(Gov_Pay_Ratio);
  if (govRatio !== 0.6) {
    return badRequest(res, "The co-payment ratio is fixed at 60% government and 40% citizen");
  }

  const policy = await prisma.grant_policy.create({
    data: {
      Gov_Pay_Ratio: 0.6,
      User_Pay_Ratio: 0.4,
      Grant_Amount: Grant_Amount ?? 1000.00,
      Created_By: adminReq.user.userId,
      Note: Note ?? null,
    },
  });

  sendJson(res, policy, 201);
});
