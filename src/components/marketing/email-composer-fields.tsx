import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import EmailEditor from "@/components/marketing/email-editor";
import ImageField from "@/components/marketing/image-field";
import VariableInput from "@/components/marketing/variable-input";

export type EmailComposerFieldsProps = {
  subject: string;
  onSubjectChange: (val: string) => void;
  fromName: string;
  onFromNameChange: (val: string) => void;
  content: string;
  onContentChange: (html: string, blocks: unknown[]) => void;
  initialBlocks?: unknown[];
  headerImage: string;
  onHeaderImageChange: (val: string) => void;
  footerImage: string;
  onFooterImageChange: (val: string) => void;
};

export default function EmailComposerFields({
  subject,
  onSubjectChange,
  fromName,
  onFromNameChange,
  content,
  onContentChange,
  initialBlocks,
  headerImage,
  onHeaderImageChange,
  footerImage,
  onFooterImageChange,
}: EmailComposerFieldsProps) {
  const subjectId = useId();
  const fromNameId = useId();
  const bodyLabelId = useId();

  const [imagesExpanded, setImagesExpanded] = useState(false);
  const imagesContentRef = useRef<HTMLDivElement>(null);
  const [imagesContentHeight, setImagesContentHeight] = useState(0);

  // Recalculate content height when images change or section expands
  // biome-ignore lint/correctness/useExhaustiveDependencies: headerImage and footerImage intentionally trigger recalculation
  useEffect(() => {
    if (imagesExpanded && imagesContentRef.current) {
      const timer = setTimeout(() => {
        setImagesContentHeight(imagesContentRef.current?.scrollHeight || 500);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [imagesExpanded, headerImage, footerImage]);

  return (
    <div className="space-y-8">
      {/* Variable Help */}
      <div className="rounded-lg border border-purple-200/80 bg-purple-50/30 px-4 py-3">
        <p className="text-xs text-neutral-700">
          <span className="font-semibold">Personalize with variables:</span>{" "}
          Use{" "}
          <span className="inline-block rounded bg-purple-100 px-1.5 py-0.5 font-mono text-purple-600">
            {"{firstname}"}
          </span>
          ,{" "}
          <span className="inline-block rounded bg-purple-100 px-1.5 py-0.5 font-mono text-purple-600">
            {"{lastname}"}
          </span>
          , or{" "}
          <span className="inline-block rounded bg-purple-100 px-1.5 py-0.5 font-mono text-purple-600">
            {"{email}"}
          </span>{" "}
          in your subject line or email body to personalize for each customer.
        </p>
      </div>

      {/* From Name & Subject Line */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label
            className="text-sm font-semibold text-neutral-900"
            htmlFor={fromNameId}
          >
            From name
          </label>
          <input
            id={fromNameId}
            type="text"
            placeholder="Mulla Marketing"
            value={fromName}
            onChange={(e) => onFromNameChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-200/80 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
          <p className="text-xs text-neutral-400">
            Leave empty to use the default sender name.
          </p>
        </div>

        <div className="space-y-3">
          <label
            className="text-sm font-semibold text-neutral-900"
            htmlFor={subjectId}
          >
            Subject line *
          </label>
          <VariableInput
            value={subject}
            onChange={onSubjectChange}
            required
            id={subjectId}
            className="w-full rounded-lg border border-neutral-200/80 focus-within:border-neutral-400"
          />
        </div>
      </div>

      {/* Email Body Editor */}
      <div className="space-y-2">
        <p
          id={bodyLabelId}
          className="text-sm font-semibold text-neutral-900"
        >
          Email body *
        </p>
        <div role="group" aria-labelledby={bodyLabelId}>
          <EmailEditor
            value={content}
            onChange={onContentChange}
            // biome-ignore lint/suspicious/noExplicitAny: content_blocks is stored as JSONB and needs cast to BlockNote's block type
            initialBlocks={initialBlocks as any[] | undefined}
          />
        </div>
      </div>

      {/* Header/Footer Images - Collapsible Card */}
      <div className="rounded-lg border border-neutral-200/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setImagesExpanded(!imagesExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              Email images
            </p>
            <p className="text-xs text-neutral-500">
              Header and footer images for the email
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ease-in-out ${
              imagesExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: imagesExpanded
              ? imagesContentHeight > 0
                ? `${imagesContentHeight}px`
                : "800px"
              : "0px",
            opacity: imagesExpanded ? 1 : 0,
          }}
        >
          <div
            ref={imagesContentRef}
            className="grid gap-6 border-t border-neutral-200/80 px-4 py-4 md:grid-cols-2"
          >
            <ImageField
              label="Header image"
              helper="Paste a public URL or upload an image to appear at the top of the email."
              value={headerImage}
              onChange={onHeaderImageChange}
            />
            <ImageField
              label="Footer image"
              helper="Optional image that appears below the content (e.g. product collage)."
              value={footerImage}
              onChange={onFooterImageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
