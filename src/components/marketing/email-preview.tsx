import parse from "html-react-parser";
import { sanitizeMarketingHtml } from "@/lib/marketing/sanitize";

type Props = {
  content: string;
  headerImage?: string | null;
  footerImage?: string | null;
  recipientName?: string;
  recipientEmail?: string;
  socialFacebook?: string | null;
  socialX?: string | null;
  socialInstagram?: string | null;
  socialLinkedin?: string | null;
  socialMedium?: string | null;
  unsubscribeUrl?: string | null;
  copyrightText?: string | null;
  companyAddress?: string | null;
  showFooter?: boolean;
  maxWidth?: string;
};

function replaceVariables(
  text: string,
  data: { firstname?: string; lastname?: string; email?: string },
) {
  let result = text;
  const firstname = data.firstname || "";
  const parts = firstname.trim().split(/\s+/);
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || data.lastname || "";

  result = result.replace(/\{firstname\}/gi, first || "there");
  result = result.replace(/\{lastname\}/gi, last);
  result = result.replace(/\{email\}/gi, data.email || "");
  return result;
}

// Transform TipTap button elements for preview display
function transformTipTapButtonsForPreview(html: string): string {
  return html.replace(
    /<a\s+data-type="email-button"[^>]*href="([^"]*)"[^>]*style="[^"]*background-color:\s*([^;]+);[^"]*color:\s*([^;]+);[^"]*width:\s*([^;]+);[^"]*"[^>]*>([^<]*)<\/a>/gi,
    (_, href, bgColor, textColor, width, text) => {
      return `<div style="text-align:center;margin:24px 0;">
        <a href="${href}" style="display:block;background-color:${bgColor};color:${textColor};padding:16px 24px;border-radius:47px;text-decoration:none;font-weight:700;font-size:16px;text-align:center;width:${width};max-width:100%;box-sizing:border-box;margin:0 auto;">${text}</a>
      </div>`;
    },
  );
}

// Transform BlockNote button elements for preview display
function transformBlockNoteButtonsForPreview(html: string): string {
  return html.replace(
    /<div[^>]*style="[^"]*text-align:\s*center[^"]*"[^>]*>\s*<a\s+href="([^"]*)"[^>]*style="[^"]*background-color:\s*([^;]+);[^"]*color:\s*([^;]+);[^"]*width:\s*([^;]+);[^"]*"[^>]*>([^<]*)<\/a>\s*<\/div>/gi,
    (_, href, bgColor, textColor, width, text) => {
      return `<div style="text-align:center;margin:24px 0;">
        <a href="${href}" style="display:block;background-color:${bgColor};color:${textColor};padding:16px 24px;border-radius:47px;text-decoration:none;font-weight:700;font-size:16px;text-align:center;width:${width};max-width:100%;box-sizing:border-box;margin:0 auto;">${text}</a>
      </div>`;
    },
  );
}

// Transform horizontal rules for preview
function transformDividersForPreview(html: string): string {
  return html.replace(
    /<hr[^>]*\/?>/gi,
    '<div style="margin:20px 0;border-top:1px solid #bbbbbb;"></div>',
  );
}

// Transform images to ensure they fit within content area
function transformImagesForPreview(html: string): string {
  return html.replace(/<img([^>]*)>/gi, (_match, attributes: string) => {
    // Check if it already has width:100% style to avoid double processing
    if (attributes.includes('width="100%"')) {
      return `<img${attributes}>`;
    }
    // Remove any existing width/height that might break layout
    const cleanAttrs = attributes
      .replace(/\s*width\s*=\s*"[^"]*"/gi, "")
      .replace(/\s*height\s*=\s*"[^"]*"/gi, "")
      .trim();
    return `<img ${cleanAttrs} style="display:block;max-width:100%;width:100%;height:auto;border-radius:8px;">`;
  });
}

