import { randomBytes, createHash } from "node:crypto";

export function generateIntegrationKey(): string {
  return `sk_${randomBytes(32).toString("hex")}`;
}

export function hashIntegrationKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
