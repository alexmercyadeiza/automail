import { Plus, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NodeType } from "./types";
import { NODE_TYPE_META } from "./types";

type Props = {
  onAddNode: (type: NodeType) => void;
};

const INSERTABLE_TYPES: NodeType[] = [
  "send_email",
  "time_delay",
  "exit",
];

export default function WorkflowConnector({ onAddNode }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="flex flex-col items-center relative py-4" ref={menuRef}>
      {/* Arrow Line */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-px h-full bg-neutral-300" />
      </div>

      {/* Add button */}
      <div className="relative z-40 my-6">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-6 w-6 items-center justify-center rounded-full border bg-white transition-all duration-200 ${
            isOpen
              ? "border-neutral-900 text-neutral-900 shadow-md scale-110"
              : "border-neutral-300 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 hover:shadow-sm hover:scale-110"
          }`}
        >
          <Plus className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`} />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-1/2 top-full z-[100] mt-2 -translate-x-1/2 w-72 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl"
            >
              {INSERTABLE_TYPES.map((type) => {
                const meta = NODE_TYPE_META[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      onAddNode(type);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
                  >
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.pillBg} ${meta.pillText}`}>
                      <span className="h-2 w-2 rounded-full bg-current" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-neutral-900">{meta.label}</span>
                      <span className="text-xs text-neutral-500">{meta.description}</span>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
