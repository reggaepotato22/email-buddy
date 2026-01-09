import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestSmtpRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  test_email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const smtp: TestSmtpRequest = await req.json();

    if (!smtp.host || !smtp.username || !smtp.password || !smtp.test_email) {
      return new Response(
        JSON.stringify({ error: "Missing required SMTP fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: smtp.port || 587,
        tls: smtp.use_tls !== false,
        auth: {
          username: smtp.username,
          password: smtp.password,
        },
      },
    });

    await client.send({
      from: `${smtp.from_name || 'Test'} <${smtp.from_email}>`,
      to: smtp.test_email,
      subject: "SMTP Test - BulkMail",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">✅ SMTP Connection Successful!</h2>
          <p>Your cPanel mail server is configured correctly and ready to send emails.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">This is a test email from BulkMail.</p>
        </div>
      `,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Test email sent successfully!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("SMTP test error:", error);
    const message = error instanceof Error ? error.message : "Failed to connect to SMTP server";
    return new Response(
      JSON.stringify({ 
        error: message,
        details: "Please check your SMTP settings. Common issues: incorrect host, port, or credentials."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
