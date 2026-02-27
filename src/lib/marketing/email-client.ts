import {
  type EmailRecipient as EtherealRecipient,
  sendBatchEmailsViaEthereal,
  sendEmailViaEthereal,
} from "./ethereal-client";
import {
  type EmailRecipient as SESRecipient,
  sendBatchEmailsViaSES,
  sendEmailViaSES,
} from "./ses-client";

const isTestMode = process.env.MAIL_MODE === "test";

export type EmailRecipient = {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  id?: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  htmlBody: string;
  fromEmail?: string;
  fromName?: string;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
};

export type BatchEmailResult = {
  email: string;
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
};

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (isTestMode) {
    console.log("[TEST MODE] Sending email via Ethereal");
    return sendEmailViaEthereal(params);
  }
  return sendEmailViaSES(params);
}

export async function sendBatchEmails(
  recipients: EmailRecipient[],
  subject: string,
  getHtmlBody: (recipient: EmailRecipient) => string,
  onProgress?: (completed: number, total: number) => void,
  fromEmail?: string,
  fromName?: string,
): Promise<BatchEmailResult[]> {
  if (isTestMode) {
    console.log(
      `[TEST MODE] Sending batch emails via Ethereal to ${recipients.length} recipients`,
    );
    return sendBatchEmailsViaEthereal(
      recipients as EtherealRecipient[],
      subject,
      getHtmlBody,
      onProgress,
    );
  }

  return sendBatchEmailsViaSES(
    recipients as SESRecipient[],
    subject,
    getHtmlBody,
    onProgress,
    fromEmail,
    fromName,
  );
}
