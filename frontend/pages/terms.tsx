"use client";

import React from "react";

export default function TermsPage() {
  const lastUpdated = "December 15, 2025"; // change anytime

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-white/60">
          Bug Eyez View • Last Updated: <span className="text-white/80">{lastUpdated}</span>
        </p>

        <div className="mt-8 space-y-8">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Bug Eyez View (“the App”, “the Service”), you agree to be bound by
              these Terms of Service (“Terms”). If you do not agree, you may not use the Service.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Bug Eyez View is a streaming discovery and viewing platform that aggregates publicly
              available, legally distributed broadcast and streaming sources, along with program
              metadata and AI-generated summaries.
            </p>
            <p className="mt-3">
              Bug Eyez View does not host, upload, or control third-party video streams unless
              explicitly stated.
            </p>
          </Section>

          <Section title="3. Eligibility">
            <p>
              You must be at least 13 years old to use the Service. If you are under 18, you confirm
              that you have permission from a parent or legal guardian.
            </p>
          </Section>

          <Section title="4. User Accounts">
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree not to share, resell, or transfer your account.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Scrape, download, or redistribute streams or metadata</li>
              <li>Reverse engineer or attempt to bypass technical protections</li>
              <li>Use the Service for illegal or unauthorized purposes</li>
              <li>Interfere with or disrupt the Service or servers</li>
            </ul>
          </Section>

          <Section title="6. Third-Party Content & Streams">
            <ul className="list-disc pl-6 space-y-2">
              <li>Logos, trademarks, channel names, and streams belong to their respective owners.</li>
              <li>Bug Eyez View does not claim ownership of third-party content.</li>
              <li>Availability of streams may change without notice.</li>
            </ul>
          </Section>

          <Section title="7. AI-Generated Content Disclaimer">
            <p>
              AI summaries and metadata are generated automatically and may be inaccurate, incomplete,
              or outdated. They are provided for informational purposes only and should not be relied
              upon as factual, legal, or professional advice.
            </p>
          </Section>

          <Section title="8. No Warranties">
            <p>
              The Service is provided “AS IS” and “AS AVAILABLE” without warranties of any kind. We do
              not guarantee continuous availability, accuracy of schedules or metadata, or stream
              quality or uptime.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Bug Eyez View and its operators shall not be
              liable for service interruptions, third-party content issues, data loss, or indirect or
              consequential damages.
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              We reserve the right to suspend or terminate access to the Service at any time, with or
              without notice, for violations of these Terms or for operational reasons.
            </p>
          </Section>

          <Section title="11. Changes to Terms">
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes
              constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="12. Governing Law">
            <p>
              These Terms are governed by the laws of the United States, without regard to conflict of
              law principles.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              For legal inquiries: <span className="text-white/80">legal@bugeyezview.com</span>
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
      <h2 className="text-lg font-semibold text-emerald-300">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-white/80">{children}</div>
    </section>
  );
}
