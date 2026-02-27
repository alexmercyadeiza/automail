import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { sendEmail as sendEmailClient } from "@/lib/marketing/email-client";
import { composeCampaignHtml } from "@/lib/marketing/email-template";
import {
  proxyExternalImages,
  proxyImageToStorage,
} from "@/lib/marketing/image-proxy";
import { sanitizeMarketingHtml } from "@/lib/marketing/sanitize";
import { createServiceClient } from "@/lib/supabase/service";

const FROM_EMAIL =
  sanitizeEnvValue(process.env.MAIL_FROM_ADDRESS) ?? "hello@mulla.africa";
const FROM_NAME =
  sanitizeEnvValue(process.env.MAIL_FROM_NAME) ?? "Mulla Marketing";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";

// Types
export type CampaignPayload = {
  name?: string | null;
  subject: string;
  content: string;
  contentBlocks?: unknown[];
  fromName?: string | null;
  headerImage?: string | null;
  footerImage?: string | null;
  socialFacebook?: string | null;
  socialX?: string | null;
  socialInstagram?: string | null;
  socialLinkedin?: string | null;
  socialMedium?: string | null;
  unsubscribeUrl?: string | null;
  copyrightText?: string | null;
  companyAddress?: string | null;
};

type TestEmailPayload = CampaignPayload & {
  testEmail: string;
  testName?: string;
};

export type CustomerPayload = {
  firstName?: string;
  lastName?: string;
  email: string;
  listId?: string;
};

export type FooterSettings = {
  socialFacebook?: string | null;
  socialX?: string | null;
  socialInstagram?: string | null;
  socialLinkedin?: string | null;
  socialMedium?: string | null;
  unsubscribeUrl?: string | null;
  copyrightText?: string | null;
  companyAddress?: string | null;
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function replaceVariables(
  text: string,
  data: { firstname?: string; lastname?: string; email?: string },
) {
  let result = text;

  const firstname = data.firstname || "";
  const lastname = data.lastname || "";

  result = result.replace(/\{firstname\}/gi, firstname || "there");
  result = result.replace(/\{lastname\}/gi, lastname);
  result = result.replace(/\{email\}/gi, data.email || "");

  return result;
}

function sanitizeEnvValue(value?: string | null) {
  if (!value) return undefined;
  return value.replace(/^"|"$/g, "").trim();
}

function normalizeImageValue(value?: string | null) {
  if (!value) return null;
  return value.trim() || null;
}

async function sendEmail({
  to,
  subject,
  content,
  fromName,
  headerImage,
  footerImage,
  socialFacebook,
  socialX,
  socialInstagram,
  socialLinkedin,
  socialMedium,
  unsubscribeUrl,
  copyrightText,
  companyAddress,
  recipientEmail,
  customerData,
}: CampaignPayload & {
  to: string;
  recipientEmail?: string;
  customerData?: { firstname?: string; lastname?: string; email?: string };
}) {
  // Replace variables in subject and content
  const personalizedSubject = customerData
    ? replaceVariables(subject, customerData)
    : subject;
  const personalizedContent = customerData
    ? replaceVariables(content, customerData)
    : content;

  // Proxy external images to our own storage to avoid hotlink blocking
  const proxiedContent = await proxyExternalImages(personalizedContent);
  const proxiedHeaderImage = headerImage
    ? await proxyImageToStorage(headerImage)
    : headerImage;
  const proxiedFooterImage = footerImage
    ? await proxyImageToStorage(footerImage)
    : footerImage;

  const html = composeCampaignHtml({
    content: proxiedContent,
    headerImage: proxiedHeaderImage,
    footerImage: proxiedFooterImage,
    socialFacebook,
    socialX,
    socialInstagram,
    socialLinkedin,
    socialMedium,
    unsubscribeUrl: unsubscribeUrl
      ? unsubscribeUrl.replace(
          /\{email\}/gi,
          recipientEmail || customerData?.email || "",
        )
      : undefined,
    copyrightText,
    companyAddress,
  });

  // Send email (uses Ethereal in test mode, SES in production)
  const result = await sendEmailClient({
    to,
    subject: personalizedSubject,
    htmlBody: html,
    fromEmail: FROM_EMAIL,
    fromName: fromName?.trim() || FROM_NAME,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to send email");
  }

  return result.messageId ?? null;
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const createMarketingCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: CampaignPayload) => d)
  .handler(async ({ data: payload }) => {
    if (!payload.subject.trim()) {
      return { ok: false, message: "Subject is required" };
    }
    if (!payload.content.trim()) {
      return { ok: false, message: "Please add email content" };
    }

    const supabase = createServiceClient();
    const safeContent = sanitizeMarketingHtml(payload.content);

    const { data, error } = await supabase
      .from("marketing_campaigns")
      .insert({
        name: payload.name?.trim() || null,
        subject: payload.subject.trim(),
        content: safeContent,
        content_blocks: payload.contentBlocks ?? null,
        from_name: payload.fromName?.trim() || null,
        header_image: normalizeImageValue(payload.headerImage),
        footer_image: normalizeImageValue(payload.footerImage),
        social_facebook: normalizeImageValue(payload.socialFacebook),
        social_x: normalizeImageValue(payload.socialX),
        social_instagram: normalizeImageValue(payload.socialInstagram),
        social_linkedin: normalizeImageValue(payload.socialLinkedin),
        social_medium: normalizeImageValue(payload.socialMedium),
        unsubscribe_url: normalizeImageValue(payload.unsubscribeUrl),
        copyright_text: payload.copyrightText?.trim() || "©2025 Mulla Africa",
        company_address: payload.companyAddress?.trim() || "Abuja, Nigeria",
      })
      .select(
        "id,name,subject,status,from_name,header_image,footer_image,content,created_at,sent_at,social_facebook,social_x,social_instagram,social_linkedin,social_medium,unsubscribe_url,copyright_text,company_address",
      )
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, campaign: data };
  });

