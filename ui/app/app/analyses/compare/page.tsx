import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AnalysisComparisonView } from "@/components/analyses/AnalysisComparisonView";

interface ComparePageProps {
  searchParams: Promise<{ id1?: string; id2?: string }>;
}

export default async function CompareAnalysesPage({ searchParams }: ComparePageProps) {
  const { id1, id2 } = await searchParams;

  const supabase = await createClient();
  let user = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) {
    redirect(`/auth/login?next=/app/analyses/compare${id1 && id2 ? `?id1=${id1}&id2=${id2}` : ""}`);
  }

  if (!id1 || !id2 || id1 === id2) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="text-3xl">⚖️</div>
          <h1 className="text-lg font-bold text-white">Invalid Comparison Selection</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Please select two distinct script analyses from your saved archive to compare.
          </p>
          <div className="pt-2">
            <Link
              href="/app/analyses"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <span>← Back to My Analyses</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const admin = getAdminClient();
  if (!admin) {
    notFound();
  }

  // Authoritative Multi-Tenant Query: Both records must strictly belong to the authenticated user
  const { data: records, error } = await admin
    .from("analyses")
    .select("*")
    .in("id", [id1, id2])
    .eq("user_id", user.id);

  if (error || !records || records.length !== 2) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h1 className="text-lg font-bold text-white">Analysis Records Not Found</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            One or both requested analysis reports could not be found or do not belong to your account.
          </p>
          <div className="pt-2">
            <Link
              href="/app/analyses"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <span>← Return to My Analyses</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const recordA = records.find((r) => r.id === id1);
  const recordB = records.find((r) => r.id === id2);

  if (!recordA || !recordB) {
    notFound();
  }

  return <AnalysisComparisonView recordA={recordA} recordB={recordB} />;
}
