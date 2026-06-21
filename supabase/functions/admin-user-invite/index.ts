import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
const REDIRECT_URL =
  Deno.env.get("INVITE_REDIRECT_URL") || Deno.env.get("RESET_REDIRECT_URL");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY environment variables.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function randomPassword() {
  const random = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(random)
    .map((n) => n.toString(36).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: Record<string, unknown>;

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = String(payload.action || "").toLowerCase();
  const email = String(payload.email || "").trim().toLowerCase();
  const full_name = String(payload.full_name || "").trim();
  const role_id = String(payload.role_id || "").trim();
  const user_id = String(payload.user_id || "").trim();

  if (!email) {
    return jsonResponse({ error: "Email is required." }, 400);
  }

  const baseUrl = new URL(req.url).origin;
  const redirectTo = REDIRECT_URL || `${baseUrl}/admin/accept-invite.html`;

  try {
    if (action === "invite") {
      const tempPassword = randomPassword();

      const createResponse = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        user_metadata: {
          full_name,
          role_id,
        },
        email_confirm: true,
      });

      if (createResponse.error) {
        const message = String(createResponse.error.message || "").toLowerCase();

        if (
  message.includes("already exists") ||
  message.includes("already registered") ||
  message.includes("already been registered") ||
  message.includes("email address has already")
) {
          const resendResponse = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo,
          });

          if (resendResponse.error) {
            console.error("Failed to resend invite/reset email:", resendResponse.error);
            return jsonResponse(
              { error: resendResponse.error.message || "Unable to resend invite link." },
              500
            );
          }

          if (user_id) {
            const { error: updateError } = await supabaseAdmin
              .from("users")
              .update({
                status: "pending",
                invite_sent_at: new Date().toISOString(),
              })
              .eq("id", user_id);

            if (updateError) {
              console.warn("Unable to update pending status for users row:", updateError);
            }
          }

          return jsonResponse({ message: "Invite resent to existing auth user." });
        }

        console.error("Failed to create auth user:", createResponse.error);
        return jsonResponse(
          { error: createResponse.error.message || "Unable to create auth user." },
          500
        );
      }

      const resetResponse = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetResponse.error) {
        console.error("Failed to send invite/reset email:", resetResponse.error);
        return jsonResponse(
          { error: resetResponse.error.message || "Unable to send invite link." },
          500
        );
      }

      if (user_id) {
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update({
            status: "pending",
            invite_sent_at: new Date().toISOString(),
          })
          .eq("id", user_id);

        if (updateError) {
          console.warn("Unable to update pending status for users row:", updateError);
        }
      }

      return jsonResponse({ message: "Invite email sent." });
    }

    if (action === "reset_password") {
      const resetResponse = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetResponse.error) {
        console.error("Failed to send password reset email:", resetResponse.error);
        return jsonResponse(
          { error: resetResponse.error.message || "Unable to send reset email." },
          500
        );
      }

      return jsonResponse({ message: "Password reset email sent." });
    }

    return jsonResponse({ error: "Invalid action." }, 400);
  } catch (error) {
    console.error("Function error:", error);
    return jsonResponse(
      { error: String(error?.message || error || "Unknown error") },
      500
    );
  }
});