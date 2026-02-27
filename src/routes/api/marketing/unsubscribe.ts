import { createFileRoute } from "@tanstack/react-router";
import { createServiceClient } from "@/lib/supabase/service";

export const Route = createFileRoute("/api/marketing/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const email = body.email?.trim().toLowerCase();

          if (!email) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Email address is required",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const supabase = createServiceClient();
          const { error, count } = await supabase
            .from("marketing_customers")
            .delete()
            .eq("email", email)
            .select();

          if (error) {
            console.error("Unsubscribe error:", error);
            return new Response(
              JSON.stringify({
                success: false,
                message: "Failed to process unsubscribe request",
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          console.log(
            `Unsubscribed: ${email} (${count ? "found and removed" : "not found"})`,
          );

          return new Response(
            JSON.stringify({
              success: true,
              message: "Successfully unsubscribed",
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          console.error("Unsubscribe exception:", err);
          return new Response(
            JSON.stringify({ success: false, message: "An error occurred" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
