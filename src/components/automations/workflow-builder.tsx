import {
  Check,
  ChevronLeft,
  Loader2,
  Pencil,
  GripVertical,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import type { NodeType, SendEmailNodeData, WorkflowNode } from "./types";
import WorkflowNodeCard from "./workflow-node-card";
import WorkflowConnector from "./workflow-connector";
import EmailEditorDrawer from "./email-editor-drawer";

type Props = {
  automationId?: string | null;
  initialName?: string;
  initialNodes?: WorkflowNode[];
  onSave: (name: string, nodes: WorkflowNode[]) => Promise<{ ok: boolean; id?: string }>;
};

function SortableNodeWrapper({
  node,
  index,
  totalNodes,
  onAddNode,
  onChange,
  onDelete,
  onEditEmail,
}: {
  node: WorkflowNode;
  index: number;
  totalNodes: number;
  onAddNode: (type: NodeType) => void;
  onChange: (updated: WorkflowNode) => void;
  onDelete?: () => void;
  onEditEmail?: (nodeId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: node.type === "trigger" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : totalNodes - index,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`relative flex flex-col items-center ${isDragging ? "opacity-50" : ""}`}
    >
      {index > 0 && (
        <WorkflowConnector onAddNode={onAddNode} />
      )}
      <div className="relative group">
        {node.type !== "trigger" && (
          <div
            {...attributes}
            {...listeners}
            className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <WorkflowNodeCard
          node={node}
          onChange={onChange}
          onDelete={onDelete}
          onEditEmail={onEditEmail}
        />
      </div>
    </motion.div>
  );
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function createDefaultNode(type: NodeType): WorkflowNode {
  switch (type) {
    case "trigger":
      return { id: generateId(), type, data: { event: "signed_up" } };
    case "send_email":
      return { id: generateId(), type, data: { subject: "", fromName: "", content: "<p></p>", contentBlocks: [], headerImage: "", footerImage: "" } };
    case "time_delay":
      return { id: generateId(), type, data: { amount: 1, unit: "days" } };
    case "condition":
      return {
        id: generateId(),
        type,
        data: { field: "", operator: "equals", value: "" },
      };
    case "time_window":
      return {
        id: generateId(),
        type,
        data: { startHour: 9, endHour: 17, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
      };
    case "exit":
      return { id: generateId(), type, data: {} };
  }
}

const DEFAULT_NODES: WorkflowNode[] = [
  createDefaultNode("trigger"),
];

export default function WorkflowBuilder({
  automationId,
  initialName,
  initialNodes,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName ?? "Untitled automation");
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>(
    initialNodes && initialNodes.length > 0 ? initialNodes : DEFAULT_NODES,
  );

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const savedIdRef = useRef<string | null>(automationId ?? null);

  // Focus name input when editing
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      const input = nameInputRef.current;
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }, [isEditingName]);

  // Auto-save with debounce
  const doSave = useCallback(async () => {
    const snapshot = JSON.stringify({ name, nodes });
    if (snapshot === lastSavedRef.current) return;

    setSaveStatus("saving");
    try {
      const result = await onSave(name, nodes);
      if (result.ok) {
        lastSavedRef.current = snapshot;
        setSaveStatus("saved");
        if (result.id && !savedIdRef.current) {
          savedIdRef.current = result.id;
          window.history.replaceState(null, "", `/campaigns/${result.id}`);
        }
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, [name, nodes, onSave]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: doSave covers deps
  useEffect(() => {
    const snapshot = JSON.stringify({ name, nodes });
    if (snapshot === lastSavedRef.current) return;

    // Don't auto-save empty form
    if (!savedIdRef.current && name === "Untitled automation" && nodes.length <= 1) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(doSave, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [doSave, name, nodes]);

  // Clear "saved" indicator after 3s
  useEffect(() => {
    if (saveStatus === "saved") {
      const t = setTimeout(() => setSaveStatus("idle"), 3000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  const handleNodeChange = (index: number, updatedNode: WorkflowNode) => {
    setNodes((prev) => prev.map((n, i) => (i === index ? updatedNode : n)));
  };

  const handleDeleteNode = (index: number) => {
    setNodes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInsertNode = (afterIndex: number, type: NodeType) => {
    const newNode = createDefaultNode(type);
    setNodes((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newNode);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setNodes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Prevent moving trigger node or moving nodes before trigger
        if (oldIndex === 0 || newIndex === 0) return items;

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:20px_20px] p-10 space-y-6">
      {/* Header - sticky */}
      <div className="sticky top-0 z-30 -mx-10 -mt-10 px-10 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Campaigns
          </Link>
          {/* Save indicator */}
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (!name.trim()) setName("Untitled automation");
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (!name.trim()) setName("Untitled automation");
                    setIsEditingName(false);
                  }
                }}
                size={Math.max(1, name.length || 1)}
                className="text-2xl font-semibold text-neutral-900 tracking-tight bg-transparent outline-none py-0.5"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="group flex items-center gap-2"
              >
                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                  {name || "Untitled automation"}
                </h1>
                <Pencil className="h-4 w-4 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => doSave()}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Save workflow
          </button>
        </div>
      </div>

      {/* Workflow Canvas */}
      <div className="flex flex-col items-center py-12">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={nodes.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <AnimatePresence mode="popLayout">
              {nodes.map((node, index) => (
                <SortableNodeWrapper
                  key={node.id}
                  node={node}
                  index={index}
                  totalNodes={nodes.length}
                  onAddNode={(type) => handleInsertNode(index - 1, type)}
                  onChange={(updated) => handleNodeChange(index, updated)}
                  onDelete={
                    node.type === "trigger"
                      ? undefined
                      : () => handleDeleteNode(index)
                  }
                  onEditEmail={setEditingNodeId}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>

        {/* Add node at end */}
        <motion.div layout style={{ zIndex: 0 }} className="flex flex-col items-center relative">
          <WorkflowConnector
            onAddNode={(type) => handleInsertNode(nodes.length - 1, type)}
          />

          {/* End indicator */}
          <div className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        </motion.div>
      </div>

      {/* Email Editor Drawer */}
      {(() => {
        const editingNode = editingNodeId
          ? nodes.find((n) => n.id === editingNodeId && n.type === "send_email")
          : null;
        return (
          <EmailEditorDrawer
            isOpen={editingNode !== null && editingNode !== undefined}
            onClose={() => setEditingNodeId(null)}
            data={
              editingNode
                ? (editingNode.data as SendEmailNodeData)
                : { subject: "", fromName: "", content: "<p></p>", contentBlocks: [], headerImage: "", footerImage: "" }
            }
            onChange={(data) => {
              if (!editingNodeId) return;
              const index = nodes.findIndex((n) => n.id === editingNodeId);
              if (index !== -1) {
                handleNodeChange(index, { ...nodes[index], data });
              }
            }}
          />
        );
      })()}
    </div>
  );
}
