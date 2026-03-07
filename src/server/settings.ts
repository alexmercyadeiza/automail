import { createServerFn } from "@tanstack/react-start";
import {
  SESv2Client,
  CreateEmailIdentityCommand,
  ListEmailIdentitiesCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
} from "@aws-sdk/client-sesv2";
import { createServiceClient } from "@/lib/supabase/service";
import { randomBytes, createHmac } from "node:crypto";
import { DEFAULT_PROJECT_ID } from "@/lib/integrations";
import { generateIntegrationKey, hashIntegrationKey } from "@/server/integration-auth";

// ---------------------------------------------------------------------------
// SES v2 client
// ---------------------------------------------------------------------------

const SES_REGION =
  process.env.MAIL_HOST?.match(/email-smtp\.([^.]+)\.amazonaws\.com/)?.[1] ||
  process.env.SES_REGION ||
  "eu-west-1";

let sesv2Client: SESv2Client | null = null;

function getSESv2Client() {
  if (sesv2Client) return sesv2Client;

  const accessKeyId = process.env.MAIL_USERNAME;
  const secretAccessKey = process.env.MAIL_PASSWORD;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS SES credentials (MAIL_USERNAME / MAIL_PASSWORD)",
    );
  }

  sesv2Client = new SESv2Client({
    region: SES_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });

  return sesv2Client;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SenderIdentity = {
  name: string;
  type: "EMAIL_ADDRESS" | "DOMAIN" | "MANAGED_DOMAIN";
  verificationStatus: string;
  dkimTokens?: string[];
  sendingEnabled: boolean;
};

// ---------------------------------------------------------------------------
// List sender identities
// ---------------------------------------------------------------------------

export const listSenderIdentities = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const client = getSESv2Client();

      const listResult = await client.send(
        new ListEmailIdentitiesCommand({ PageSize: 100 }),
      );

      const identities = listResult.EmailIdentities ?? [];

      // Fetch details for each identity in parallel
      const detailed = await Promise.all(
        identities.map(async (identity) => {
          try {
            const detail = await client.send(
              new GetEmailIdentityCommand({
                EmailIdentity: identity.IdentityName!,
              }),
            );

            return {
              name: identity.IdentityName!,
              type: identity.IdentityType ?? "EMAIL_ADDRESS",
              verificationStatus:
                detail.VerificationStatus ?? "NOT_STARTED",
              dkimTokens: detail.DkimAttributes?.Tokens ?? [],
              sendingEnabled: detail.VerifiedForSendingStatus ?? false,
            } satisfies SenderIdentity;
          } catch {
            return {
              name: identity.IdentityName!,
              type: identity.IdentityType ?? "EMAIL_ADDRESS",
              verificationStatus: "UNKNOWN",
              dkimTokens: [],
              sendingEnabled: false,
            } satisfies SenderIdentity;
          }
        }),
      );

      return { ok: true as const, identities: detailed };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to list identities";
      return { ok: false as const, message, identities: [] as SenderIdentity[] };
    }
  },
);

// ---------------------------------------------------------------------------
// Create a sender identity (email address or domain)
// ---------------------------------------------------------------------------

export const createSenderIdentity = createServerFn({ method: "POST" })
  .inputValidator((d: { identity: string }) => d)
  .handler(async ({ data }) => {
    const identity = data.identity.trim().toLowerCase();

    if (!identity) {
      return { ok: false as const, message: "Identity value is required" };
    }

    try {
      const client = getSESv2Client();

      const result = await client.send(
        new CreateEmailIdentityCommand({
          EmailIdentity: identity,
        }),
      );

      const isDomain = !identity.includes("@");

      return {
        ok: true as const,
        identityType: result.IdentityType ?? (isDomain ? "DOMAIN" : "EMAIL_ADDRESS"),
        verificationStatus: result.VerifiedForSendingStatus
          ? "SUCCESS"
          : "PENDING",
        dkimTokens: result.DkimAttributes?.Tokens ?? [],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create identity";
      return { ok: false as const, message };
    }
  });

// ---------------------------------------------------------------------------
// Delete a sender identity
// ---------------------------------------------------------------------------

export const deleteSenderIdentity = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: identity }) => {
    if (!identity) {
      return { ok: false as const, message: "Identity is required" };
    }

    try {
      const client = getSESv2Client();

      await client.send(
        new DeleteEmailIdentityCommand({ EmailIdentity: identity }),
      );

      return { ok: true as const };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete identity";
      return { ok: false as const, message };
    }
  });

// ---------------------------------------------------------------------------
// Get a single sender identity's details (for refresh)
// ---------------------------------------------------------------------------

export const getSenderIdentity = createServerFn({ method: "GET" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: identity }) => {
    try {
      const client = getSESv2Client();

      const detail = await client.send(
        new GetEmailIdentityCommand({ EmailIdentity: identity }),
      );

      return {
        ok: true as const,
        identity: {
          name: identity,
          type: detail.IdentityType ?? "EMAIL_ADDRESS",
          verificationStatus: detail.VerificationStatus ?? "NOT_STARTED",
          dkimTokens: detail.DkimAttributes?.Tokens ?? [],
          sendingEnabled: detail.VerifiedForSendingStatus ?? false,
        } satisfies SenderIdentity,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get identity";
      return { ok: false as const, message };
    }
  });

// ===========================================================================
// Account
// ===========================================================================

export type AccountInfo = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type IntegrationProject = {
  id: string;
  name: string;
  slug: string;
  environment: string;
};

