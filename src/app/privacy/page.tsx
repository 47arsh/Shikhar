import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Shikhar",
  description: "Shikhar privacy policy - how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <nav className="mb-6">
          <a href="/" className="text-sm text-shikhar-dusk hover:text-shikhar-dusk/80">
            ← Back to Shikhar
          </a>
        </nav>
        <h1 className="text-2xl font-display font-bold text-shikhar-dusk mb-6">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Last updated: November 5, 2026
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Information We Collect</h2>
        <p className="text-sm text-slate-600 mb-4">
          Shikhar does not require accounts or login. We collect an anonymous device identifier
          stored in localStorage to track your streak and daily climb participation. No personal
          information is collected.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Cookies and Local Storage</h2>
        <p className="text-sm text-slate-600 mb-4">
          We use localStorage to store your anonymous ID, streak count, and daily climb lock state.
          We may use cookies for essential site functionality and analytics.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Advertising</h2>
        <p className="text-sm text-slate-600 mb-4">
          Shikhar may display advertisements. Ad providers may use cookies to serve personalized
          ads. You can opt out of personalized advertising through your browser settings.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Data Retention</h2>
        <p className="text-sm text-slate-600 mb-4">
          Climb data is stored temporarily and associated with your anonymous ID. You can clear
          all data by clearing your browser's localStorage for this site.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Children's Privacy</h2>
        <p className="text-sm text-slate-600 mb-4">
          Shikhar is intended for general audiences. We do not knowingly collect personal
          information from children under 13.
        </p>
        <h2 className="text-lg font-semibold text-shikhar-dusk mt-6 mb-2">Contact</h2>
        <p className="text-sm text-slate-600 mb-4">
          If you have questions about this privacy policy, contact us through the game website.
        </p>
      </div>
    </div>
  );
}
