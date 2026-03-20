import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cacheService } from "./cacheService";

const BLACKLIST_PREFIX = "jwt:blacklist:";
const FALLBACK_TTL_SECONDS = 24 * 60 * 60;

type DecodedToken = {
  exp?: number;
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getTokenTtlSeconds(token: string): number {
  const decoded = jwt.decode(token) as DecodedToken | null;
  if (!decoded?.exp) return FALLBACK_TTL_SECONDS;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttl = decoded.exp - nowSeconds;
  return ttl > 0 ? ttl : 60;
}

export async function blacklistToken(token: string): Promise<void> {
  if (!token) return;

  const key = `${BLACKLIST_PREFIX}${hashToken(token)}`;
  const ttl = getTokenTtlSeconds(token);
  await cacheService.set(key, { blacklisted: true }, ttl);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!token) return false;

  const key = `${BLACKLIST_PREFIX}${hashToken(token)}`;
  const value = await cacheService.get<{ blacklisted: boolean }>(key);
  return Boolean(value?.blacklisted);
}