export const updateMarketingCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: { campaignId: string; payload: CampaignPayload }) => d)
  .handler(async ({ data }) => {
    const { campaignId, payload } = data;

    if (!campaignId) {
      return { ok: false, message: "Missing campaign id" };
    }
    if (!payload.subject.trim()) {
      return { ok: false, message: "Subject is required" };
    }
    if (!payload.content.trim()) {
      return { ok: false, message: "Please add email content" };
    }

    const supabase = createServiceClient();
    const safeContent = sanitizeMarketingHtml(payload.content);

    const { data: campaign, error } = await supabase
      .from("marketing_campaigns")
      .update({
        name: payload.name?.trim() || null,
        subject: payload.subject.trim(),
        content: safeContent,
        content_blocks: payload.contentBlocks ?? null,
        from_name: payload.fromName?.trim() || null,
        header_image: normalizeImageValue(payload.headerImage),
        footer_image: normalizeImageValue(payload.footerImage),
        social_facebook: normalizeImageValue(payload.socialFacebook),
        social_x: normalizeImageValue(payload.socialX),
        social_instagram: normalizeImageValue(payload.socialInstagram),
        social_linkedin: normalizeImageValue(payload.socialLinkedin),
        social_medium: normalizeImageValue(payload.socialMedium),
        unsubscribe_url: normalizeImageValue(payload.unsubscribeUrl),
        copyright_text: payload.copyrightText?.trim() || "©2025 Mulla Africa",
        company_address: payload.companyAddress?.trim() || "Abuja, Nigeria",
      })
      .eq("id", campaignId)
      .select(
        "id,name,subject,status,from_name,header_image,footer_image,content,created_at,sent_at,social_facebook,social_x,social_instagram,social_linkedin,social_medium,unsubscribe_url,copyright_text,company_address",
      )
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, campaign };
  });

export const duplicateMarketingCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: campaignId }) => {
    if (!campaignId) {
      return { ok: false, message: "Missing campaign id" };
    }

    const supabase = createServiceClient();

    const { data: source, error: fetchError } = await supabase
      .from("marketing_campaigns")
      .select(
        "name,subject,content,content_blocks,from_name,header_image,footer_image,social_facebook,social_x,social_instagram,social_linkedin,social_medium,unsubscribe_url,copyright_text,company_address",
      )
      .eq("id", campaignId)
      .single();

    if (fetchError || !source) {
      return {
        ok: false,
        message: fetchError?.message ?? "Campaign not found",
      };
    }

    const { data, error } = await supabase
      .from("marketing_campaigns")
      .insert({
        name: source.name ? `${source.name} (copy)` : null,
        subject: source.subject,
        content: source.content,
        content_blocks: source.content_blocks,
        from_name: source.from_name,
        header_image: source.header_image,
        footer_image: source.footer_image,
        social_facebook: source.social_facebook,
        social_x: source.social_x,
        social_instagram: source.social_instagram,
        social_linkedin: source.social_linkedin,
        social_medium: source.social_medium,
        unsubscribe_url: source.unsubscribe_url,
        copyright_text: source.copyright_text,
        company_address: source.company_address,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, campaignId: data.id };
  });

