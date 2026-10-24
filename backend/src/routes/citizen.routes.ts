import { Router } from "express";

import {
  createSession,
  destroySession,
  getBearerToken,
  requireAuth,
  type AuthRequest,
} from "../lib/auth";
import { badRequest, notFound, sendJson, toNumber } from "../lib/http";
import { prisma } from "../lib/prisma";
import { hashPin, validPin } from "../lib/pin";
import { getCurrentPolicy } from '../policy/policy';
import { awardMissionStamp } from '../lib/mission-stamp';
import { collectedDistrictCount, requiredDistrictStamps } from '../lib/otop-reward';

export const citizenRoutes = Router();

citizenRoutes.get("/provinces", async (_req, res) => {
  const provinces = await prisma.provinces.findMany({
    orderBy: { Prov_Name: "asc" },
  });

  sendJson(res, provinces);
});

citizenRoutes.get("/districts", async (req, res) => {
  const provinceId = toNumber(req.query.prov_id);
  if (!provinceId || provinceId <= 0) {
    return badRequest(res, "prov_id must be a positive integer");
  }

  const districts = await prisma.districts.findMany({
    where: { Prov_ID: provinceId },
    orderBy: { Dist_Name: "asc" },
  });

  sendJson(res, districts);
});

citizenRoutes.post("/user", async (req, res) => {
  const { Citizen_ID, Phone, Password, Province_ID, Name, Pin } = req.body;

  if (!Citizen_ID || !Phone || !Password) {
    return badRequest(res, "Citizen_ID, Phone, and Password are required");
  }
  if (Name !== undefined && (typeof Name !== "string" || !Name.trim() || Name.length > 200)) return badRequest(res, "Name must be 1-200 characters");
  if (Pin !== undefined && !validPin(Pin)) return badRequest(res, "Pin must contain exactly 6 digits");

  const policy = await getCurrentPolicy();
  const user = await prisma.users.create({
    data: {
      Citizen_ID,
      Phone,
      Password,
      Name: Name?.trim(),
      Pin_Hash: Pin === undefined ? undefined : hashPin(Pin),
      Province_ID,
      Role: "USER",
      wallets: {
        create: {
          Balance: 0,
          Status: "ACTIVE",
        },
      },
      user_grants: {
        create: {
          Grant_Name: "Default government subsidy",
          Total_Grant_Amount: Number(policy.Grant_Amount),
          Remaining_Amount: Number(policy.Grant_Amount),
          Status: "ACTIVE",
        },
      },
    },
    include: {
      wallets: true,
      user_grants: true,
    },
  });

  sendJson(res, user, 201);
});

citizenRoutes.post("/login", async (req, res) => {
  const { Phone, Citizen_ID, Password } = req.body;

  if ((!Phone && !Citizen_ID) || !Password) {
    return badRequest(res, "Phone or Citizen_ID and Password are required");
  }

  const user = await prisma.users.findFirst({
    where: {
      OR: [{ Phone: Phone ?? "" }, { Citizen_ID: Citizen_ID ?? "" }],
    },
  });

  if (!user || user.Password !== Password) {
    return sendJson(res, { message: "Invalid login credentials" }, 401);
  }

  const token = createSession(user.User_ID, user.Role);

  sendJson(res, {
    token,
    user,
  });
});

citizenRoutes.post("/logout", requireAuth, (req: AuthRequest, res) => {
  const token = getBearerToken(req);

  if (token) {
    destroySession(token);
  }

  sendJson(res, { message: "Logged out" });
});

citizenRoutes.get("/user/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.users.findUnique({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      provinces: true,
      wallets: true,
      user_grants: true,
    },
  });

  if (!user) {
    return notFound(res, "User not found");
  }

  sendJson(res, user);
});

