import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Shikhar",
  description: "Shikhar terms of service - terms and conditions for using the game.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <nav className="mb-6">
          <a href="/" className="text-sm text-shikhar-dusk hover:text-shikhar-dusk/80">
            ← Back to Shikhar
          </a>
        </nav>
        <h1 className="text-2xl font-display font-bold text-shikhar-dusk mb-6">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Last updated: November 5, 2026
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Acceptance of Terms</h2>
        <p className="text-sm text-slate-600 mb-4">
          By accessing or using Shikhar, you agree to be bound by these terms of service.
          If you do not agree, you may not use the service.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Use of the Service</h2>
        <p className="text-sm text-slate-600 mb-4">
          You may use Shikhar for personal, non-commercial purposes. You may not use the
          service for any illegal or unauthorized purpose.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">User Content</h2>
        <p className="text-sm text-slate-600 mb-4">
          Answers submitted to Shikhar are used to score your climb and may be stored
          anonymously to improve the game. You retain all rights to your submissions.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Disclaimer</h2>
        <p className="text-sm text-slate-600 mb-4">
          Shikhar is provided "as is" without warranty of any kind. We do not guarantee
          the accuracy of answers or the availability of the service.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Limitation of Liability</h2>
        <p className="text-sm text-slate-600 mb-4">
          Shikhar and its creators are not liable for any damages arising from your use
          of the service.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Changes to Terms</h2>
        <p className="text-sm text-slate-600 mb-4">
          We may update these terms at any time. Continued use of the service constitutes
          acceptance of the updated terms.
        </p>
      </div>
    </div>
  );
}