export default function EmailPreview({
  content,
  headerImage,
  footerImage,
  recipientName = "John Doe",
  recipientEmail = "john@example.com",
  socialFacebook,
  socialX,
  socialInstagram,
  socialLinkedin,
  socialMedium,
  unsubscribeUrl,
  copyrightText = "\u00a92025 Mulla Africa",
  companyAddress = "Abuja, Nigeria",
  showFooter = true,
  maxWidth = "600px",
}: Props) {
  const personalizedContent = replaceVariables(content, {
    firstname: recipientName,
    email: recipientEmail,
  });

  let sanitizedContent = sanitizeMarketingHtml(personalizedContent);
  sanitizedContent = transformTipTapButtonsForPreview(sanitizedContent);
  sanitizedContent = transformBlockNoteButtonsForPreview(sanitizedContent);
  sanitizedContent = transformDividersForPreview(sanitizedContent);
  sanitizedContent = transformImagesForPreview(sanitizedContent);

  const hasSocials =
    socialFacebook ||
    socialX ||
    socialInstagram ||
    socialLinkedin ||
    socialMedium;

  return (
    <div className="border border-neutral-200 bg-[#f7f8fa] overflow-hidden">
      {/* Centered email card - matches actual email template */}
      <div className="mx-auto bg-white overflow-hidden" style={{ maxWidth }}>
        {headerImage && (
          <div className="overflow-hidden">
            <img
              src={headerImage}
              alt="Header"
              className="w-full object-cover"
            />
          </div>
        )}

        <div className="px-8 py-8 sm:px-11">
          <article className="email-preview-content text-[#1a1a1a] text-[15px] leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 [&_h1]:text-[20px] [&_h1]:font-bold [&_h1]:text-[#111111] [&_h1]:mb-4 [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:text-[#111111] [&_h2]:mb-4 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-[#111111] [&_h3]:mb-4 [&_a]:text-[#343446] [&_a]:underline [&_strong]:font-bold [&_ul]:mb-4 [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:pl-6 [&_li]:mb-2 [&_li]:text-[#1a1a1a] [&_img]:max-w-full [&_img]:w-full [&_img]:h-auto [&_img]:rounded-lg">
            {parse(sanitizedContent)}
          </article>
        </div>

        {footerImage && (
          <div className="overflow-hidden px-8 pb-6 sm:px-11">
            <img
              src={footerImage}
              alt="Footer"
              className="w-full object-cover rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Footer section outside the white card */}
      {showFooter && (
        <div className="mx-auto pt-8 pb-10 px-8 sm:px-11" style={{ maxWidth }}>
          {/* Social icons */}
          {hasSocials && (
            <div className="flex justify-center gap-4 pt-1 pb-3">
              {socialFacebook && (
                <a
                  href={socialFacebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-60 transition-opacity"
                >
                  <img
                    src="/social-icons/facebook.png"
                    alt="Facebook"
                    width={20}
                    height={20}
                  />
                </a>
              )}
              {socialX && (
                <a
                  href={socialX}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-60 transition-opacity"
                >
                  <img
                    src="/social-icons/twitter.png"
                    alt="X"
                    width={20}
                    height={20}
                  />
                </a>
              )}
              {socialInstagram && (
                <a
                  href={socialInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-60 transition-opacity"
                >
                  <img
                    src="/social-icons/instagram.png"
                    alt="Instagram"
                    width={20}
                    height={20}
                  />
                </a>
              )}
              {socialLinkedin && (
                <a
                  href={socialLinkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-60 transition-opacity"
                >
                  <img
                    src="/social-icons/linkedin.png"
                    alt="LinkedIn"
                    width={20}
                    height={20}
                  />
                </a>
              )}
              {socialMedium && (
                <a
                  href={socialMedium}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-60 transition-opacity"
                >
                  <img
                    src="/social-icons/medium.png"
                    alt="Medium"
                    width={20}
                    height={20}
                  />
                </a>
              )}
            </div>
          )}

          {/* Unsubscribe link - shown first */}
          {unsubscribeUrl && (
            <div className="text-center py-3">
              <a
                href={unsubscribeUrl}
                className="text-sm text-[#a1a2b2] underline hover:text-neutral-600"
              >
                Unsubscribe
              </a>
            </div>
          )}

          {/* Copyright and address */}
          {(copyrightText || companyAddress) && (
            <div className="text-center py-2 text-sm text-[#a1a2b2]">
              {copyrightText && (
                <p className="text-[#343446] font-medium">{copyrightText}</p>
              )}
              {companyAddress && <p className="mt-1">{companyAddress}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
