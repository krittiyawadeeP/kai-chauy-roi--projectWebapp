import type { Response } from "express";

export function sendJson(res: Response, data: unknown, status = 200) {
  const body = JSON.stringify(data, (_key, value) => {
    if (_key === "Password") {
      return undefined;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    return value;
  });

  res.status(status).type("application/json").send(body);
}

export function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function badRequest(res: Response, message: string) {
  return sendJson(res, { message }, 400);
}

export function notFound(res: Response, message = "Not found") {
  return sendJson(res, { message }, 404);
}
