import { NextResponse } from "next/server";
import { getRazorpayInstance } from "@/lib/razorpay";

export const runtime = "nodejs";

const getRazorpayErrorMessage = (error) =>
  error?.error?.description ||
  error?.error?.reason ||
  error?.description ||
  error?.message ||
  "Failed to create Razorpay payment link";

const isDuplicateReferenceError = (message) =>
  /reference[_\s-]?id/i.test(message || "") &&
  /(already exists|already attempted|duplicate)/i.test(message || "");

export async function POST(req) {
  let razorpay;
  let requestedReferenceId = "";

  try {
    const {
      amount,
      description,
      customer,
      notes,
      referenceId,
      callbackUrl,
    } = await req.json();

    const numericAmount = Number(amount || 0);
    requestedReferenceId = String(referenceId || `kda_${Date.now()}`).trim();
    const customerName = String(customer?.name || "Customer").trim();
    const customerEmail = String(customer?.email || "").trim();
    const customerContact = String(customer?.contact || "").replace(/\D/g, "");

    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 },
      );
    }

    if (!customerEmail && !customerContact) {
      return NextResponse.json(
        { error: "Customer email or contact is required for Razorpay link" },
        { status: 400 },
      );
    }

    if (requestedReferenceId.length > 40) {
      return NextResponse.json(
        { error: "Razorpay reference_id must be 40 characters or fewer" },
        { status: 400 },
      );
    }

    const customerPayload = {
      name: customerName || "Customer",
      ...(customerEmail ? { email: customerEmail } : {}),
      ...(customerContact ? { contact: customerContact } : {}),
    };

    razorpay = getRazorpayInstance();
    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(numericAmount * 100),
      currency: "INR",
      accept_partial: false,
      reference_id: requestedReferenceId,
      description: description || "Kingz Digital Attendance payment",
      customer: customerPayload,
      notify: {
        sms: false,
        email: false,
        whatsapp: false,
      },
      reminder_enable: false,
      notes: notes || {},
      ...(callbackUrl
        ? { callback_url: callbackUrl, callback_method: "get" }
        : {}),
    });

    return NextResponse.json({
      success: true,
      id: paymentLink.id,
      shortUrl: paymentLink.short_url,
      status: paymentLink.status,
    });
  } catch (error) {
    const message = getRazorpayErrorMessage(error);

    if (razorpay && requestedReferenceId && isDuplicateReferenceError(message)) {
      try {
        const existingLinks = await razorpay.paymentLink.all({
          reference_id: requestedReferenceId,
          count: 1,
        });
        const existingLink = existingLinks?.payment_links?.[0];

        if (existingLink?.short_url) {
          return NextResponse.json({
            success: true,
            existing: true,
            id: existingLink.id,
            shortUrl: existingLink.short_url,
            status: existingLink.status,
          });
        }
      } catch (fetchError) {
        console.error("Razorpay fetch existing payment link error:", {
          message: getRazorpayErrorMessage(fetchError),
          statusCode: fetchError?.statusCode,
          razorpayError: fetchError?.error,
        });
      }
    }

    console.error("Razorpay create payment link error:", {
      message,
      statusCode: error?.statusCode,
      razorpayError: error?.error,
    });

    return NextResponse.json(
      {
        error: message,
        details: error?.error || null,
      },
      { status: error?.statusCode || 500 },
    );
  }
}
