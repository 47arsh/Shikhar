"use client";

import { useEffect, useState } from "react";

const EEA_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO",
  "SK", "SI", "ES", "SE", "GB", "CH",
]);

interface ConsentBannerProps {
  onConsent?: () => void;
}

export function ConsentBanner({ onConsent }: ConsentBannerProps = {}) {
  const [show, setShow] = useState(false);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    // Only show banner if consent hasn't been given yet
    const stored = localStorage.getItem("shikhar_consent");
    if (stored === "true") {
      setConsented(true);
      onConsent?.();
      return;
    }

    // In a real deployment, detect country from IP or Accept-Language header.
    // For now, show to all users as a best-effort compliance measure.
    setShow(true);
  }, [onConsent]);

  const handleAccept = () => {
    localStorage.setItem("shikhar_consent", "true");
    setConsented(true);
    setShow(false);
    onConsent?.();
  };

  if (!show || consented) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg p-4 md:p-6"
    >
      <div className="max-w-md mx-auto">
        <p className="text-sm text-slate-600 mb-4">
          We use cookies and similar technologies to serve ads, analyze traffic,
          and remember your preferences. By continuing, you consent to our use of
          cookies as described in our{" "}
          <a
            href="/privacy"
            className="text-shikhar-dusk hover:text-shikhar-dusk/80 underline"
          >
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            onClick={handleAccept}
            className="w-full sm:w-auto py-2.5 px-4 rounded-lg font-medium text-white bg-shikhar-dusk hover:bg-shikhar-dusk/90 transition-all"
          >
            I agree
          </button>
        </div>
      </div>
    </div>
  );
}
