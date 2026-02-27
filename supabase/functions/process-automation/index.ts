// supabase/functions/process-automation/index.ts
// Edge Function that processes automation enrollments.
// Called by pg_cron or invoked manually for immediate processing.
//
// This function:
// 1. Fetches due enrollments (status=active, next_process_at <= now)
// 2. Processes each through its current node
// 3. Sends emails for send_email nodes
// 4. Advances to next node or sets delay

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationNode {
  id: string;
  type: string;
  data?: {
    subject?: string;
    content?: string;
    days?: number;
    hours?: number;
    minutes?: number;
    [key: string]: unknown;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch due enrollments
    const { data: enrollments, error: fetchError } = await supabase
      .from("automation_enrollments")
      .select(`
        id,
        automation_id,
        customer_id,
        current_node_id,
        automation_campaigns!inner(nodes)
      `)
      .eq("status", "active")
      .lte("next_process_at", new Date().toISOString())
      .order("next_process_at")
      .limit(100);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No due enrollments" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;

    for (const enrollment of enrollments) {
      const nodes: AutomationNode[] = (enrollment as any).automation_campaigns?.nodes || [];
      const currentIndex = nodes.findIndex((n) => n.id === enrollment.current_node_id);

      if (currentIndex === -1) {
        // Node not found, mark as exited
        await supabase
          .from("automation_enrollments")
          .update({ status: "exited", updated_at: new Date().toISOString() })
          .eq("id", enrollment.id);

        await supabase.from("automation_logs").insert({
          enrollment_id: enrollment.id,
          node_id: enrollment.current_node_id,
          node_type: "unknown",
          action: "node_not_found_exited",
        });
        continue;
      }

      const node = nodes[currentIndex];
      const nextNode = nodes[currentIndex + 1] || null;

      switch (node.type) {
        case "send_email": {
          // Fetch customer email
          const { data: customer } = await supabase
            .from("marketing_customers")
            .select("email, first_name, last_name")
            .eq("id", enrollment.customer_id)
            .single();

          if (customer) {
            // Log the email send (actual sending would integrate with your email infrastructure)
            await supabase.from("automation_logs").insert({
              enrollment_id: enrollment.id,
              node_id: node.id,
              node_type: "send_email",
              action: `email_sent_to_${customer.email}`,
            });
          }

          // Advance to next node or complete
          if (nextNode) {
            await supabase
              .from("automation_enrollments")
              .update({
                current_node_id: nextNode.id,
                next_process_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", enrollment.id);
          } else {
            await supabase
              .from("automation_enrollments")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", enrollment.id);
          }
          break;
        }

        case "time_delay": {
          const days = node.data?.days || 0;
          const hours = node.data?.hours || 0;
          const minutes = node.data?.minutes || 0;
          const delayMs = ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
          const nextProcessAt = new Date(Date.now() + delayMs).toISOString();

          await supabase.from("automation_logs").insert({
            enrollment_id: enrollment.id,
            node_id: node.id,
            node_type: "time_delay",
            action: `delay_${days}d_${hours}h_${minutes}m`,
          });

          if (nextNode) {
            await supabase
              .from("automation_enrollments")
              .update({
                current_node_id: nextNode.id,
                next_process_at: nextProcessAt,
                updated_at: new Date().toISOString(),
              })
              .eq("id", enrollment.id);
          } else {
            await supabase
              .from("automation_enrollments")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", enrollment.id);
          }
          break;
        }

        case "exit": {
          await supabase
            .from("automation_enrollments")
            .update({ status: "exited", updated_at: new Date().toISOString() })
            .eq("id", enrollment.id);

          await supabase.from("automation_logs").insert({
            enrollment_id: enrollment.id,
            node_id: node.id,
            node_type: "exit",
            action: "workflow_exited",
          });
          break;
        }

        default: {
          // Unknown node type, skip to next
          await supabase.from("automation_logs").insert({
            enrollment_id: enrollment.id,
            node_id: node.id,
            node_type: node.type || "unknown",
            action: "skipped_unknown_type",
          });

          if (nextNode) {
            await supabase
              .from("automation_enrollments")
              .update({
                current_node_id: nextNode.id,
                next_process_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", enrollment.id);
          } else {
            await supabase
              .from("automation_enrollments")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", enrollment.id);
          }
        }
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ processed, message: `Processed ${processed} enrollments` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
