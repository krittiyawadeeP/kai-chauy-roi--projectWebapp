import { timingSafeEqual } from 'node:crypto';
import { hashPin, verifyPin } from './pin';

export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 6 && value.length <= 128 && value === value.trim();
}

export function hashPassword(password: string) {
  return `scrypt$${hashPin(password)}`;
}

export function verifyPassword(password: string, stored: string) {
  if (/^scrypt\$[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) return verifyPin(password, stored.slice(7));
  // Existing accounts keep working until their password is changed to the salted format.
  const actual = Buffer.from(password);
  const expected = Buffer.from(stored);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