export const deleteMarketingCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: campaignId }) => {
    if (!campaignId) {
      return { ok: false, message: "Missing campaign id" };
    }

    const supabase = createServiceClient();

    // First delete related email logs
    await supabase
      .from("marketing_email_logs")
      .delete()
      .eq("campaign_id", campaignId);

    // Then delete the campaign
    const { error } = await supabase
      .from("marketing_campaigns")
      .delete()
      .eq("id", campaignId);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  });

export const markCampaignAsDraft = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: campaignId }) => {
    if (!campaignId) {
      return { ok: false, message: "Missing campaign id" };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("marketing_campaigns")
      .update({ status: "draft", sent_at: null })
      .eq("id", campaignId);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  });

export const sendTestCampaignEmail = createServerFn({ method: "POST" })
  .inputValidator((d: TestEmailPayload) => d)
  .handler(async ({ data: payload }) => {
    const to = payload.testEmail?.trim();
    if (!to) {
      return { ok: false, message: "Please provide an email address" };
    }

    try {
      await sendEmail({
        to,
        subject: payload.subject,
        content: payload.content,
        fromName: payload.fromName,
        headerImage: payload.headerImage,
        footerImage: payload.footerImage,
        socialFacebook: payload.socialFacebook,
        socialX: payload.socialX,
        socialInstagram: payload.socialInstagram,
        socialLinkedin: payload.socialLinkedin,
        socialMedium: payload.socialMedium,
        unsubscribeUrl: payload.unsubscribeUrl,
        copyrightText: payload.copyrightText,
        companyAddress: payload.companyAddress,
        customerData: {
          firstname: payload.testName?.trim() || "there",
          email: to,
        },
      });

      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send test email";
      return { ok: false, message };
    }
  });

export const getFooterSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("marketing_footer_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      // If no row exists, return defaults
      if (error.code === "PGRST116") {
        return {
          ok: true as const,
          settings: {
            copyrightText: "©2025 Mulla Africa",
            companyAddress: "Abuja, Nigeria",
          } as FooterSettings,
        };
      }
      return { ok: false as const, message: error.message };
    }

    return {
      ok: true as const,
      settings: {
        socialFacebook: data.social_facebook,
        socialX: data.social_x,
        socialInstagram: data.social_instagram,
        socialLinkedin: data.social_linkedin,
        socialMedium: data.social_medium,
        unsubscribeUrl: data.unsubscribe_url,
        copyrightText: data.copyright_text,
        companyAddress: data.company_address,
      } as FooterSettings,
    };
  },
);

export const saveFooterSettings = createServerFn({ method: "POST" })
  .inputValidator((d: FooterSettings) => d)
  .handler(async ({ data: settings }) => {
    const supabase = createServiceClient();

    // Use upsert with the singleton pattern
    const { error } = await supabase.from("marketing_footer_settings").upsert(
      {
        id: "00000000-0000-0000-0000-000000000001", // Fixed ID for singleton
        social_facebook: settings.socialFacebook || null,
        social_x: settings.socialX || null,
        social_instagram: settings.socialInstagram || null,
        social_linkedin: settings.socialLinkedin || null,
        social_medium: settings.socialMedium || null,
        unsubscribe_url: settings.unsubscribeUrl || null,
        copyright_text: settings.copyrightText || null,
        company_address: settings.companyAddress || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error("Failed to save footer settings:", error);
      return { ok: false, message: error.message };
    }

    return { ok: true };
  });

export const uploadEditorImage = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => d)
  .handler(async ({ data }) => {
    try {
      const file = data.get("file") as File | null;

      if (!file) {
        return { ok: false, message: "No file provided" };
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        return {
          ok: false,
          message: `Invalid file type: ${file.type}. Only images are allowed.`,
        };
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return {
          ok: false,
          message: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`,
        };
      }

      if (!SUPABASE_URL) {
        console.error("SUPABASE_URL is not configured");
        return { ok: false, message: "Storage not configured" };
      }

      const supabase = createServiceClient();

      // Generate unique filename
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${randomUUID()}.${ext}`;
      const path = `marketing-emails/${filename}`;

      // Convert to buffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        return { ok: false, message: `Upload error: ${error.message}` };
      }

      // Construct public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;

      console.log("Upload successful:", publicUrl);
      return { ok: true, url: publicUrl };
    } catch (err) {
      console.error("Upload exception:", err);
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Unknown upload error",
      };
    }
  });

