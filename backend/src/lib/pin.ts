import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function validPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 64).toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || !/^[0-9a-f]{128}$/.test(hash)) return false;
  return timingSafeEqual(scryptSync(pin, salt, 64), Buffer.from(hash, "hex"));
}
