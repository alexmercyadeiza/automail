import mjml2html from "mjml";
import { sanitizeMarketingHtml } from "./sanitize";

export function composeCampaignHtml({
  content,
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
}: {
  content: string;
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
}) {
  const safeContent = sanitizeMarketingHtml(content || "");

  const headerSection = headerImage
    ? `<mj-section padding="0">
        <mj-column padding="0">
          <mj-image src="${headerImage}" alt="Campaign header" padding="0" fluid-on-mobile="true" />
        </mj-column>
      </mj-section>`
    : "";

  const footerImageSection = footerImage
    ? `<mj-section background-color="#ffffff" padding="0 48px 24px">
        <mj-column padding="0">
          <mj-image src="${footerImage}" alt="Campaign footer" padding="0" border-radius="8px" fluid-on-mobile="true" />
        </mj-column>
      </mj-section>`
    : "";

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const iconBaseUrl =
    `${supabaseUrl}/storage/v1/object/public/public-assets/social-icons`;

  const socialLinks: string[] = [];
  if (socialFacebook)
    socialLinks.push(
      `<a href="${socialFacebook}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 8px;text-decoration:none;"><img src="${iconBaseUrl}/facebook.png" alt="Facebook" width="20" height="20" style="display:block;border:0;" /></a>`,
    );
  if (socialX)
    socialLinks.push(
      `<a href="${socialX}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 8px;text-decoration:none;"><img src="${iconBaseUrl}/twitter.png" alt="X" width="20" height="20" style="display:block;border:0;" /></a>`,
    );
  if (socialInstagram)
    socialLinks.push(
      `<a href="${socialInstagram}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 8px;text-decoration:none;"><img src="${iconBaseUrl}/instagram.png" alt="Instagram" width="20" height="20" style="display:block;border:0;" /></a>`,
    );
  if (socialLinkedin)
    socialLinks.push(
      `<a href="${socialLinkedin}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 8px;text-decoration:none;"><img src="${iconBaseUrl}/linkedin.png" alt="LinkedIn" width="20" height="20" style="display:block;border:0;" /></a>`,
    );
  if (socialMedium)
    socialLinks.push(
      `<a href="${socialMedium}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 8px;text-decoration:none;"><img src="${iconBaseUrl}/medium.png" alt="Medium" width="20" height="20" style="display:block;border:0;" /></a>`,
    );

  const hasSocials = socialLinks.length > 0;
  const hasFooterMeta = unsubscribeUrl || copyrightText || companyAddress;

  let footerSection = "";
  if (hasSocials || hasFooterMeta) {
    const socialBlock = hasSocials
      ? `<mj-section padding="32px 10px 8px">
          <mj-column>
            <mj-text align="center" padding="0">
              ${socialLinks.join("\n              ")}
            </mj-text>
          </mj-column>
        </mj-section>`
      : "";

    const unsubscribeBlock = unsubscribeUrl
      ? `<mj-section padding="8px 0">
          <mj-column>
            <mj-text align="center" padding="0" font-size="14px" color="#a1a2b2">
              <a href="${unsubscribeUrl}" style="color:#a1a2b2;text-decoration:underline;">Unsubscribe</a>
            </mj-text>
          </mj-column>
        </mj-section>`
      : "";

    const companyBlock =
      copyrightText || companyAddress
        ? `<mj-section padding="4px 0 0">
          <mj-column>
            ${copyrightText ? `<mj-text align="center" padding="0" font-size="14px" color="#343446" font-weight="500">${copyrightText}</mj-text>` : ""}
            ${companyAddress ? `<mj-text align="center" padding="4px 0 32px" font-size="14px" color="#a1a2b2">${companyAddress}</mj-text>` : ""}
          </mj-column>
        </mj-section>`
        : "";

    footerSection = `${socialBlock}${unsubscribeBlock}${companyBlock}`;
  }

  const mjmlTemplate = `
<mjml>
  <mj-head>
    <mj-title>Marketing email</mj-title>
    <mj-attributes>
      <mj-all font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="1.7" color="#111111" />
      <mj-section background-color="transparent" padding="0" />
      <mj-column padding="0" />
    </mj-attributes>
    <mj-style>
      .email-body a { color: #111111; }
      .email-body h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px; line-height: 1.3; }
      .email-body h2 { font-size: 20px; font-weight: 600; margin: 0 0 10px; line-height: 1.3; }
      .email-body h3 { font-size: 18px; font-weight: 600; margin: 0 0 8px; line-height: 1.3; }
      .email-body p { margin: 0 0 16px; }
      .email-body ul, .email-body ol { margin: 0 0 16px; padding-left: 24px; }
      .email-body li { margin-bottom: 4px; }
      .email-body img { max-width: 100%; height: auto; }
      .email-body hr { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
    </mj-style>
  </mj-head>
  <mj-body width="700px" background-color="#f5f5f5">
    <mj-wrapper background-color="#ffffff" padding="0">
      ${headerSection}
      <mj-section padding="40px 48px 0">
        <mj-column>
          <mj-text css-class="email-body" padding="0">
            ${safeContent}
          </mj-text>
        </mj-column>
      </mj-section>
      ${footerImageSection}
      <mj-section padding="0 0 40px"><mj-column><mj-spacer height="1px" /></mj-column></mj-section>
    </mj-wrapper>

    ${footerSection}
  </mj-body>
</mjml>`;

  const result = mjml2html(mjmlTemplate, { validationLevel: "soft" });

  if (result.errors && result.errors.length > 0) {
    console.warn("[MJML] Compilation warnings:", result.errors);
  }

  return result.html;
}
