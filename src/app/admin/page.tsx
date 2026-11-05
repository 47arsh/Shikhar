import { getJudgedAnswers, approveJudged, rejectJudged, mergeJudged } from "./actions";

interface JudgedAnswer {
  id: string;
  promptId: string;
  normalizedInput: string;
  valid: boolean;
  canonicalName: string;
  entityId: string | null;
  confidence: number;
  reason: string;
  answerId: string | null;
  createdAt: Date;
  prompt: {
    id: string;
    text: string;
    category: string;
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  const result = await getJudgedAnswers(secret ?? "");

  if (!result.authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-shikhar-dusk mb-6">Admin Access</h1>
          <p className="text-sm text-slate-600 mb-4">
            This page requires the admin secret. Provide it as a query parameter:
          </p>
          <code className="block bg-slate-100 px-3 py-2 rounded mb-4 text-xs font-mono text-slate-600">
            /admin?secret=YOUR_ADMIN_SECRET
          </code>
          <p className="text-xs text-slate-500">
            Set ADMIN_SECRET in your .env.local to enable access.
          </p>
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-lg">
          <h1 className="text-xl font-bold text-shikhar-dusk mb-2">Error</h1>
          <p className="text-sm text-slate-600">{result.error}</p>
        </div>
      </div>
    );
  }

  const judged = result.judged as JudgedAnswer[];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-shikhar-dusk">Review Queue</h1>
          <p className="text-sm text-slate-500">
            Unreviewed judged answers awaiting admin decision
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full bg-card border border-border rounded-xl">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Input
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Prompt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Canonical
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Valid
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Reason
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {judged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No unreviewed judged answers in the queue.
                  </td>
                </tr>
              ) : (
                judged.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                      "{j.normalizedInput}"
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {j.prompt.text}
                      <br />
                      <span className="text-xs text-slate-400">{j.prompt.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-shikhar-dusk">
                      {j.canonicalName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {j.valid ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          Valid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          Invalid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        j.confidence >= 0.8
                          ? "text-green-600 bg-green-50"
                          : j.confidence >= 0.5
                          ? "text-amber-600 bg-amber-50"
                          : "text-red-600 bg-red-50"
                      }`}>
                        {(j.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                      {j.reason}
                    </td>
                    <td className="px-4 py-3 text-right space-y-2">
                      {j.valid ? (
                        <>
                          <form
                            action={async () => {
                              await approveJudged(secret ?? "", j.id, j.canonicalName);
                            }}
                          >
                            <button
                              className="w-full py-1.5 px-3 rounded text-xs font-medium text-white bg-shikhar-dusk hover:bg-shikhar-dusk/90 transition-all"
                            >
                              Approve
                            </button>
                          </form>
                          <form
                            action={async (_formData: FormData) => {
                              const target = _formData.get("mergeIntoAnswerId") as string;
                              if (target) await mergeJudged(secret ?? "", j.id, target);
                            }}
                          >
                            <input
                              type="text"
                              name="mergeIntoAnswerId"
                              placeholder="Merge into answer ID"
                              className="w-full px-2 py-1 text-xs border border-border rounded mb-1"
                            />
                            <button
                              type="submit"
                              className="w-full py-1.5 px-3 rounded text-xs font-medium text-shikhar-dusk bg-white border border-border hover:bg-slate-50 transition-all"
                            >
                              Merge
                            </button>
                          </form>
                        </>
                      ) : (
                        <form
                          action={async () => {
                            await rejectJudged(secret ?? "", j.id);
                          }}
                        >
                          <button
                            className="w-full py-1.5 px-3 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                          >
                            Reject
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <p className="text-xs text-slate-500">
            Protect this page with ADMIN_SECRET. Set ADMIN_SECRET in your
            .env.local and visit /admin?secret=YOUR_SECRET
          </p>
        </div>
      </div>
    </div>
  );
}
