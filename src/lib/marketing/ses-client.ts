import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const SES_REGION =
  process.env.MAIL_HOST?.match(/email-smtp\.([^.]+)\.amazonaws\.com/)?.[1] ||
  "eu-west-1";

let sesClient: SESClient | null = null;

function getSESClient() {
  if (sesClient) return sesClient;

  const accessKeyId = process.env.MAIL_USERNAME;
  const secretAccessKey = process.env.MAIL_PASSWORD;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS SES credentials (MAIL_USERNAME/MAIL_PASSWORD)",
    );
  }

  sesClient = new SESClient({
    region: SES_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });

  return sesClient;
}

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  htmlBody: string;
  fromEmail?: string;
  fromName?: string;
};

export type BatchEmailResult = {
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
};

const FROM_EMAIL =
  process.env.MAIL_FROM_ADDRESS?.replace(/^"|"$/g, "").trim() ||
  "hello@mulla.africa";
const FROM_NAME =
  process.env.MAIL_FROM_NAME?.replace(/^"|"$/g, "").trim() || "Mulla";

const SES_CONFIGURATION_SET = process.env.SES_CONFIGURATION_SET || "";

export async function sendEmailViaSES({
  to,
  subject,
  htmlBody,
  fromEmail = FROM_EMAIL,
  fromName = FROM_NAME,
}: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const client = getSESClient();
    const source = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    const command = new SendEmailCommand({
      Source: source,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: htmlBody, Charset: "UTF-8" } },
      },
      ...(SES_CONFIGURATION_SET && {
        ConfigurationSetName: SES_CONFIGURATION_SET,
      }),
    });

    const response = await client.send(command);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: errorMessage };
  }
}

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 100;

export async function sendBatchEmailsViaSES(
  recipients: EmailRecipient[],
  subject: string,
  getHtmlBody: (recipient: EmailRecipient) => string,
  onProgress?: (completed: number, total: number) => void,
  fromEmail?: string,
  fromName?: string,
): Promise<BatchEmailResult[]> {
  const results: BatchEmailResult[] = [];
  const total = recipients.length;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(
      async (recipient): Promise<BatchEmailResult> => {
        const htmlBody = getHtmlBody(recipient);
        const result = await sendEmailViaSES({
          to: recipient.email,
          subject,
          htmlBody,
          ...(fromEmail && { fromEmail }),
          ...(fromName && { fromName }),
        });

        return {
          email: recipient.email,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        };
      },
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (onProgress) {
      onProgress(results.length, total);
    }

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS),
      );
    }
  }

  return results;
}
