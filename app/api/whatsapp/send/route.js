import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { to, memberName, amount, periodLabel, razorpayLink } =
      await req.json();

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;
    const templateName = process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_NAME;
    const templateLanguage = process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_LANGUAGE;

    if (!to) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    if (!phoneNumberId || !token) {
      return NextResponse.json(
        { error: "WhatsApp API credentials are not configured" },
        { status: 500 },
      );
    }

    const digits = to.replace(/\D/g, "");
    const phoneNumber =
      digits.length === 10 ? `91${digits}` : digits.replace(/^0+/, "");

    if (phoneNumber.length < 11) {
      return NextResponse.json(
        {
          error:
            "WhatsApp number must include country code, for example 919876543210",
        },
        { status: 400 },
      );
    }

    console.log("Sending WhatsApp message to:", phoneNumber);
    console.log("Using template:", templateName);

    const template = {
      name: templateName,
      language: {
        code: templateLanguage,
      },
    };

    if (templateName === "send_payment_link") {
      template.components = [
        {
          type: "body",
          parameters: [
            { type: "text", text: memberName || "Customer" },
            { type: "text", text: String(amount || "0") },
            { type: "text", text: periodLabel || "billing period" },
            { type: "text", text: razorpayLink || "payment link" },
          ],
        },
      ];
    }

    const res = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "template",
          template,
        }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("WhatsApp API Error:", data);

      return NextResponse.json(
        {
          error: data?.error?.message || "Failed to send WhatsApp message",
          code: data?.error?.code,
          details: data,
        },
        { status: res.status },
      );
    }

    return NextResponse.json({
      success: true,
      status: data?.messages?.[0]?.message_status || "accepted",
      messageId: data?.messages?.[0]?.id,
      to: data?.contacts?.[0]?.wa_id || phoneNumber,
      data,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
