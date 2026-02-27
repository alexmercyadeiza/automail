import { createServerFn } from "@tanstack/react-start";
import { createServiceClient } from "@/lib/supabase/service";
import type { WorkflowNode } from "@/components/automations/types";

export type AutomationPayload = {
  name: string;
  nodes: WorkflowNode[];
};

export const createAutomation = createServerFn({ method: "POST" })
  .inputValidator((d: AutomationPayload) => d)
  .handler(async ({ data: payload }) => {
    if (!payload.name.trim()) {
      return { ok: false, message: "Name is required" };
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("automation_campaigns")
      .insert({
        name: payload.name.trim(),
        status: "draft",
        nodes: payload.nodes,
      })
      .select("id,name,status,nodes,created_at,updated_at")
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, automation: data };
  });

export const updateAutomation = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; payload: AutomationPayload }) => d)
  .handler(async ({ data }) => {
    const { id, payload } = data;

    if (!id) {
      return { ok: false, message: "Missing automation id" };
    }

    const supabase = createServiceClient();

    const { data: automation, error } = await supabase
      .from("automation_campaigns")
      .update({
        name: payload.name.trim(),
        nodes: payload.nodes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,name,status,nodes,created_at,updated_at")
      .single();

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, automation };
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .inputValidator((d: string) => d)
  .handler(async ({ data: id }) => {
    if (!id) {
      return { ok: false, message: "Missing automation id" };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("automation_campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  });

export const updateAutomationStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "draft" | "active" | "paused" }) => d)
  .handler(async ({ data }) => {
    if (!data.id) {
      return { ok: false, message: "Missing automation id" };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("automation_campaigns")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  });
