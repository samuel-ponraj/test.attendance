import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const RECIPIENT_EMAIL = "contact@kingzdigitalsolutions.in";
const CC_EMAIL = "samuelponraj14@gmail.com";

const getCaptchaSiteKey = () =>
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ||
  process.env.RECAPTCHA_SITE_KEY ||
  process.env.CAPTCHA_SITE_KEY ||
  "";

const getCaptchaSecretKey = () =>
  process.env.RECAPTCHA_SECRET_KEY || process.env.CAPTCHA_SECRET_KEY || "";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const clean = (value = "") => String(value || "").trim();

const verifyCaptcha = async (token) => {
  const secretKey = getCaptchaSecretKey();

  if (!secretKey) {
    throw new Error("Captcha secret is not configured");
  }

  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json();

  return Boolean(data.success);
};

export async function GET() {
  const siteKey = getCaptchaSiteKey();

  if (!siteKey) {
    return NextResponse.json(
      { error: "Captcha site key is not configured" },
      { status: 500 },
    );
  }

  return NextResponse.json({ siteKey });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const name = clean(body.name);
    const email = clean(body.email);
    const contact = clean(body.contact);
    const organization = clean(body.organization);
    const message = clean(body.message);
    const captchaToken = clean(body.captchaToken);

    if (!name || !email || !contact || !organization || !message) {
      return NextResponse.json(
        { error: "Please fill all required fields" },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    if (!captchaToken) {
      return NextResponse.json(
        { error: "Captcha verification is required" },
        { status: 400 },
      );
    }

    const captchaValid = await verifyCaptcha(captchaToken);

    if (!captchaValid) {
      return NextResponse.json(
        { error: "Captcha verification failed" },
        { status: 400 },
      );
    }

    const safe = {
      name: escapeHtml(name),
      email: escapeHtml(email),
      contact: escapeHtml(contact),
      organization: escapeHtml(organization),
      message: escapeHtml(message).replace(/\n/g, "<br />"),
    };

    const { error } = await resend.emails.send({
      from: "Kingz Digital Attendance <noreply@kingzdigitalsolutions.in>",
      to: RECIPIENT_EMAIL,
      cc: CC_EMAIL,
      replyTo: email,
      subject: `New demo request from ${organization}`,
      text: [
        "New Book a Demo request",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Contact: ${contact}`,
        `Organization: ${organization}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin: 0 0 16px;">New Book a Demo Request</h2>
          <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Name</td>
              <td style="padding: 8px 0; font-weight: 600;">${safe.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Email</td>
              <td style="padding: 8px 0; font-weight: 600;">${safe.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Contact</td>
              <td style="padding: 8px 0; font-weight: 600;">${safe.contact}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Organization</td>
              <td style="padding: 8px 0; font-weight: 600;">${safe.organization}</td>
            </tr>
          </table>
          <div style="margin-top: 20px;">
            <p style="margin: 0 0 8px; color: #6b7280;">Message</p>
            <div style="padding: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
              ${safe.message}
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Book demo email error:", error);
      return NextResponse.json(
        { error: "Failed to send demo request" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Book demo request error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
