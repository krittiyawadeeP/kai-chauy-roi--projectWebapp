import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { sendJson } from "./http";
import { prisma } from "./prisma";

type Session = {
  userId: number;
  role: string;
};

const sessions = new Map<string, Session>();

export type AuthRequest = Request & {
  user?: Session;
};

export function createSession(userId: number, role: string) {
  const token = crypto.randomUUID();
  sessions.set(token, { userId, role });
  return token;
}

export function destroySession(token: string) {
  sessions.delete(token);
}

export function revokeUserSessions(userId: number) {
  for (const [token, session] of sessions) if (session.userId === userId) sessions.delete(token);
}

export function getBearerToken(req: Request) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);

  if (!token) {
    return sendJson(res, { message: "Missing Bearer token" }, 401);
  }

  const session = sessions.get(token);

  if (!session) {
    return sendJson(res, { message: "Invalid or expired token" }, 401);
  }

  const account = await prisma.users.findUnique({ where: { User_ID: session.userId }, select: { Is_Suspended: true } });
  if (!account) {
    revokeUserSessions(session.userId);
    return sendJson(res, { message: "Invalid or expired token" }, 401);
  }
  if (account.Is_Suspended) {
    revokeUserSessions(session.userId);
    return sendJson(res, { code: "ACCOUNT_SUSPENDED", account: "SELF", message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ" }, 403);
  }

  req.user = session;
  next();
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => undefined);
  if (!req.user) return;
  if (req.user.role !== "ADMIN") return sendJson(res, { message: "Admin permission required" }, 403);
  next();
}

export async function requireMerchant(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  await requireAuth(req, res, () => undefined);
  if (!req.user) return;

  const merchant = await prisma.merchants.findFirst({
    where: {
      User_ID: req.user.userId,
    },
  });

  if (!merchant) {
    return sendJson(res, { message: "Merchant profile required" }, 403);
  }

  next();
}
