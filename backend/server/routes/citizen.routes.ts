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

export const citizenRoutes = Router();

citizenRoutes.post("/user", async (req, res) => {
  const { Citizen_ID, Phone, Password, Province_ID, Role } = req.body;

  if (!Citizen_ID || !Phone || !Password) {
    return badRequest(res, "Citizen_ID, Phone, and Password are required");
  }

  const user = await prisma.users.create({
    data: {
      Citizen_ID,
      Phone,
      Password,
      Province_ID,
      Role: Role ?? "USER",
      wallets: {
        create: {
          Balance: 0,
          Status: "ACTIVE",
        },
      },
      user_grants: {
        create: {
          Grant_Name: "Default government subsidy",
          Total_Grant_Amount: 1000,
          Remaining_Amount: 1000,
          Gov_Pay_Ratio: 0.6,
          User_Pay_Ratio: 0.4,
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

  const { Phone, Province_ID } = req.body;

  const user = await prisma.users.update({
    where: {
      User_ID: userId,
    },
    data: {
      Phone,
      Province_ID,
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
  const { Stamp_ID, Qualifying_Amount } = req.body;

  if (!missionId) {
    return badRequest(res, "Invalid missionId");
  }

  if (!Stamp_ID) {
    return badRequest(res, "Stamp_ID is required");
  }

  const userStamp = await prisma.user_stamps.create({
    data: {
      User_ID: req.user!.userId,
      Stamp_ID,
      Mission_ID: missionId,
      Earn_Source: "MISSION",
      Qualifying_Amount,
      Earned_At: new Date(),
    },
    include: {
      district_stamps: true,
      missions: true,
    },
  });

  sendJson(res, userStamp, 201);
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
  });

  sendJson(res, rewards);
});

citizenRoutes.post("/stamp-redemptions", requireAuth, async (req: AuthRequest, res) => {
  const { Reward_ID, Stamp_ID, Quantity } = req.body;

  if (!Reward_ID || !Stamp_ID || !Quantity) {
    return badRequest(res, "Reward_ID, Stamp_ID, and Quantity are required");
  }

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
