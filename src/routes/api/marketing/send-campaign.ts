import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { sendEmail } from "@/lib/marketing/email-client";
import { composeCampaignHtml } from "@/lib/marketing/email-template";
import {
  proxyExternalImages,
  proxyImageToStorage,
} from "@/lib/marketing/image-proxy";
import { createServiceClient } from "@/lib/supabase/service";

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 200;

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

export const Route = createFileRoute("/api/marketing/send-campaign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { campaignId, listId } = await request.json();

        if (!campaignId) {
          return new Response(
            JSON.stringify({ error: "Missing campaign" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const supabase = createServiceClient();

        // Build customers query based on list filter
        let customersQuery = supabase
          .from("marketing_customers")
          .select("id,email,first_name,last_name");
        if (listId) {
          customersQuery = customersQuery.eq("list_id", listId);
        }

        const [
          { data: campaign, error: campaignError },
          { data: customers, error: customerError },
        ] = await Promise.all([
          supabase
            .from("marketing_campaigns")
            .select(
              "id,subject,content,from_name,header_image,footer_image,status,social_facebook,social_x,social_instagram,social_linkedin,social_medium,unsubscribe_url,copyright_text,company_address",
            )
            .eq("id", campaignId)
            .single(),
          customersQuery,
        ]);

        if (campaignError || !campaign) {
          return new Response(
            JSON.stringify({
              error: campaignError?.message || "Campaign not found",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        if (campaign.status === "sent") {
          return new Response(
            JSON.stringify({
              error: "This campaign has already been sent",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        if (customerError || !customers || customers.length === 0) {
          return new Response(
            JSON.stringify({
              error: customerError?.message || "No customers found",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Create a readable stream for SSE
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const sendEvent = (data: object) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
              );
            };

            const recipients = customers.map((customer) => ({
              id: customer.id,
              email: customer.email,
              firstName: customer.first_name || "",
              lastName: customer.last_name || "",
            }));

            // Proxy external images once before sending to all recipients
            const proxiedContent = await proxyExternalImages(campaign.content);
            const proxiedHeaderImage = campaign.header_image
              ? await proxyImageToStorage(campaign.header_image)
              : campaign.header_image;
            const proxiedFooterImage = campaign.footer_image
              ? await proxyImageToStorage(campaign.footer_image)
              : campaign.footer_image;

            const total = recipients.length;
            const totalBatches = Math.ceil(total / BATCH_SIZE);
            let sent = 0;
            let failed = 0;

            // Send initial status
            sendEvent({
              type: "start",
              total,
              totalBatches,
              batchSize: BATCH_SIZE,
            });

            const allLogs: Array<{
              id: string;
              campaign_id: string;
              customer_id: string | null;
              customer_email: string;
              status: string;
              error_message: string | null;
              message_id: string | null;
              sent_at: string;
            }> = [];

            // Process in batches
            for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
              const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
              const batch = recipients.slice(i, i + BATCH_SIZE);

              sendEvent({
                type: "batch_start",
                batchNumber,
                totalBatches,
                batchSize: batch.length,
                processed: sent + failed,
                total,
              });

              // Send emails in current batch concurrently
              const batchResults = await Promise.all(
                batch.map(async (recipient) => {
                  const personalizedContent = replaceVariables(
                    proxiedContent,
                    {
                      firstname: recipient.firstName || "",
                      lastname: recipient.lastName || "",
                      email: recipient.email,
                    },
                  );

                  const htmlBody = composeCampaignHtml({
                    content: personalizedContent,
                    headerImage: proxiedHeaderImage,
                    footerImage: proxiedFooterImage,
                    socialFacebook: campaign.social_facebook,
                    socialX: campaign.social_x,
                    socialInstagram: campaign.social_instagram,
                    socialLinkedin: campaign.social_linkedin,
                    socialMedium: campaign.social_medium,
                    unsubscribeUrl: campaign.unsubscribe_url
                      ? campaign.unsubscribe_url.replace(
                          /\{email\}/gi,
                          recipient.email,
                        )
                      : undefined,
                    copyrightText: campaign.copyright_text,
                    companyAddress: campaign.company_address,
                  });

                  const result = await sendEmail({
                    to: recipient.email,
                    subject: campaign.subject,
                    htmlBody,
                    ...(campaign.from_name && {
                      fromName: campaign.from_name,
                    }),
                  });

                  return {
                    ...recipient,
                    success: result.success,
                    messageId: result.messageId,
                    error: result.error,
                  };
                }),
              );

              // Update counts
              const batchSent = batchResults.filter((r) => r.success).length;
              const batchFailed = batchResults.filter(
                (r) => !r.success,
              ).length;
              sent += batchSent;
              failed += batchFailed;

              // Create logs for this batch
              for (const result of batchResults) {
                allLogs.push({
                  id: randomUUID(),
                  campaign_id: campaignId,
                  customer_id: result.id || null,
                  customer_email: result.email,
                  status: result.success ? "sent" : "failed",
                  error_message: result.error || null,
                  message_id: result.messageId || null,
                  sent_at: new Date().toISOString(),
                });
              }

              // Send batch completion event with individual results
              sendEvent({
                type: "batch_complete",
                batchNumber,
                totalBatches,
                batchResults: batchResults.map((r) => ({
                  email: r.email,
                  success: r.success,
                })),
                sent,
                failed,
                total,
                progress: Math.round(((sent + failed) / total) * 100),
              });

              // Delay between batches
              if (i + BATCH_SIZE < recipients.length) {
                await new Promise((resolve) =>
                  setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS),
                );
              }
            }

            // Insert all logs to database
            const DB_BATCH_SIZE = 100;
            for (let i = 0; i < allLogs.length; i += DB_BATCH_SIZE) {
              const batch = allLogs.slice(i, i + DB_BATCH_SIZE);
              await supabase.from("marketing_email_logs").insert(batch);
            }

            // Update campaign status
            await supabase
              .from("marketing_campaigns")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
              })
              .eq("id", campaignId);

            // Send completion event
            sendEvent({
              type: "complete",
              sent,
              failed,
              total,
            });

            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
