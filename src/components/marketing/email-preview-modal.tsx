import parse from "html-react-parser";
import { Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sanitizeMarketingHtml } from "@/lib/marketing/sanitize";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  content: string;
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
  recipientName?: string;
  recipientEmail?: string;
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

export default function EmailPreviewModal({
  isOpen,
  onClose,
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
  recipientName = "John Doe",
  recipientEmail = "john@example.com",
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const personalizedSubject = replaceVariables(subject, {
    firstname: recipientName,
    email: recipientEmail,
  });

  const personalizedContent = replaceVariables(content, {
    firstname: recipientName,
    email: recipientEmail,
  });

  const sanitizedContent = sanitizeMarketingHtml(personalizedContent);

  return (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-4xl max-h-[90vh] rounded-2xl border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/50"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Email Preview
          </h2>
          <p className="text-sm text-neutral-500">
            Preview as: {recipientName} ({recipientEmail})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Device toggle */}
          <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`rounded-md p-1.5 transition-colors ${previewMode === "desktop" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}
              title="Desktop preview"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`rounded-md p-1.5 transition-colors ${previewMode === "mobile" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}
              title="Mobile preview"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-label="Close"
              role="img"
            >
              <title>Close</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto bg-neutral-200/60 p-6">
        {/* Email client mockup */}
        <div
          className="mx-auto rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden transition-all duration-300"
          style={{
            maxWidth: previewMode === "mobile" ? "375px" : "672px",
          }}
        >
          {" "}
          {/* Email header */}
          <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-neutral-500">From:</span>
                <span className="text-neutral-900">
                  {fromName?.trim() || "Mulla"} &lt;hello@mulla.africa&gt;
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-neutral-500">To:</span>
                <span className="text-neutral-900">{recipientEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-neutral-500">Subject:</span>
                <span className="font-medium text-neutral-900">
                  {personalizedSubject}
                </span>
              </div>
            </div>
          </div>
          {/* Email body - mimics actual email rendering with gray background */}
          <div
            className={`bg-neutral-100 ${previewMode === "mobile" ? "p-3" : "p-8"}`}
          >
            {/* Centered email card */}
            <div
              className="mx-auto rounded-xl bg-white shadow-sm overflow-hidden"
              style={{
                maxWidth: previewMode === "mobile" ? "100%" : "600px",
              }}
            >
              {" "}
              {headerImage && (
                <div className="overflow-hidden">
                  <img
                    src={headerImage}
                    alt="Header"
                    className="w-full object-cover"
                    style={{ maxHeight: "200px" }}
                  />
                </div>
              )}
              <div
                className={`${previewMode === "mobile" ? "px-4 py-5" : "px-10 py-8"}`}
              >
                <div
                  className="prose prose-sm max-w-none text-neutral-700 leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0"
                  style={{
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif",
                  }}
                >
                  {parse(sanitizedContent)}
                </div>
              </div>
              {footerImage && (
                <div
                  className={`${previewMode === "mobile" ? "px-4 pb-4" : "px-10 pb-6"}`}
                >
                  <img
                    src={footerImage}
                    alt="Footer"
                    className="w-full rounded-lg object-cover"
                    style={{ maxHeight: "200px" }}
                  />
                </div>
              )}
            </div>

            {/* Footer outside the white card */}
            {(socialFacebook ||
              socialX ||
              socialInstagram ||
              socialLinkedin ||
              socialMedium ||
              unsubscribeUrl ||
              copyrightText ||
              companyAddress) && (
              <div className="mt-4 text-center">
                {(socialFacebook ||
                  socialX ||
                  socialInstagram ||
                  socialLinkedin ||
                  socialMedium) && (
                  <div className="flex items-center justify-center gap-4 py-2">
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
                {unsubscribeUrl && (
                  <p className="py-2 text-xs text-neutral-400 underline">
                    Unsubscribe
                  </p>
                )}
                {copyrightText && (
                  <p className="text-xs font-medium text-neutral-600">
                    {copyrightText}
                  </p>
                )}
                {companyAddress && (
                  <p className="mt-1 text-xs text-neutral-400">
                    {companyAddress}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-neutral-200 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
