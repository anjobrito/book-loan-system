import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_HASH_SEPARATOR = "$";
const PASSWORD_HASH_KEY_LENGTH = 64;

export function isPasswordHash(password: string): boolean {
  return password.startsWith(`${PASSWORD_HASH_PREFIX}${PASSWORD_HASH_SEPARATOR}`);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH).toString(
    "hex"
  );

  return [PASSWORD_HASH_PREFIX, salt, hash].join(PASSWORD_HASH_SEPARATOR);
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  if (!isPasswordHash(storedPassword)) {
    return password === storedPassword;
  }

  const parts = storedPassword.split(PASSWORD_HASH_SEPARATOR);

  if (parts.length !== 3) {
    return false;
  }

  const [, salt, storedHash] = parts;
  const passwordHash = scryptSync(
    password,
    salt,
    PASSWORD_HASH_KEY_LENGTH
  ).toString("hex");

  const storedHashBuffer = Buffer.from(storedHash, "hex");
  const passwordHashBuffer = Buffer.from(passwordHash, "hex");

  if (storedHashBuffer.length !== passwordHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedHashBuffer, passwordHashBuffer);
}
