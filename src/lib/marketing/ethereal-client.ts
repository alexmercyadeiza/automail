import nodemailer from "nodemailer";

const ETHEREAL_CONFIG = {
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "amelia.hoeger60@ethereal.email",
    pass: "BXAqqmgzZ8j9KbUYFT",
  },
};

const FROM_EMAIL = "amelia.hoeger60@ethereal.email";
const FROM_NAME = "Mulla Marketing (Test)";

export type EmailRecipient = {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
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
  previewUrl?: string;
  error?: string;
};

function getTransporter() {
  return nodemailer.createTransport({
    host: ETHEREAL_CONFIG.host,
    port: ETHEREAL_CONFIG.port,
    secure: false,
    auth: ETHEREAL_CONFIG.auth,
  });
}

export async function sendEmailViaEthereal({
  to,
  subject,
  htmlBody,
  fromEmail = FROM_EMAIL,
  fromName = FROM_NAME,
}: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}> {
  try {
    const transporter = getTransporter();
    const source = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    const info = await transporter.sendMail({
      from: source,
      to,
      subject,
      html: htmlBody,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: errorMessage };
  }
}

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES_MS = 200;

export async function sendBatchEmailsViaEthereal(
  recipients: EmailRecipient[],
  subject: string,
  getHtmlBody: (recipient: EmailRecipient) => string,
  onProgress?: (completed: number, total: number) => void,
): Promise<BatchEmailResult[]> {
  const results: BatchEmailResult[] = [];
  const total = recipients.length;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(
      async (recipient): Promise<BatchEmailResult> => {
        const htmlBody = getHtmlBody(recipient);
        const result = await sendEmailViaEthereal({
          to: recipient.email,
          subject,
          htmlBody,
        });

        return {
          email: recipient.email,
          success: result.success,
          messageId: result.messageId,
          previewUrl: result.previewUrl,
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
