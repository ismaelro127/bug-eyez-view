"use client";

import React from "react";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-10 flex justify-center">
      <div className="max-w-3xl space-y-8 text-sm leading-relaxed">

        <h1 className="text-2xl font-bold">Bug Eyez View – Legal Notices</h1>

        {/* 1 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">
            1. Content Ownership & Attribution
          </h2>
          <p>
            Bug Eyez View does not own, host, or claim ownership of any television
            channels, live streams, programs, or related media content displayed
            within the application.
          </p>
          <p className="mt-2">
            All content remains the property of its respective broadcasters,
            networks, studios, or rights holders. Bug Eyez View operates as a
            content discovery and viewing interface that links to publicly
            available, legally distributed streams where permitted.
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">
            2. Logos, Trademarks & Branding
          </h2>
          <p>
            All logos, trademarks, service marks, channel names, and brand
            identifiers displayed in Bug Eyez View are the property of their
            respective owners.
          </p>
          <p className="mt-2">
            Logos are used solely for identification and informational purposes
            and do not imply endorsement, sponsorship, partnership, or
            affiliation unless explicitly stated.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">
            3. Stream Availability & Reliability
          </h2>
          <p>
            Bug Eyez View does not guarantee the availability, quality, or
            continuity of any stream. Streams may change, become unavailable, be
            geo-restricted, or removed without notice by their providers.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">
            4. Electronic Program Guide (EPG)
          </h2>
          <p>
            Program schedules, titles, and descriptions are provided for
            informational purposes only. EPG data may be delayed, incomplete, or
            inaccurate.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">
            5. AI-Generated Content
          </h2>
          <p>
            Bug Eyez View may display AI-generated summaries or metadata to
            enhance discovery. These summaries are automatically generated and
            may contain inaccuracies.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">
            6. Commercial Use
          </h2>
          <p>
            Bug Eyez View is a commercial application and may display
            advertisements or sponsored content. Monetization does not imply
            ownership of third-party content.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">
            7. External Links
          </h2>
          <p>
            Bug Eyez View may link to third-party websites or streams. We are not
            responsible for the content or practices of external services.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">
            8. Rights Holder Contact
          </h2>
          <p>
            If you are a rights holder and believe your content or branding is
            being used improperly, please contact:
          </p>
          <p className="mt-1 font-medium">
            legal@bugeyezview.com
          </p>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-white/10 text-xs text-white/60">
          © Bug Eyez View. All rights reserved.
        </div>

      </div>
    </div>
  );
}