citizenRoutes.get("/user/:userId", async (req, res) => {
  const userId = toNumber(req.params.userId);

  if (!userId) {
    return badRequest(res, "Invalid userId");
  }

  const user = await prisma.users.findUnique({
    where: {
      User_ID: userId,
    },
    include: {
      provinces: true,
      wallets: true,
    },
  });

  if (!user) {
    return notFound(res, "User not found");
  }

  sendJson(res, user);
});

citizenRoutes.patch("/user/:userId", requireAuth, async (req: AuthRequest, res) => {
  const userId = toNumber(req.params.userId);

  if (!userId) {
    return badRequest(res, "Invalid userId");
  }

  if (req.user!.userId !== userId && req.user!.role !== "ADMIN") {
    return sendJson(res, { message: "You can update only your own user profile" }, 403);
  }

  const { Phone, Province_ID, Name, Pin } = req.body;
  if (Name !== undefined && (typeof Name !== "string" || !Name.trim() || Name.length > 200)) return badRequest(res, "Name must be 1-200 characters");
  if (Pin !== undefined && !validPin(Pin)) return badRequest(res, "Pin must contain exactly 6 digits");

  const user = await prisma.users.update({
    where: {
      User_ID: userId,
    },
    data: {
      Phone,
      Province_ID,
      Name: Name?.trim(),
      Pin_Hash: Pin === undefined ? undefined : hashPin(Pin),
    },
  });

  sendJson(res, user);
});

citizenRoutes.patch("/user/:userId/password", requireAuth, async (req: AuthRequest, res) => {
  const userId = toNumber(req.params.userId);
  const { oldPassword, newPassword } = req.body;

  if (!userId) {
    return badRequest(res, "Invalid userId");
  }

  if (!oldPassword || !newPassword) {
    return badRequest(res, "oldPassword and newPassword are required");
  }

  if (req.user!.userId !== userId && req.user!.role !== "ADMIN") {
    return sendJson(res, { message: "You can change only your own password" }, 403);
  }

  const user = await prisma.users.findUnique({
    where: {
      User_ID: userId,
    },
  });

  if (!user) {
    return notFound(res, "User not found");
  }

  if (user.Password !== oldPassword) {
    return sendJson(res, { message: "Old password is incorrect" }, 401);
  }

  const updatedUser = await prisma.users.update({
    where: {
      User_ID: userId,
    },
    data: {
      Password: newPassword,
    },
  });

  sendJson(res, updatedUser);
});

citizenRoutes.get("/missions", async (_req, res) => {
  const missions = await prisma.missions.findMany({
    where: {
      Status: {
        in: ["ACTIVE", "active", "OPEN", "open"],
      },
    },
    include: {
      merchants: true,
    },
    orderBy: {
      Start_DateTime: "desc",
    },
  });

  sendJson(res, missions);
});

citizenRoutes.get("/missions/:missionId", async (req, res) => {
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

citizenRoutes.post("/missions/:missionId/complete", requireAuth, async (req: AuthRequest, res) => {
  const missionId = toNumber(req.params.missionId);
  const transactionId = toNumber(req.body.Tx_ID);

  if (!missionId || !Number.isSafeInteger(missionId) || missionId < 1 ||
      !transactionId || !Number.isSafeInteger(transactionId) || transactionId < 1) {
    return badRequest(res, "Valid missionId and Tx_ID are required");
  }
  const sale = await prisma.sales_transactions.findUnique({ where: { Tx_ID: BigInt(transactionId) } });
  if (!sale || sale.User_ID !== req.user!.userId) return notFound(res, 'Qualifying sale not found');
  const result = await prisma.$transaction(tx => awardMissionStamp(tx, missionId, sale), { isolationLevel: 'ReadCommitted' });
  if (!result) return badRequest(res, 'Sale does not meet the mission conditions or all places are taken');
  sendJson(res, result.stamp, result.created ? 201 : 200);
});

citizenRoutes.get("/users/me/stamps", requireAuth, async (req: AuthRequest, res) => {
  const stamps = await prisma.user_stamps.findMany({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      district_stamps: {
        include: {
          districts: true,
        },
      },
      missions: true,
    },
    orderBy: {
      Earned_At: "desc",
    },
  });

  sendJson(res, stamps);
});

citizenRoutes.get("/users/me/stamps/history", requireAuth, async (req: AuthRequest, res) => {
  const history = await prisma.user_stamps.findMany({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      district_stamps: true,
      missions: true,
      stamp_earn_transactions: {
        include: {
          sales_transactions: true,
        },
      },
    },
    orderBy: {
      Earned_At: "desc",
    },
  });

  sendJson(res, history);
});

