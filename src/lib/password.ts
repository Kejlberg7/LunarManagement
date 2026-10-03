import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_OPTIONS = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DUMMY_SALT = Buffer.alloc(SALT_BYTES, 23);

export function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES);
  const key = scryptSync(password, salt, KEY_BYTES, SCRYPT_OPTIONS);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  const parts = storedHash?.split("$");
  if (!parts || parts.length !== 3 || parts[0] !== "scrypt") {
    const dummyKey = scryptSync(password, DUMMY_SALT, KEY_BYTES, SCRYPT_OPTIONS);
    timingSafeEqual(dummyKey, Buffer.alloc(KEY_BYTES));
    return false;
  }

  try {
    const salt = Buffer.from(parts[1], "base64url");
    const expected = Buffer.from(parts[2], "base64url");
    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
    const actual = scryptSync(password, salt, KEY_BYTES, SCRYPT_OPTIONS);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
