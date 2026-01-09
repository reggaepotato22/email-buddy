import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkEmailRequest {
  campaign_id: string;
  smtp_password: string;
}

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, smtp_password }: BulkEmailRequest = await req.json();

    if (!campaign_id || !smtp_password) {
      return new Response(
        JSON.stringify({ error: "Missing campaign_id or smtp_password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch campaign with template
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, email_templates(*)")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .single();

    if (smtpError || !smtpSettings) {
      return new Response(
        JSON.stringify({ error: "SMTP settings not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pending recipients with their contact info
    const { data: recipients, error: recipientsError } = await supabase
      .from("campaign_recipients")
      .select("*, contacts(*)")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .limit(50); // Process in batches of 50

    if (recipientsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch recipients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipients || recipients.length === 0) {
      // Mark campaign as completed if no pending recipients
      await supabase
        .from("campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", campaign_id);

      return new Response(
        JSON.stringify({ success: true, message: "No pending recipients", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update campaign status to sending
    await supabase
      .from("campaigns")
      .update({ status: "sending", started_at: campaign.started_at || new Date().toISOString() })
      .eq("id", campaign_id);

    // Initialize SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        tls: smtpSettings.use_tls,
        auth: {
          username: smtpSettings.username,
          password: smtp_password,
        },
      },
    });

    let sentCount = 0;
    let failedCount = 0;
    const template = campaign.email_templates;

    for (const recipient of recipients) {
      const contact: Contact = recipient.contacts;
      
      try {
        // Replace placeholders in subject and content
        const subject = replacePlaceholders(template.subject, contact);
        const html = replacePlaceholders(template.html_content, contact);

        await client.send({
          from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
          to: contact.email,
          subject: subject,
          html: html,
        });

        // Update recipient status to sent
        await supabase
          .from("campaign_recipients")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", recipient.id);

        sentCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: unknown) {
        console.error(`Failed to send to ${contact.email}:`, err);
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        
        // Update recipient status to failed
        await supabase
          .from("campaign_recipients")
          .update({ 
            status: "failed", 
            error_message: errorMsg
          })
          .eq("id", recipient.id);

        failedCount++;
      }
    }

    await client.close();

    // Update campaign counts
    const { data: currentCampaign } = await supabase
      .from("campaigns")
      .select("sent_count, failed_count")
      .eq("id", campaign_id)
      .single();

    await supabase
      .from("campaigns")
      .update({
        sent_count: (currentCampaign?.sent_count || 0) + sentCount,
        failed_count: (currentCampaign?.failed_count || 0) + failedCount,
      })
      .eq("id", campaign_id);

    // Check if there are more pending recipients
    const { count } = await supabase
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedCount,
        remaining: count || 0,
        message: count && count > 0 ? "Batch completed, more recipients pending" : "All emails sent"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Bulk email error:", error);
    const message = error instanceof Error ? error.message : "Failed to send bulk emails";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function replacePlaceholders(text: string, contact: Contact): string {
  return text
    .replace(/\{\{first_name\}\}/g, contact.first_name || "")
    .replace(/\{\{last_name\}\}/g, contact.last_name || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{company\}\}/g, contact.company || "");
}
