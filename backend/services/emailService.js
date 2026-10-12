import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.warn("Email service not fully configured.");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: SMTP_SECURE === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendVerificationEmail({ to, verificationUrl }) {
  const from = SMTP_FROM || SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your Bug Eyez View account",
    html: `
      <div style="font-family:Arial,sans-serif;background:#050505;color:#ffffff;padding:24px;">
        <div style="max-width:520px;margin:auto;background:#111827;border:1px solid #1f2937;border-radius:14px;padding:24px;">
          <h1 style="color:#22d3ee;margin-top:0;">Bug Eyez View</h1>
          <p>Thanks for creating your account.</p>
          <p>Please verify your email address to activate your account.</p>
          <p style="margin:24px 0;">
            <a href="${verificationUrl}" style="background:#10b981;color:#000;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Verify Email
            </a>
          </p>
          <p style="font-size:13px;color:#9ca3af;">
            If the button does not work, copy and paste this link:
          </p>
          <p style="font-size:12px;color:#67e8f9;word-break:break-all;">
            ${verificationUrl}
          </p>
          <p style="font-size:12px;color:#6b7280;margin-top:24px;">
            This link expires in 24 hours.
          </p>
        </div>
      </div>
    `,
  });
}