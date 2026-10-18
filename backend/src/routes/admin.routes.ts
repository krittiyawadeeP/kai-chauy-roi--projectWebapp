import { Router } from "express";

import { requireAdmin } from "../lib/auth";
import { badRequest, notFound, sendJson, toNumber } from "../lib/http";
import { prisma } from "../lib/prisma";
import { dashboardRoutes } from "../dashboard/dashboard.routes";
import { grantRoutes } from "../grants/grants.routes";
import { policyRoutes } from "../policy/policy.routes";

export const adminRoutes = Router();

adminRoutes.use(requireAdmin);
adminRoutes.use("/dashboard", dashboardRoutes);
adminRoutes.use("/grants", grantRoutes);
adminRoutes.use("/policy", policyRoutes);

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