export type IntegrationKeySummary = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export const loadFirstAdmin = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("admins")
      .select("id, email, name, role")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      return { ok: false as const, message: "No admin found" };
    }

    return { ok: true as const, account: data as AccountInfo };
  },
);

export const updateAccountEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; email: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email) return { ok: false as const, message: "Email is required" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("admins")
      .update({ email })
      .eq("id", data.id);

    if (error) {
      return { ok: false as const, message: error.message };
    }

    return { ok: true as const };
  });

export const updateAccountName = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; name: string }) => d)
  .handler(async ({ data }) => {
    const name = data.name.trim();
    if (!name) return { ok: false as const, message: "Name is required" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("admins")
      .update({ name })
      .eq("id", data.id);

    if (error) {
      return { ok: false as const, message: error.message };
    }

    return { ok: true as const };
  });

export const loadDefaultProject = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id,name,slug,environment")
      .eq("id", DEFAULT_PROJECT_ID)
      .single();

    if (error || !data) {
      return { ok: false as const, message: error?.message ?? "Project not found" };
    }

    return { ok: true as const, project: data as IntegrationProject };
  },
);

export const listIntegrationKeys = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("project_api_keys")
      .select("id,name,key_prefix,last_used_at,created_at,revoked_at")
      .eq("project_id", DEFAULT_PROJECT_ID)
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false as const, message: error.message, keys: [] as IntegrationKeySummary[] };
    }

    return { ok: true as const, keys: (data ?? []) as IntegrationKeySummary[] };
  },
);

export const createIntegrationKey = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const name = data.name.trim();
    if (!name) {
      return { ok: false as const, message: "Key name is required" };
    }

    const supabase = createServiceClient();
    const rawKey = generateIntegrationKey();
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = hashIntegrationKey(rawKey);

    const { data: keyRow, error } = await supabase
      .from("project_api_keys")
      .insert({
        project_id: DEFAULT_PROJECT_ID,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      })
      .select("id,name,key_prefix,last_used_at,created_at,revoked_at")
      .single();

    if (error) {
      return { ok: false as const, message: error.message };
    }

    return {
      ok: true as const,
      key: keyRow as IntegrationKeySummary,
      rawKey,
    };
  });

// ===========================================================================
// Two-Factor Authentication (TOTP)
// ===========================================================================

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanInput = encoded.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const idx = alphabet.indexOf(cleanInput[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function generateTOTP(secret: string, timeStep = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(time, 4);

  const key = base32Decode(secret);
  const hmac = createHmac("sha1", key).update(timeBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, "0");
}

export const generate2FASecret = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: adminId }) => {
    const supabase = createServiceClient();

    const { data: admin } = await supabase
      .from("admins")
      .select("email")
      .eq("id", adminId)
      .single();

    if (!admin) {
      return { ok: false as const, message: "Admin not found" };
    }

    const secret = base32Encode(randomBytes(20));

    const { error } = await supabase
      .from("admins")
      .update({ totp_secret: secret, totp_enabled: false })
      .eq("id", adminId);

    if (error) {
      return { ok: false as const, message: error.message };
    }

    const issuer = "Automail";
    const otpauthUrl = `otpauth://totp/${issuer}:${encodeURIComponent(admin.email)}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;

    return {
      ok: true as const,
      secret,
      otpauthUrl,
    };
  });

export const verify2FACode = createServerFn({ method: "POST" })
  .inputValidator((d: { adminId: string; code: string }) => d)
  .handler(async ({ data }) => {
    const supabase = createServiceClient();

    const { data: admin } = await supabase
      .from("admins")
      .select("totp_secret")
      .eq("id", data.adminId)
      .single();

    if (!admin?.totp_secret) {
      return { ok: false as const, message: "No 2FA secret found. Generate one first." };
    }

    // Check current and adjacent time windows for clock drift tolerance
    const currentCode = generateTOTP(admin.totp_secret, 30);
    const time = Math.floor(Date.now() / 1000 / 30);
    const prevTimeBuffer = Buffer.alloc(8);
    prevTimeBuffer.writeUInt32BE(0, 0);
    prevTimeBuffer.writeUInt32BE(time - 1, 4);
    const prevKey = base32Decode(admin.totp_secret);
    const prevHmac = createHmac("sha1", prevKey).update(prevTimeBuffer).digest();
    const prevOffset = prevHmac[prevHmac.length - 1] & 0xf;
    const prevRaw =
      ((prevHmac[prevOffset] & 0x7f) << 24) |
      ((prevHmac[prevOffset + 1] & 0xff) << 16) |
      ((prevHmac[prevOffset + 2] & 0xff) << 8) |
      (prevHmac[prevOffset + 3] & 0xff);
    const prevCode = String(prevRaw % 1000000).padStart(6, "0");

    if (data.code !== currentCode && data.code !== prevCode) {
      return { ok: false as const, message: "Invalid code. Please try again." };
    }

    const { error } = await supabase
      .from("admins")
      .update({ totp_enabled: true })
      .eq("id", data.adminId);

    if (error) {
      return { ok: false as const, message: error.message };
    }

    return { ok: true as const };
  });

export const disable2FA = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: adminId }) => {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("admins")
      .update({ totp_secret: null, totp_enabled: false })
      .eq("id", adminId);

    if (error) {
      return { ok: false as const, message: error.message };
    }

    return { ok: true as const };
  });

export const get2FAStatus = createServerFn({ method: "GET" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: adminId }) => {
    const supabase = createServiceClient();

    const { data: admin } = await supabase
      .from("admins")
      .select("totp_enabled")
      .eq("id", adminId)
      .single();

    return {
      enabled: admin?.totp_enabled ?? false,
    };
  });