// ---------------------------------------------------------------------------
// Customer & Email List server functions
// ---------------------------------------------------------------------------

const DB_BATCH_SIZE = 100;

export const createMarketingCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: CustomerPayload) => d)
  .handler(async ({ data }) => {
    try {
      const supabase = createServiceClient();

      const { error } = await supabase
        .from("marketing_customers")
        .upsert(
          {
            first_name: data.firstName || null,
            last_name: data.lastName || null,
            email: data.email,
            list_id: data.listId || null,
          },
          { onConflict: "email" },
        );

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create customer";
      return { ok: false, message };
    }
  });

export const deleteMarketingCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { customerId: string }) => d)
  .handler(async ({ data }) => {
    try {
      const supabase = createServiceClient();

      const { error } = await supabase
        .from("marketing_customers")
        .delete()
        .eq("id", data.customerId);

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete customer";
      return { ok: false, message };
    }
  });

export const deleteMultipleCustomers = createServerFn({ method: "POST" })
  .inputValidator((d: string[]) => d)
  .handler(async ({ data: customerIds }) => {
    try {
      const supabase = createServiceClient();

      const { error, count } = await supabase
        .from("marketing_customers")
        .delete({ count: "exact" })
        .in("id", customerIds);

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true, deleted: count ?? 0 };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete customers";
      return { ok: false, message };
    }
  });

export const updateCustomerList = createServerFn({ method: "POST" })
  .inputValidator((d: { customerIds: string[]; listId: string | null }) => d)
  .handler(async ({ data }) => {
    try {
      const supabase = createServiceClient();

      const { error, count } = await supabase
        .from("marketing_customers")
        .update({ list_id: data.listId }, { count: "exact" })
        .in("id", data.customerIds);

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true, updated: count ?? 0 };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update customer list";
      return { ok: false, message };
    }
  });

export const importCustomersFromCSV = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      customers: { firstName: string; lastName: string; email: string }[];
      listId?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const supabase = createServiceClient();

      // Deduplicate by email (keep the last occurrence)
      const uniqueMap = new Map<
        string,
        { firstName: string; lastName: string; email: string }
      >();
      for (const customer of data.customers) {
        uniqueMap.set(customer.email.toLowerCase(), customer);
      }
      const uniqueCustomers = Array.from(uniqueMap.values());
      const skipped = data.customers.length - uniqueCustomers.length;

      let imported = 0;

      for (let i = 0; i < uniqueCustomers.length; i += DB_BATCH_SIZE) {
        const batch = uniqueCustomers.slice(i, i + DB_BATCH_SIZE);

        const rows = batch.map((c) => ({
          first_name: c.firstName || null,
          last_name: c.lastName || null,
          email: c.email,
          list_id: data.listId || null,
        }));

        const { error } = await supabase
          .from("marketing_customers")
          .upsert(rows, { onConflict: "email", ignoreDuplicates: true });

        if (error) {
          return { ok: false, message: error.message };
        }

        imported += batch.length;
      }

      return { ok: true, imported, skipped };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to import customers";
      return { ok: false, message };
    }
  });

export const createEmailList = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; description?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const supabase = createServiceClient();

      const { data: list, error } = await supabase
        .from("marketing_email_lists")
        .insert({
          name: data.name,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true, list };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create email list";
      return { ok: false, message };
    }
  });

export const deleteEmailList = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: listId }) => {
    try {
      const supabase = createServiceClient();

      // First unassign customers from this list
      await supabase
        .from("marketing_customers")
        .update({ list_id: null })
        .eq("list_id", listId);

      // Then delete the list
      const { error } = await supabase
        .from("marketing_email_lists")
        .delete()
        .eq("id", listId);

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete email list";
      return { ok: false, message };
    }
  });

export const getEmailLists = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const supabase = createServiceClient();

      const { data, error } = await supabase
        .from("marketing_email_lists")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true, lists: data };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch email lists";
      return { ok: false, message };
    }
  },
);
