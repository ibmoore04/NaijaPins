import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpushModule from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  targetUserId: string;
  notificationType: "message" | "incoming_call" | "social";
  title: string;
  body: string;
  icon?: string;
  data?: {
    url?: string;
    callId?: string;
    callType?: "voice" | "video";
    conversationId?: string;
  };
}

// Resilient web-push instance resolver for Deno runtime
const webpush = (webpushModule as any).default || webpushModule;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@naijapins.com";

    console.log(`[PUSH INIT] SUPABASE_URL set: ${Boolean(supabaseUrl)}`);
    console.log(`[PUSH INIT] SERVICE_ROLE_KEY set: ${Boolean(supabaseServiceKey)}`);
    console.log(`[PUSH INIT] VAPID_PUBLIC_KEY set: ${Boolean(vapidPublicKey)}`);
    console.log(`[PUSH INIT] VAPID_PRIVATE_KEY set: ${Boolean(vapidPrivateKey)}`);
    console.log(`[PUSH INIT] VAPID_SUBJECT: ${vapidSubject}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[PUSH ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
      return new Response(
        JSON.stringify({ success: false, error: "MISSING_SERVER_CONFIG", message: "Supabase URL or Service Role Key missing in server environment" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[PUSH ERROR] VAPID configuration missing: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set in Edge Function secrets");
      return new Response(
        JSON.stringify({
          success: false,
          error: "VAPID_NOT_CONFIGURED",
          message: "VAPID secrets (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY) are not set in Supabase Edge Function secrets",
          sent: 0,
          vapidConfigured: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set VAPID Details
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch (vapidErr: any) {
      console.error("[PUSH ERROR] Failed to set VAPID details:", vapidErr?.message || vapidErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: "VAPID_INITIALIZATION_ERROR",
          message: vapidErr?.message || "Invalid VAPID key format",
          sent: 0,
          vapidConfigured: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let payload: PushPayload;
    try {
      payload = await req.json();
    } catch (parseErr: any) {
      console.error("[PUSH ERROR] Invalid JSON body in request:", parseErr?.message);
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_JSON", message: "Malformed JSON payload" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.targetUserId || !payload.title) {
      return new Response(
        JSON.stringify({ success: false, error: "MISSING_FIELDS", message: "targetUserId and title are required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check Recipient Notification Preferences
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", payload.targetUserId)
      .maybeSingle();

    if (prefs) {
      if (payload.notificationType === "message" && prefs.messages_enabled === false) {
        return new Response(
          JSON.stringify({ success: true, message: "Message push notifications disabled by user preferences", sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (payload.notificationType === "incoming_call") {
        if (payload.data?.callType === "voice" && prefs.voice_calls_enabled === false) {
          return new Response(
            JSON.stringify({ success: true, message: "Voice call notifications disabled by user preferences", sent: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (payload.data?.callType === "video" && prefs.video_calls_enabled === false) {
          return new Response(
            JSON.stringify({ success: true, message: "Video call notifications disabled by user preferences", sent: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      if (payload.notificationType === "social" && prefs.social_enabled === false) {
        return new Response(
          JSON.stringify({ success: true, message: "Social push notifications disabled by user preferences", sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Fetch Active Push Subscriptions for target user
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh_key, auth_key")
      .eq("user_id", payload.targetUserId)
      .eq("is_active", true);

    console.log(`[PUSH] Target user: ${payload.targetUserId}`);
    console.log(`[PUSH] Notification type: ${payload.notificationType}`);
    console.log(`[PUSH] Active subscriptions found: ${subscriptions?.length || 0}`);
    console.log(`[PUSH] VAPID configured: ${Boolean(vapidPublicKey && vapidPrivateKey)}`);

    if (subError || !subscriptions || subscriptions.length === 0) {
      console.warn(`[PUSH] No active push subscriptions found for user: ${payload.targetUserId}`);
      return new Response(
        JSON.stringify({ success: true, message: "No active push subscriptions found for user", sent: 0, vapidConfigured: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pushPayloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/favicon.png",
      badge: "/favicon.png",
      type: payload.notificationType,
      data: payload.data || { url: "/messages" },
    });

    let sentCount = 0;
    let failedCount = 0;
    const deactivatedIds: string[] = [];

    // 3. Send Standards-Compliant Encrypted Push Notification to each device endpoint
    for (const sub of subscriptions) {
      // Validate subscription keys
      if (!sub.endpoint || !sub.p256dh_key || !sub.auth_key) {
        console.warn(`[PUSH] Incomplete push subscription metadata for ID ${sub.id}`);
        failedCount++;
        continue;
      }

      try {
        console.log(`[PUSH] Sending to endpoint: ${sub.endpoint.slice(0, 35)}...`);
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          pushPayloadString,
          {
            TTL: payload.notificationType === "incoming_call" ? 60 : 86400,
            urgency: payload.notificationType === "incoming_call" ? "high" : "normal",
          }
        );

        console.log(`[PUSH] WebPush delivery succeeded for subscription ID ${sub.id}`);
        sentCount++;
        // Update last used timestamp
        await supabaseAdmin
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (sendErr: any) {
        const statusCode = sendErr?.statusCode;
        console.warn(`[PUSH] WebPush delivery failed for subscription ${sub.id}: HTTP ${statusCode || 'ERR'} - ${sendErr?.message}`);

        // HTTP 404 Not Found or HTTP 410 Gone indicates endpoint has expired or unsubscribed
        if (statusCode === 404 || statusCode === 410) {
          deactivatedIds.push(sub.id);
        }
        failedCount++;
      }
    }

    // Deactivate expired/invalid subscriptions in batch
    if (deactivatedIds.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("id", deactivatedIds);
    }

    console.log(`[PUSH] Final delivery result: sent=${sentCount}, failed=${failedCount}, deactivated=${deactivatedIds.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        deactivated: deactivatedIds.length,
        vapidConfigured: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[PUSH ERROR] Unhandled Edge Function exception:", err?.stack || err?.message || err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "INTERNAL_PUSH_ERROR",
        message: err?.message || "Internal push delivery error",
        details: String(err),
        stack: err?.stack,
        sent: 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
