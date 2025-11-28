import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `# Personality

You are Medican AI, a friendly and efficient virtual assistant specializing in scheduling healthcare appointments. You are polite, patient, and focused on quickly finding the best available time for the caller. You represent MedicanAI, which brings the power of AI, automation, and real-time data to healthcare for faster diagnoses, improved patient care, and streamlined workflows.

# Environment

You are engaged in a phone call with a patient who is trying to schedule an appointment. You have access to the practice's scheduling system to view available time slots. The caller may be a new or existing patient and may have specific preferences for appointment times or doctors.

# Tone

Your responses are clear, concise, and professional. You use a polite and helpful tone, with brief affirmations ("Okay," "I understand") to acknowledge the caller's requests. You speak at a moderate pace, ensuring the caller can easily understand the available options. You avoid using overly technical or medical jargon.

# Goal

Your primary goal is to efficiently schedule appointments for patients by:

1. **Identifying the patient:**
   - Ask for the patient's name and date of birth to verify their identity.
   - If the patient is new, collect necessary information such as contact details and insurance information.

2. **Determining the appointment type:**
   - Ask the patient the reason for the appointment (e.g., check-up, consultation, specific medical issue).
   - Confirm if the patient has a preferred doctor or any specific requirements.

3. **Checking availability:**
   - Access the scheduling system to view available time slots for the specified appointment type and doctor (if applicable).
   - Offer the patient a few convenient options, including dates and times.

4. **Confirming the appointment:**
   - Once the patient selects a time, confirm the appointment details, including date, time, doctor (if applicable), and location.
   - Provide any necessary pre-appointment instructions (e.g., fasting, bringing medical records).

5. **Sending reminders:**
   - Inform the patient that they will receive a reminder via SMS or email prior to their appointment.

Success is measured by the number of successfully scheduled appointments, the efficiency of the scheduling process, and patient satisfaction.

# Guardrails

- Do not provide medical advice or diagnose medical conditions.
- Only schedule appointments within the parameters of the practice's scheduling policies.
- Never ask for sensitive personal information such as social security numbers or financial details beyond insurance information.
- If you are unable to schedule an appointment due to system issues or unavailability, offer to connect the caller with a human receptionist.
- Maintain patient confidentiality and comply with HIPAA regulations.

Remember to keep your responses brief and conversational, as this is a voice conversation.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('LLM processing request received');
    const { message, conversationHistory } = await req.json();
    
    if (!message) {
      throw new Error('No message provided');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Sending to Lovable AI...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
        tools: [
          {
            type: "function",
            function: {
              name: "schedule_appointment",
              description: "Schedule a medical appointment when all required information is collected",
              parameters: {
                type: "object",
                properties: {
                  patient_name: { type: "string", description: "Full name of the patient" },
                  patient_email: { type: "string", description: "Email address of the patient" },
                  patient_phone: { type: "string", description: "Phone number of the patient (optional)" },
                  appointment_type: { type: "string", description: "Type of appointment (e.g., General Checkup, Specialist)" },
                  appointment_date: { type: "string", description: "Date of appointment in YYYY-MM-DD format" },
                  appointment_time: { type: "string", description: "Time of appointment (e.g., 10:00 AM)" },
                  notes: { type: "string", description: "Additional notes or special requests" }
                },
                required: ["patient_name", "patient_email", "appointment_type", "appointment_date", "appointment_time"]
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`Lovable AI error: ${errorText}`);
    }

    const result = await response.json();
    const choice = result.choices[0];
    let assistantMessage = choice?.message?.content || '';
    let appointmentId = null;

    // Check if the AI wants to schedule an appointment
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === "schedule_appointment") {
        const appointmentData = JSON.parse(toolCall.function.arguments);
        console.log("Scheduling appointment:", appointmentData);

        // Insert appointment into database
        const { data: appointment, error: insertError } = await supabase
          .from("appointments")
          .insert({
            patient_name: appointmentData.patient_name,
            patient_email: appointmentData.patient_email,
            patient_phone: appointmentData.patient_phone || null,
            appointment_type: appointmentData.appointment_type,
            appointment_date: appointmentData.appointment_date,
            appointment_time: appointmentData.appointment_time,
            notes: appointmentData.notes || null,
            status: "scheduled"
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting appointment:", insertError);
          throw new Error(`Failed to schedule appointment: ${insertError.message}`);
        }

        appointmentId = appointment.id;
        console.log("Appointment created with ID:", appointmentId);

        // Send confirmation email
        try {
          const emailResponse = await supabase.functions.invoke("send-confirmation-email", {
            body: { appointmentId: appointment.id }
          });

          if (emailResponse.error) {
            console.error("Error sending confirmation email:", emailResponse.error);
          } else {
            console.log("Confirmation email sent successfully");
          }
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
        }

        // Update assistant message to confirm the appointment was scheduled
        assistantMessage = `Perfect! I've scheduled your ${appointmentData.appointment_type} appointment for ${appointmentData.appointment_date} at ${appointmentData.appointment_time}. A confirmation email has been sent to ${appointmentData.patient_email}. Is there anything else I can help you with?`;
      }
    }
    
    if (!assistantMessage) {
      throw new Error('No response from LLM');
    }

    console.log('LLM response:', assistantMessage);

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        conversationHistory: [...messages, { role: 'assistant', content: assistantMessage }],
        appointmentId: appointmentId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('LLM processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});