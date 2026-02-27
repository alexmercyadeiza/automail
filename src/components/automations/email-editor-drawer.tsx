import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { SendEmailNodeData } from "./types";
import EmailComposerFields from "@/components/marketing/email-composer-fields";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: SendEmailNodeData;
  onChange: (data: SendEmailNodeData) => void;
};

export default function EmailEditorDrawer({
  isOpen,
  onClose,
  data,
  onChange,
}: Props) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[640px] flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Edit email
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <EmailComposerFields
                subject={data.subject}
                onSubjectChange={(val) => onChange({ ...data, subject: val })}
                fromName={data.fromName}
                onFromNameChange={(val) => onChange({ ...data, fromName: val })}
                content={data.content}
                onContentChange={(html, blocks) =>
                  onChange({ ...data, content: html, contentBlocks: blocks })
                }
                initialBlocks={
                  data.contentBlocks.length > 0 ? data.contentBlocks : undefined
                }
                headerImage={data.headerImage}
                onHeaderImageChange={(val) =>
                  onChange({ ...data, headerImage: val })
                }
                footerImage={data.footerImage}
                onFooterImageChange={(val) =>
                  onChange({ ...data, footerImage: val })
                }
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