citizenRoutes.get("/rewards", async (_req, res) => {
  const rewards = await prisma.rewards.findMany({
    where: {
      Status: {
        in: ["ACTIVE", "active", "AVAILABLE", "available"],
      },
    },
    include: { provinces: true },
  });

  sendJson(res, rewards);
});

citizenRoutes.post("/stamp-redemptions", requireAuth, async (req: AuthRequest, res) => {
  const { Reward_ID, Stamp_ID, Quantity } = req.body;
  const rewardId = Number(Reward_ID);
  if (!Number.isInteger(rewardId) || rewardId < 1) return badRequest(res, 'Valid Reward_ID is required');
  const reward = await prisma.rewards.findUnique({ where: { Reward_ID: rewardId } });
  if (!reward || !['ACTIVE', 'active', 'AVAILABLE', 'available'].includes(reward.Status)) return notFound(res, 'Active reward not found');

  if (reward.Reward_Type === 'OTOP_PRODUCT' && reward.Province_ID) {
    const userId = req.user!.userId;
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT User_ID FROM users WHERE User_ID = ${userId} FOR UPDATE`;
      if (await tx.stamp_redemptions.findFirst({ where: { User_ID: userId, Reward_ID: rewardId, Status: { in: ['REQUESTED', 'COMPLETED'] } } })) return { error: 'This reward has already been claimed' };
      const districtCount = await tx.districts.count({ where: { Prov_ID: reward.Province_ID! } });
      const stamps = await tx.user_stamps.findMany({
        where: { User_ID: userId },
        include: { district_stamps: { include: { districts: true } } },
      });
      const eligible = stamps.filter(stamp => stamp.district_stamps.districts.Prov_ID === reward.Province_ID);
      if (!districtCount || collectedDistrictCount(stamps, reward.Province_ID!) < requiredDistrictStamps(districtCount)) {
        return { error: `At least ${requiredDistrictStamps(districtCount)} different district stamps are required` };
      }
      return { redemption: await tx.stamp_redemptions.create({
        data: { User_ID: userId, Reward_ID: rewardId, Stamp_ID: eligible[0].Stamp_ID, Quantity: 1, Status: 'REQUESTED', Redeemed_At: new Date() },
        include: { rewards: true, district_stamps: true },
      }) };
    }, { isolationLevel: 'ReadCommitted' });
    if (result.error) return badRequest(res, result.error);
    return sendJson(res, result.redemption, 201);
  }

  if (!Stamp_ID || !Quantity) return badRequest(res, 'Stamp_ID and Quantity are required');

  const redemption = await prisma.stamp_redemptions.create({
    data: {
      User_ID: req.user!.userId,
      Reward_ID,
      Stamp_ID,
      Quantity,
      Status: "REQUESTED",
      Redeemed_At: new Date(),
    },
    include: {
      rewards: true,
      district_stamps: true,
    },
  });

  sendJson(res, redemption, 201);
});

citizenRoutes.get("/users/me/stamp-redemptions", requireAuth, async (req: AuthRequest, res) => {
  const redemptions = await prisma.stamp_redemptions.findMany({
    where: {
      User_ID: req.user!.userId,
    },
    include: {
      rewards: true,
      district_stamps: true,
    },
    orderBy: {
      Redeemed_At: "desc",
    },
  });

  sendJson(res, redemptions);
});
