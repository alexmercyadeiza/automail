import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import Modal, {
  ButtonSpinner,
  ModalCancelButton,
  ModalError,
  ModalFooter,
  ModalSubmitButton,
} from "@/components/ui/modal";
import { sendTestCampaignEmail } from "@/server/campaigns";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  content: string;
  fromName: string | null;
  headerImage: string | null;
  footerImage: string | null;
  socialFacebook: string | null;
  socialX: string | null;
  socialInstagram: string | null;
  socialLinkedin: string | null;
  socialMedium: string | null;
  unsubscribeUrl: string | null;
  copyrightText: string | null;
  companyAddress: string | null;
};

export default function SendTestEmailModal({
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
}: Props) {
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const testNameId = useId();
  const testEmailId = useId();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!testEmail) {
      setFeedback("Please enter an email address");
      return;
    }

    startTransition(async () => {
      const result = await sendTestCampaignEmail({
        data: {
          subject,
          content,
          fromName,
          headerImage,
          footerImage,
          testEmail,
          testName,
          socialFacebook,
          socialX,
          socialInstagram,
          socialLinkedin,
          socialMedium,
          unsubscribeUrl,
          copyrightText,
          companyAddress,
        },
      });

      if (!result.ok) {
        setFeedback(result.message ?? "Unable to send test email");
        return;
      }

      setFeedback(null);
      toast.success("Test email sent", {
        description: `Email sent to ${testEmail}`,
      });
      onClose();
    });
  };

  const resetAndClose = () => {
    setFeedback(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Send test email"
      description="Preview the campaign in your inbox before sending to customers."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="text-sm font-medium text-neutral-700"
            htmlFor={testNameId}
          >
            Your name
          </label>
          <input
            type="text"
            value={testName}
            onChange={(event) => setTestName(event.target.value)}
            placeholder="e.g. John Doe (for variable preview)"
            id={testNameId}
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            className="text-sm font-medium text-neutral-700"
            htmlFor={testEmailId}
          >
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            placeholder="team@mulla.africa"
            id={testEmailId}
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <ModalError message={feedback} />

        <ModalFooter>
          <ModalCancelButton onClick={resetAndClose}>Cancel</ModalCancelButton>
          <ModalSubmitButton disabled={isPending}>
            {isPending ? (
              <>
                <ButtonSpinner />
                Sending...
              </>
            ) : (
              "Send test"
            )}
          </ModalSubmitButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
