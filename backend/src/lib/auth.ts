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

export function getBearerToken(req: Request) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req);

  if (!token) {
    return sendJson(res, { message: "Missing Bearer token" }, 401);
  }

  const session = sessions.get(token);

  if (!session) {
    return sendJson(res, { message: "Invalid or expired token" }, 401);
  }

  req.user = session;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== "ADMIN" && req.user?.role !== "GOVERNMENT") {
      return sendJson(res, { message: "Admin permission required" }, 403);
    }

    next();
  });
}

export async function requireMerchant(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  // Authenticate synchronously first. `requireAuth` invokes its callback
  // directly, so passing an async callback here would leave its rejection
  // outside Express's middleware chain.
  requireAuth(req, res, () => undefined);
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
