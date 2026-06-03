import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const PASSWORD_HASH_PREFIX = 'pbkdf2_sha256';
const PASSWORD_HASH_ITERATIONS = 210000;
const PASSWORD_HASH_KEY_LENGTH = 32;
const PASSWORD_HASH_DIGEST = 'sha256';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, PASSWORD_HASH_KEY_LENGTH, PASSWORD_HASH_DIGEST).toString('base64url');
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

export function isPasswordHash(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(`${PASSWORD_HASH_PREFIX}$`);
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  if (!isPasswordHash(storedPassword)) {
    return password === storedPassword;
  }

  const [, iterationsText, salt, expectedHash] = storedPassword.split('$');
  const iterations = Number(iterationsText);

  if (!Number.isInteger(iterations) || iterations <= 0 || !salt || !expectedHash) {
    return false;
  }

  const computedHash = pbkdf2Sync(password, salt, iterations, PASSWORD_HASH_KEY_LENGTH, PASSWORD_HASH_DIGEST);
  const expectedHashBuffer = Buffer.from(expectedHash, 'base64url');

  return expectedHashBuffer.length === computedHash.length && timingSafeEqual(expectedHashBuffer, computedHash);
}
