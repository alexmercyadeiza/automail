import { Trash2, ChevronDown, Check, Zap, Mail, Clock, HelpCircle, Calendar, XCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  WorkflowNode,
  TriggerNodeData,
  SendEmailNodeData,
  TimeDelayNodeData,
  ConditionNodeData,
  TimeWindowNodeData,
  TriggerEvent,
  NodeType,
} from "./types";
import { NODE_TYPE_META, TRIGGER_EVENTS } from "./types";

const NODE_ICONS: Record<NodeType, React.ElementType> = {
  trigger: Zap,
  send_email: Mail,
  time_delay: Clock,
  condition: HelpCircle,
  time_window: Calendar,
  exit: XCircle,
};

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  disabledValues = [],
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  disabledValues?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200/50"
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-xl"
          >
            {options.map((option) => {
              const isDisabled = disabledValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold ${
                    isDisabled
                      ? "text-neutral-300 cursor-not-allowed"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {value === option.value && <Check className="h-4 w-4 text-neutral-900" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Props = {
  node: WorkflowNode;
  onChange: (node: WorkflowNode) => void;
  onDelete?: () => void;
  onEditEmail?: (nodeId: string) => void;
};

export default function WorkflowNodeCard({ node, onChange, onDelete, onEditEmail }: Props) {
  const meta = NODE_TYPE_META[node.type];
  const Icon = NODE_ICONS[node.type];

  return (
    <div className="relative flex flex-col items-center group">
      {/* Pill */}
      <div
        className={`relative z-10 -mb-px inline-flex items-center gap-1.5 rounded-t-md px-3 py-1 text-xs font-semibold ${meta.pillBg} ${meta.pillText}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </div>

      {/* Card */}
      <div className="relative z-0 min-w-[240px] max-w-[380px] w-max rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="absolute right-2 top-2 z-20 rounded-md p-1.5 text-neutral-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <div className="space-y-2">
          {node.type === "trigger" && (
            <TriggerBody
              data={node.data as TriggerNodeData}
              onChange={(data) => onChange({ ...node, data })}
            />
          )}
          {node.type === "send_email" && (
            <SendEmailBody
              data={node.data as SendEmailNodeData}
              onChange={(data) => onChange({ ...node, data })}
              onEditEmail={() => onEditEmail?.(node.id)}
            />
          )}
          {node.type === "time_delay" && (
            <TimeDelayBody
              data={node.data as TimeDelayNodeData}
              onChange={(data) => onChange({ ...node, data })}
            />
          )}
          {node.type === "condition" && (
            <ConditionBody
              data={node.data as ConditionNodeData}
              onChange={(data) => onChange({ ...node, data })}
            />
          )}
          {node.type === "time_window" && (
            <TimeWindowBody
              data={node.data as TimeWindowNodeData}
              onChange={(data) => onChange({ ...node, data })}
            />
          )}
          {node.type === "exit" && (
            <div className="text-center">
              <p className="text-sm font-semibold text-neutral-900">End of workflow</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1">
                Contacts reaching this step will exit.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const AVAILABLE_TRIGGERS: TriggerEvent[] = ["signed_up"];

const TRIGGER_OPTIONS = TRIGGER_EVENTS.map((t) => ({
  value: t.value,
  label: `# ${t.label}`,
}));

const DISABLED_TRIGGERS = TRIGGER_EVENTS
  .filter((t) => !AVAILABLE_TRIGGERS.includes(t.value))
  .map((t) => t.value);

function TriggerBody({
  data,
  onChange,
}: {
  data: TriggerNodeData;
  onChange: (d: TriggerNodeData) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-neutral-700 whitespace-nowrap">
      <span>When</span>
      <CustomSelect
        value={data.event}
        onChange={(val) => onChange({ event: val as TriggerEvent })}
        options={TRIGGER_OPTIONS}
        disabledValues={DISABLED_TRIGGERS}
        className="w-48"
      />
      <span>happens</span>
    </div>
  );
}

function SendEmailBody({
  data,
  onEditEmail,
}: {
  data: SendEmailNodeData;
  onChange: (d: SendEmailNodeData) => void;
  onEditEmail?: () => void;
}) {
  const hasContent = data.subject.trim() || (data.content && data.content !== "<p></p>");

  return (
    <div className="flex flex-col items-center text-center space-y-2">
      {hasContent ? (
        <>
          <p className="text-sm font-semibold text-neutral-900 line-clamp-1 max-w-[280px]">
            {data.subject || "No subject"}
          </p>
          <button
            type="button"
            onClick={onEditEmail}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            <Mail className="h-3 w-3" />
            Edit email
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onEditEmail}
          className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
        >
          <Mail className="h-3.5 w-3.5" />
          Add email content
        </button>
      )}
    </div>
  );
}

function TimeDelayBody({
  data,
  onChange,
}: {
  data: TimeDelayNodeData;
  onChange: (d: TimeDelayNodeData) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-neutral-700 whitespace-nowrap">
      <span>Wait for</span>
      <input
        type="number"
        min={1}
        value={data.amount}
        onChange={(e) =>
          onChange({ ...data, amount: Math.max(1, Number(e.target.value)) })
        }
        className="w-16 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-center text-sm font-semibold focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <CustomSelect
        value={data.unit}
        onChange={(val) => onChange({ ...data, unit: val as TimeDelayNodeData["unit"] })}
        options={[
          { value: "minutes", label: "minutes" },
          { value: "hours", label: "hours" },
          { value: "days", label: "days" },
        ]}
        className="w-28"
      />
    </div>
  );
}

function ConditionBody({
  data,
  onChange,
}: {
  data: ConditionNodeData;
  onChange: (d: ConditionNodeData) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-sm font-semibold text-neutral-700">
      <div className="flex items-center gap-2 w-full">
        <span>If</span>
        <input
          type="text"
          placeholder="field"
          value={data.field}
          onChange={(e) => onChange({ ...data, field: e.target.value })}
          className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm font-semibold focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200/50"
        />
      </div>
      <div className="flex items-center gap-2 w-full">
        <CustomSelect
          value={data.operator}
          onChange={(val) => onChange({ ...data, operator: val as ConditionNodeData["operator"] })}
          options={[
            { value: "equals", label: "is equal to" },
            { value: "not_equals", label: "is not equal to" },
            { value: "contains", label: "contains" },
            { value: "greater_than", label: "is greater than" },
            { value: "less_than", label: "is less than" },
          ]}
          className="w-36"
        />
        <input
          type="text"
          placeholder="value"
          value={data.value}
          onChange={(e) => onChange({ ...data, value: e.target.value })}
          className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm font-semibold focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200/50"
        />
      </div>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function TimeWindowBody({
  data,
  onChange,
}: {
  data: TimeWindowNodeData;
  onChange: (d: TimeWindowNodeData) => void;
}) {
  const toggleDay = (day: string) => {
    const days = data.days.includes(day)
      ? data.days.filter((d) => d !== day)
      : [...data.days, day];
    onChange({ ...data, days });
  };

  return (
    <div className="flex flex-col items-center gap-3 text-sm font-semibold text-neutral-700">
      <div className="flex items-center justify-center gap-2">
        <span>Between</span>
        <input
          type="number"
          min={0}
          max={23}
          value={data.startHour}
          onChange={(e) =>
            onChange({ ...data, startHour: Number(e.target.value) })
          }
          className="w-14 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-center text-sm font-semibold focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span>:00 and</span>
        <input
          type="number"
          min={0}
          max={23}
          value={data.endHour}
          onChange={(e) =>
            onChange({ ...data, endHour: Number(e.target.value) })
          }
          className="w-14 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-center text-sm font-semibold focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span>:00</span>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              data.days.includes(day)
                ? "bg-blue-100 text-blue-800 shadow-sm ring-1 ring-blue-200"
                : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 border border-neutral-200"
            }`}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}
