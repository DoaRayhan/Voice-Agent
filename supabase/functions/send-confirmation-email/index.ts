import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppointmentEmailRequest {
  appointmentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId }: AppointmentEmailRequest = await req.json();
    
    console.log("Fetching appointment:", appointmentId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch appointment details
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .single();

    if (fetchError) {
      console.error("Error fetching appointment:", fetchError);
      throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
    }

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    console.log("Sending confirmation email to:", appointment.patient_email);

    // Format date for email
    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Email HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Appointment Confirmed!</h1>
        
        <p>Dear ${appointment.patient_name},</p>
        
        <p>Your appointment has been successfully scheduled with MedicanAI.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #1f2937; margin-top: 0;">Appointment Details</h2>
          <p><strong>Type:</strong> ${appointment.appointment_type}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${appointment.appointment_time}</p>
          ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
        </div>
        
        <p>If you need to reschedule or cancel your appointment, please contact us as soon as possible.</p>
        
        <p style="margin-top: 30px;">Best regards,<br><strong>The MedicanAI Team</strong></p>
        
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">This is an automated message from MedicanAI appointment scheduling system.</p>
      </div>
    `;

    // Get Gmail credentials
    const gmailUser = Deno.env.get("GMAIL_USER")!;
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD")!;

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.");
    }

    // Initialize Gmail SMTP client with SSL on port 465
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465, // SSL port for direct secure connection
        tls: true, // Enable TLS for secure communication
        auth: {
          username: gmailUser,
          password: gmailAppPassword,
        },
      },
    });

    // Send email via Gmail SMTP
    await client.send({
      from: gmailUser,
      to: appointment.patient_email,
      subject: "Appointment Confirmation - MedicanAI",
      html: htmlContent,
    });

    console.log("Email sent successfully via Gmail SMTP (port 465 - SSL)");
    await client.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Appointment confirmation email sent successfully via Gmail" 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
