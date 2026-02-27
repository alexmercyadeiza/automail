export type NodeType =
  | "trigger"
  | "send_email"
  | "time_delay"
  | "condition"
  | "time_window"
  | "exit";

export type TriggerEvent =
  | "signed_up"
  | "made_purchase"
  | "abandoned_cart"
  | "tagged"
  | "entered_segment";

export type TriggerNodeData = {
  event: TriggerEvent;
};

export type SendEmailNodeData = {
  subject: string;
  fromName: string;
  content: string;
  contentBlocks: unknown[];
  headerImage: string;
  footerImage: string;
};

export type TimeDelayNodeData = {
  amount: number;
  unit: "minutes" | "hours" | "days";
};

export type ConditionNodeData = {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: string;
};

export type TimeWindowNodeData = {
  startHour: number;
  endHour: number;
  days: string[];
};

export type ExitNodeData = Record<string, never>;

export type WorkflowNode = {
  id: string;
  type: NodeType;
  data:
    | TriggerNodeData
    | SendEmailNodeData
    | TimeDelayNodeData
    | ConditionNodeData
    | TimeWindowNodeData
    | ExitNodeData;
};

export type AutomationCampaign = {
  id: string;
  name: string;
  status: "draft" | "active" | "paused";
  nodes: WorkflowNode[];
  created_at: string;
  updated_at?: string | null;
};

export const NODE_TYPE_META: Record<
  NodeType,
  { label: string; description: string; pillBg: string; pillText: string }
> = {
  trigger: {
    label: "Launch action",
    description: "Starts the workflow when this event occurs",
    pillBg: "bg-purple-100",
    pillText: "text-purple-700",
  },
  send_email: {
    label: "Capture action",
    description: "Sends an email to the contact",
    pillBg: "bg-green-100",
    pillText: "text-green-700",
  },
  time_delay: {
    label: "Wait action",
    description: "Pauses the workflow for a specific duration",
    pillBg: "bg-amber-100",
    pillText: "text-amber-700",
  },
  condition: {
    label: "Check if / else",
    description: "Splits the workflow based on contact data",
    pillBg: "bg-cyan-100",
    pillText: "text-cyan-700",
  },
  time_window: {
    label: "Time window",
    description: "Only allows contacts to proceed during these hours",
    pillBg: "bg-blue-100",
    pillText: "text-blue-700",
  },
  exit: {
    label: "Cancel action",
    description: "Removes the contact from this workflow",
    pillBg: "bg-red-100",
    pillText: "text-red-700",
  },
};

export const TRIGGER_EVENTS: { value: TriggerEvent; label: string }[] = [
  { value: "signed_up", label: "Customer signed up" },
  { value: "made_purchase", label: "Made a purchase" },
  { value: "abandoned_cart", label: "Abandoned cart" },
  { value: "tagged", label: "Tagged with label" },
  { value: "entered_segment", label: "Entered segment" },
];
