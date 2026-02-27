import {
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  Loader2,
  Pencil,
  Send,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import EmailComposerFields from "@/components/marketing/email-composer-fields";
import EmailPreviewModal from "@/components/marketing/email-preview-modal";
import {
  createMarketingCampaign,
  getFooterSettings,
  saveFooterSettings,
  updateMarketingCampaign,
} from "@/server/campaigns";
import SendTestEmailModal from "@/components/campaigns/send-test-email-modal";

export type CampaignData = {
  id: string;
  name?: string | null;
  subject: string;
  content: string;
  content_blocks?: unknown[] | null;
  from_name?: string | null;
  header_image?: string | null;
  footer_image?: string | null;
  social_facebook?: string | null;
  social_x?: string | null;
  social_instagram?: string | null;
  social_linkedin?: string | null;
  social_medium?: string | null;
  unsubscribe_url?: string | null;
  copyright_text?: string | null;
  company_address?: string | null;
};

type Props = {
  campaign?: CampaignData;
};

export default function CreateCampaignForm({ campaign }: Props) {
  const isEditing = Boolean(campaign);
  const navigate = useNavigate();
  const [campaignId, setCampaignId] = useState(campaign?.id ?? null);
  const [campaignName, setCampaignName] = useState(
    campaign?.name ?? "Untitled campaign",
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [content, setContent] = useState(campaign?.content ?? "<p></p>");
  const [contentBlocks, setContentBlocks] = useState<unknown[] | null>(
    campaign?.content_blocks ?? null,
  );
  const [fromName, setFromName] = useState(campaign?.from_name ?? "");
  const [headerImage, setHeaderImage] = useState(campaign?.header_image ?? "");
  const [footerImage, setFooterImage] = useState(campaign?.footer_image ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  // Footer settings
  const [socialFacebook, setSocialFacebook] = useState(
    campaign?.social_facebook ?? "",
  );
  const [socialX, setSocialX] = useState(campaign?.social_x ?? "");
  const [socialInstagram, setSocialInstagram] = useState(
    campaign?.social_instagram ?? "",
  );
  const [socialLinkedin, setSocialLinkedin] = useState(
    campaign?.social_linkedin ?? "",
  );
  const [socialMedium, setSocialMedium] = useState(
    campaign?.social_medium ?? "",
  );
  const [unsubscribeUrl, setUnsubscribeUrl] = useState(
    campaign?.unsubscribe_url ?? "",
  );
  const [copyrightText, setCopyrightText] = useState(
    campaign?.copyright_text ?? "",
  );
  const [companyAddress, setCompanyAddress] = useState(
    campaign?.company_address ?? "",
  );
  const [footerExpanded, setFooterExpanded] = useState(false);
  const footerContentRef = useRef<HTMLDivElement>(null);
  const [footerContentHeight, setFooterContentHeight] = useState(0);

  useEffect(() => {
    if (footerExpanded && footerContentRef.current) {
      setFooterContentHeight(footerContentRef.current.scrollHeight || 1000);
    }
  }, [footerExpanded]);

  // Load saved footer settings on mount (only for new campaigns)
  useEffect(() => {
    if (isEditing) return;
    async function loadFooterSettings() {
      const result = await getFooterSettings();
      if (result.ok && result.settings) {
        setSocialFacebook(result.settings.socialFacebook || "");
        setSocialX(result.settings.socialX || "");
        setSocialInstagram(result.settings.socialInstagram || "");
        setSocialLinkedin(result.settings.socialLinkedin || "");
        setSocialMedium(result.settings.socialMedium || "");
        setUnsubscribeUrl(result.settings.unsubscribeUrl || "");
        setCopyrightText(result.settings.copyrightText || "©2025 Mulla Africa");
        setCompanyAddress(result.settings.companyAddress || "Abuja, Nigeria");
      }
    }
    loadFooterSettings();
  }, [isEditing]);

  // Focus name input when editing name
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      const input = nameInputRef.current;
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }, [isEditingName]);

  // Build the current payload for saving
  const buildPayload = useCallback(() => {
    return {
      name: campaignName || null,
      subject,
      content,
      contentBlocks: contentBlocks ?? undefined,
      fromName: fromName || null,
      headerImage: headerImage || null,
      footerImage: footerImage || null,
      socialFacebook: socialFacebook || null,
      socialX: socialX || null,
      socialInstagram: socialInstagram || null,
      socialLinkedin: socialLinkedin || null,
      socialMedium: socialMedium || null,
      unsubscribeUrl: unsubscribeUrl || null,
      copyrightText: copyrightText || null,
      companyAddress: companyAddress || null,
    };
  }, [
    campaignName,
    subject,
    content,
    contentBlocks,
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
  ]);

  // Auto-save effect — debounce 2 seconds after any field change
  // biome-ignore lint/correctness/useExhaustiveDependencies: buildPayload covers all field deps
  useEffect(() => {
    const payload = buildPayload();
    const snapshot = JSON.stringify(payload);

    // Skip if nothing changed since last save
    if (snapshot === lastSavedRef.current) return;

    // Don't auto-save if there's no meaningful content yet (brand new empty form)
    if (!campaignId && !subject.trim() && content === "<p></p>") return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        if (campaignId) {
          // Update existing
          const result = await updateMarketingCampaign({
            data: { campaignId, payload },
          });
          if (result.ok) {
            lastSavedRef.current = snapshot;
            setSaveStatus("saved");
          } else {
            setSaveStatus("error");
          }
        } else {
          // Create new draft
          const result = await createMarketingCampaign({ data: payload });
          if (result.ok && result.campaign) {
            setCampaignId(result.campaign.id);
            lastSavedRef.current = snapshot;
            setSaveStatus("saved");
            // Update URL to edit page without full reload
            window.history.replaceState(
              null,
              "",
              `/broadcasts/${result.campaign.id}/edit`,
            );
          } else {
            setSaveStatus("error");
          }
        }
      } catch {
        setSaveStatus("error");
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [buildPayload, campaignId]);

  // Clear "saved" status after 3 seconds
  useEffect(() => {
    if (saveStatus === "saved") {
      const t = setTimeout(() => setSaveStatus("idle"), 3000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    startSubmit(async () => {
      // Save footer settings to database for future campaigns
      await saveFooterSettings({
        data: {
          socialFacebook: socialFacebook || null,
          socialX: socialX || null,
          socialInstagram: socialInstagram || null,
          socialLinkedin: socialLinkedin || null,
          socialMedium: socialMedium || null,
          unsubscribeUrl: unsubscribeUrl || null,
          copyrightText: copyrightText || null,
          companyAddress: companyAddress || null,
        },
      });

      const payload = {
        name: campaignName || null,
        subject,
        content,
        contentBlocks: contentBlocks ?? undefined,
        fromName: fromName || null,
        headerImage: headerImage || null,
        footerImage: footerImage || null,
        socialFacebook: socialFacebook || null,
        socialX: socialX || null,
        socialInstagram: socialInstagram || null,
        socialLinkedin: socialLinkedin || null,
        socialMedium: socialMedium || null,
        unsubscribeUrl: unsubscribeUrl || null,
        copyrightText: copyrightText || null,
        companyAddress: companyAddress || null,
      };

      const result = campaignId
        ? await updateMarketingCampaign({ data: { campaignId, payload } })
        : await createMarketingCampaign({ data: payload });

      if (!result.ok) {
        setFeedback(
          result.message ??
            `Unable to ${isEditing ? "update" : "create"} campaign`,
        );
        return;
      }

      if (!result.campaign) {
        setFeedback("Campaign saved but missing payload");
        return;
      }

      setFeedback("Campaign saved. Redirecting...");
      navigate({ to: `/broadcasts/${result.campaign.id}` });
    });
  };

  return (
    <div className="p-10 space-y-6">
      {/* Header - sticky */}
      <div className="sticky top-0 z-30 -mx-10 -mt-10 bg-neutral-50/95 backdrop-blur-sm px-10 pt-10 pb-6 border-b border-neutral-200/80">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/broadcasts"
            search={{ cp: 1 }}
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Broadcasts
          </Link>
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600">Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <span className="text-red-500">Save failed</span>
            )}
          </div>
        </div>
        <div className="flex items-start justify-between">
          <div>
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                onBlur={() => {
                  if (!campaignName.trim())
                    setCampaignName("Untitled campaign");
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (!campaignName.trim())
                      setCampaignName("Untitled campaign");
                    setIsEditingName(false);
                  }
                }}
                size={Math.max(1, campaignName.length || 1)}
                className="text-2xl font-semibold text-neutral-900 tracking-tight bg-transparent outline-none py-0.5"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="group flex items-center gap-2"
              >
                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                  {campaignName || "Untitled campaign"}
                </h1>
                <Pencil className="h-4 w-4 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Eye className="h-4 w-4" />
              Preview email
            </button>
            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <Send className="h-4 w-4" />
              Send test email
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <EmailComposerFields
            subject={subject}
            onSubjectChange={setSubject}
            fromName={fromName}
            onFromNameChange={setFromName}
            content={content}
            onContentChange={(html, blocks) => {
              setContent(html);
              setContentBlocks(blocks);
            }}
            initialBlocks={campaign?.content_blocks ?? undefined}
            headerImage={headerImage}
            onHeaderImageChange={setHeaderImage}
            footerImage={footerImage}
            onFooterImageChange={setFooterImage}
          />

          {/* Footer Settings - Collapsible Card */}
          <div className="rounded-lg border border-neutral-200/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setFooterExpanded(!footerExpanded)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  Footer settings
                </p>
                <p className="text-xs text-neutral-500">
                  Social links, unsubscribe URL, and company info
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ease-in-out ${
                  footerExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: footerExpanded
                  ? footerContentHeight > 0
                    ? `${footerContentHeight}px`
                    : "1000px"
                  : "0px",
                opacity: footerExpanded ? 1 : 0,
              }}
            >
              <div
                ref={footerContentRef}
                className="space-y-4 border-t border-neutral-200/80 px-4 py-4"
              >
                {/* Social URLs */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-neutral-700">
                      Facebook URL
                    </span>
                    <input
                      type="url"
                      placeholder="https://facebook.com/yourpage"
                      value={socialFacebook}
                      onChange={(e) => setSocialFacebook(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-neutral-700">
                      X (Twitter) URL
                    </span>
                    <input
                      type="url"
                      placeholder="https://x.com/yourhandle"
                      value={socialX}
                      onChange={(e) => setSocialX(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-neutral-700">
                      Instagram URL
                    </span>
                    <input
                      type="url"
                      placeholder="https://instagram.com/yourhandle"
                      value={socialInstagram}
                      onChange={(e) => setSocialInstagram(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-neutral-700">
                      LinkedIn URL
                    </span>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/company/yourcompany"
                      value={socialLinkedin}
                      onChange={(e) => setSocialLinkedin(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-neutral-700">
                      Medium URL
                    </span>
                    <input
                      type="url"
                      placeholder="https://medium.com/@yourhandle"
                      value={socialMedium}
                      onChange={(e) => setSocialMedium(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-neutral-700">
                      Unsubscribe URL
                    </span>
                    <input
                      type="url"
                      placeholder="https://yoursite.com/unsubscribe"
                      value={unsubscribeUrl}
                      onChange={(e) => setUnsubscribeUrl(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                    />
                  </label>
                </div>

                {/* Company info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-neutral-700">
                      Copyright text
                    </span>
                    <input
                      type="text"
                      placeholder="©2025 Mulla Africa"
                      value={copyrightText}
                      onChange={(e) => setCopyrightText(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium text-neutral-700">
                      Company address
                    </span>
                    <input
                      type="text"
                      placeholder="Abuja, Nigeria"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <p
              className={`text-sm ${feedback.includes("sent") || feedback.includes("success") || feedback.includes("Redirecting") ? "text-emerald-600" : "text-red-600"}`}
            >
              {feedback}
            </p>
          )}

          {/* Submit */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {isSubmitting
                ? "Saving..."
                : campaignId
                  ? "Update campaign"
                  : "Create campaign"}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      <EmailPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        subject={subject}
        content={content}
        fromName={fromName}
        headerImage={headerImage}
        footerImage={footerImage}
        socialFacebook={socialFacebook}
        socialX={socialX}
        socialInstagram={socialInstagram}
        socialLinkedin={socialLinkedin}
        socialMedium={socialMedium}
        unsubscribeUrl={unsubscribeUrl}
        copyrightText={copyrightText}
        companyAddress={companyAddress}
      />

      {/* Send Test Email Modal */}
      <SendTestEmailModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        subject={subject}
        content={content}
        fromName={fromName || null}
        headerImage={headerImage || null}
        footerImage={footerImage || null}
        socialFacebook={socialFacebook || null}
        socialX={socialX || null}
        socialInstagram={socialInstagram || null}
        socialLinkedin={socialLinkedin || null}
        socialMedium={socialMedium || null}
        unsubscribeUrl={unsubscribeUrl || null}
        copyrightText={copyrightText || null}
        companyAddress={companyAddress || null}
      />
    </div>
  );
}
