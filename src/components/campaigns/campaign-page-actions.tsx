import { Copy, Mail, Pencil, Send } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { duplicateMarketingCampaign } from "@/server/campaigns";
import SendTestEmailModal from "@/components/campaigns/send-test-email-modal";
import SendCampaignModal from "@/components/campaigns/send-campaign-modal";

type EmailList = {
  id: string;
  name: string;
  customer_count?: number;
};

type Props = {
  campaignId: string;
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
  status: string;
  customerCount: number;
  lists: EmailList[];
};

export default function CampaignPageActions({
  campaignId,
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
  status,
  customerCount,
  lists,
}: Props) {
  const navigate = useNavigate();
  const [showTestModal, setShowTestModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [isDuplicating, startDuplicate] = useTransition();

  const isSent = status === "sent";

  const handleDuplicate = () => {
    startDuplicate(async () => {
      const result = await duplicateMarketingCampaign({ data: campaignId });
      if (result.ok && result.campaignId) {
        navigate({ to: `/broadcasts/${result.campaignId}/edit` });
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {!isSent && (
          <Link
            to="/broadcasts/$id/edit"
            params={{ id: campaignId }}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        )}
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={isDuplicating}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy className="h-4 w-4" />
          {isDuplicating ? "Duplicating..." : "Duplicate"}
        </button>
        <button
          type="button"
          onClick={() => setShowTestModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Mail className="h-4 w-4" />
          Send test
        </button>
        <button
          type="button"
          onClick={() => setShowSendModal(true)}
          disabled={isSent}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          <Send className="h-4 w-4" />
          Send campaign
        </button>
      </div>

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

      <SendCampaignModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        campaignId={campaignId}
        status={status}
        customerCount={customerCount}
        lists={lists}
      />
    </>
  );
}
