// ============================================================================
// NAIJAPINS SUPABASE EDGE FUNCTION
// Send Standards-Compliant Web Push Notifications (RFC 8291 / RFC 8292)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "npm:web-push@3.6.7";

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

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID configuration is missing: VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set");
      return new Response(
        JSON.stringify({
          success: false,
          error: "VAPID configuration is missing in server environment",
          sent: 0,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set VAPID Details
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    if (!payload.targetUserId || !payload.title) {
      return new Response(
        JSON.stringify({ success: false, error: "targetUserId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    if (subError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active push subscriptions found for user", sent: 0 }),
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
        console.warn(`Incomplete push subscription metadata for ID ${sub.id}`);
        failedCount++;
        continue;
      }

      try {
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

        sentCount++;
        // Update last used timestamp
        await supabaseAdmin
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (sendErr: any) {
        const statusCode = sendErr?.statusCode;
        console.warn(`WebPush delivery failed for subscription ${sub.id}: HTTP ${statusCode || 'ERR'} - ${sendErr?.message}`);

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

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        deactivated: deactivatedIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Edge function push notification error:", err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal push delivery error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
