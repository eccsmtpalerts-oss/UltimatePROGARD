const RESEND_API_KEY = process.env.RESEND_API_KEY;
import { supabaseAdmin } from '../_supabaseAdmin';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

exports.handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    const { name, email, subject, message }: ContactFormRequest = JSON.parse(event.body);

    if (!name || !email || !subject || !message) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "All fields are required" }),
      };
    }

    // Store contact submission in Supabase
    await supabaseAdmin
      .from('contact_submissions')
      .insert({
        name,
        email,
        subject,
        message,
        created_at: new Date().toISOString(),
      });

    // Send notification email
    const notificationRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Perfect Gardener <onboarding@resend.dev>",
        to: ["progardener01@gmail.com"],
        subject: `New Contact: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br />")}</p>
        `,
      }),
    });

    if (!notificationRes.ok) {
      const errorData = await notificationRes.json();
      throw new Error(errorData.message || "Failed to send notification email");
    }

    // Send confirmation email
    const confirmationRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Perfect Gardener <onboarding@resend.dev>",
        to: [email],
        subject: "We received your message! 🌱",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Thank you for contacting us, ${name}!</h1>
            <p>We have received your message and will get back to you within 24 hours.</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your message:</strong></p>
              <p style="color: #666;">${message.replace(/\n/g, "<br />")}</p>
            </div>
            <p>In the meantime, feel free to explore our gardening tools and resources!</p>
            <p style="color: #888;">Best regards,<br/>The Perfect Gardener Team</p>
          </div>
        `,
      }),
    });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, message: "Emails sent successfully" }),
    };
  } catch (error: unknown) {
    console.error("Error in send-contact-email function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
