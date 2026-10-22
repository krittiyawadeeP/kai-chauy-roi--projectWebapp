import type { Response } from "express";
import { merchantCategories } from "./merchant-category";

export function sendJson(res: Response, data: unknown, status = 200) {
  const body = JSON.stringify(data, (_key, value) => {
    if (_key === "Password" || _key === "Pin_Hash") {
      return undefined;
    }

    if (_key === "Category" && typeof value === "string") {
      return Object.entries(merchantCategories).find(([, category]) => category === value)?.[0] ?? value;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    return value;
  });

  res.status(status).type("application/json").send(body);
}

export function toNumber(value: unknown) {
  if (value === undefined || value === null) return null;
  const str = Array.isArray(value) ? value[0] : value;
  const numberValue = Number(str);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function badRequest(res: Response, message: string) {
  return sendJson(res, { message }, 400);
}

export function notFound(res: Response, message = "Not found") {
  return sendJson(res, { message }, 404);
}
