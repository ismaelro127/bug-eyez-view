"use client";

import React from "react";

export default function PrivacyPage() {
  const lastUpdated = "December 15, 2025"; // change anytime

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/60">
          Bug Eyez View • Last Updated: <span className="text-white/80">{lastUpdated}</span>
        </p>

        <div className="mt-8 space-y-8">
          <Section title="1. Information We Collect">
            <h3 className="font-semibold text-white/90 mt-2">a) Account Information</h3>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Email address</li>
              <li>Authentication tokens (JWT/session cookies)</li>
            </ul>

            <h3 className="font-semibold text-white/90 mt-5">b) Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>App interactions</li>
              <li>Selected channels/programs</li>
              <li>Error logs and diagnostics</li>
            </ul>

            <h3 className="font-semibold text-white/90 mt-5">c) Device & Technical Data</h3>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Browser type</li>
              <li>Device type</li>
              <li>IP address (for security & abuse prevention)</li>
            </ul>
          </Section>

          <Section title="2. How We Use Information">
            <ul className="list-disc pl-6 space-y-2">
              <li>Authenticate users</li>
              <li>Provide and improve the Service</li>
              <li>Generate AI summaries</li>
              <li>Prevent abuse and fraud</li>
              <li>Maintain system security</li>
            </ul>
          </Section>

          <Section title="3. Cookies & Local Storage">
            <p>We may use cookies for authentication and local storage for session and UI preferences.</p>
            <p className="mt-3">
              You can disable cookies, but some features may not function properly.
            </p>
          </Section>

          <Section title="4. Third-Party Services">
            <p>
              We may interact with third-party APIs for content metadata, AI summaries, and streaming
              sources. We do not sell personal data to third parties.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain data only as long as necessary to operate the Service, comply with legal
              obligations, and enforce our Terms.
            </p>
          </Section>

          <Section title="6. Data Security">
            <p>
              We implement reasonable technical and organizational safeguards to protect your data.
              However, no system is 100% secure.
            </p>
          </Section>

          <Section title="7. Children’s Privacy">
            <p>Bug Eyez View does not knowingly collect personal data from children under 13.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>
              Depending on jurisdiction, you may have the right to request access to your data,
              request deletion of your data, and correct inaccurate information.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>
              We may update this Privacy Policy periodically. Continued use of the Service constitutes
              acceptance of the updated policy.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Privacy inquiries: <span className="text-white/80">privacy@bugeyezview.com</span>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-semibold text-cyan-300">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-white/80">{children}</div>
    </section>
  );
}
