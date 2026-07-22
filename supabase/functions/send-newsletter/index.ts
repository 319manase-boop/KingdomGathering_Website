import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "newsletter@kingdomgatheringchurch.org";
const FROM_NAME = "Kingdom Gathering Church";

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };
}

function jsonResponse(body: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin)
    }
  });
}

function getPreferenceKey(campaignType: string) {
  switch (campaignType.toLowerCase()) {
    case "blog":
      return "blog_posts";
    case "event":
      return "events";
    default:
      return "announcements";
  }
}

function getPreferenceValue(preferences: unknown, preferenceKey: string) {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
    return undefined;
  }

  const value = (preferences as Record<string, unknown>)[preferenceKey];
  return typeof value === "boolean" ? value : undefined;
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin)
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Missing Supabase configuration." }, 500, origin);
  }

  if (!RESEND_API_KEY) {
    return jsonResponse({ error: "Missing RESEND_API_KEY secret." }, 500, origin);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, origin);
  }

  const campaignId = String(payload.campaign_id || "").trim();
  if (!campaignId) {
    return jsonResponse({ error: "campaign_id is required." }, 400, origin);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: {
      headers: {
        "x-ssr": "1"
      }
    }
  });

  try {
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .select("id, status, subject, content, campaign_type")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) {
      throw campaignError;
    }

    if (!campaign) {
      return jsonResponse({ error: "Campaign not found." }, 404, origin);
    }

    const currentStatus = String(campaign.status || "").toLowerCase();
    if (!["ready", "scheduled"].includes(currentStatus)) {
      return jsonResponse({ error: `Campaign status \"${campaign.status}\" is not eligible for sending.` }, 400, origin);
    }

    const { error: statusUpdateError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .update({ status: "sending", updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    if (statusUpdateError) {
      throw statusUpdateError;
    }

    const { data: subscribers, error: subscriberError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, campaign_preferences")
      .eq("status", "active");

    if (subscriberError) {
      throw subscriberError;
    }

    const preferenceKey = getPreferenceKey(String(campaign.campaign_type || "Announcement"));
    const eligibleSubscribers = (subscribers || []).filter((subscriber: Record<string, unknown>) => {
      const preferenceValue = getPreferenceValue(subscriber.campaign_preferences, preferenceKey);
      return preferenceValue === undefined ? true : preferenceValue;
    });

    const results: Array<Record<string, unknown>> = [];
    let hadFailure = false;

    for (const subscriber of eligibleSubscribers) {
      const email = String(subscriber.email || "").trim();
      if (!email) {
        continue;
      }

      const { data: logRow, error: logError } = await supabaseAdmin
        .from("newsletter_campaign_logs")
        .insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email,
          status: "pending",
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (logError || !logRow) {
        hadFailure = true;
        results.push({ email, status: "failed", error: String(logError?.message || "Unable to create delivery log.") });
        continue;
      }

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [email],
            subject: String(campaign.subject || "Church Newsletter"),
            html: String(campaign.content || "")
          })
        });

        if (!resendResponse.ok) {
          const resendBody = await resendResponse.text();
          throw new Error(`Resend error ${resendResponse.status}: ${resendBody}`);
        }

        await supabaseAdmin
          .from("newsletter_campaign_logs")
          .update({ status: "sent", error_message: null, updated_at: new Date().toISOString() })
          .eq("id", logRow.id);

        results.push({ email, status: "sent" });
      } catch (error) {
        hadFailure = true;
        const message = error instanceof Error ? error.message : String(error);
        await supabaseAdmin
          .from("newsletter_campaign_logs")
          .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
          .eq("id", logRow.id);
        results.push({ email, status: "failed", error: message });
      }
    }

    const finalStatus = hadFailure ? "failed" : "sent";
    const { error: finalStatusError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .update({
        status: finalStatus,
        updated_at: new Date().toISOString(),
        sent_at: finalStatus === "sent" ? new Date().toISOString() : null
      })
      .eq("id", campaignId);

    if (finalStatusError) {
      throw finalStatusError;
    }

    return jsonResponse(
      {
        success: !hadFailure,
        message: `Newsletter processing completed for campaign ${campaignId}.`,
        campaign_id: campaignId,
        recipient_count: eligibleSubscribers.length,
        sent_count: results.filter((result) => result.status === "sent").length,
        failed_count: results.filter((result) => result.status === "failed").length,
        results
      },
      200,
      origin
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("newsletter send failed:", message);

    try {
      await supabaseAdmin
        .from("newsletter_campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaignId);
    } catch (updateError) {
      console.error("Failed to mark campaign as failed:", updateError);
    }

    return jsonResponse({ error: message }, 500, origin);
  }
});
