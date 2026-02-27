import { createFileRoute } from "@tanstack/react-router";
import { createServiceClient } from "@/lib/supabase/service";

export const Route = createFileRoute("/api/automations/enroll")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { automationId, customerId } = body as {
            automationId?: string;
            customerId?: string;
          };

          if (!automationId || !customerId) {
            return new Response(
              JSON.stringify({ ok: false, message: "automationId and customerId are required" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const supabase = createServiceClient();

          // Verify automation exists and is active
          const { data: automation, error: autoError } = await supabase
            .from("automation_campaigns")
            .select("id, status, nodes")
            .eq("id", automationId)
            .single();

          if (autoError || !automation) {
            return new Response(
              JSON.stringify({ ok: false, message: "Automation not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } },
            );
          }

          if (automation.status !== "active") {
            return new Response(
              JSON.stringify({ ok: false, message: "Automation is not active" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const nodes = automation.nodes as Array<{ id: string; type: string }>;
          if (!nodes || nodes.length === 0) {
            return new Response(
              JSON.stringify({ ok: false, message: "Automation has no nodes" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Find first non-trigger node (the node after the trigger)
          const firstNodeIndex = nodes[0]?.type === "trigger" ? 1 : 0;
          const firstNode = nodes[firstNodeIndex];

          if (!firstNode) {
            return new Response(
              JSON.stringify({ ok: false, message: "Automation has no actionable nodes" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Check if customer is already enrolled in this automation
          const { data: existing } = await supabase
            .from("automation_enrollments")
            .select("id")
            .eq("automation_id", automationId)
            .eq("customer_id", customerId)
            .eq("status", "active")
            .maybeSingle();

          if (existing) {
            return new Response(
              JSON.stringify({ ok: false, message: "Customer is already enrolled in this automation" }),
              { status: 409, headers: { "Content-Type": "application/json" } },
            );
          }

          // Create enrollment
          const { data: enrollment, error: enrollError } = await supabase
            .from("automation_enrollments")
            .insert({
              automation_id: automationId,
              customer_id: customerId,
              current_node_id: firstNode.id,
              status: "active",
              next_process_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (enrollError) {
            return new Response(
              JSON.stringify({ ok: false, message: enrollError.message }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(
            JSON.stringify({ ok: true, enrollmentId: enrollment.id }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Internal server error";
          return new Response(
            JSON.stringify({ ok: false, message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
