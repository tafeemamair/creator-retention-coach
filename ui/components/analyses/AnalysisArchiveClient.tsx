"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteAnalysisButton } from "./DeleteAnalysisButton";

export interface AnalysisArchiveItem {
  id: string;
  title: string;
  platform: string;
  overall_score: number;
  created_at: string;
  script: string;
  analysis_result?: any;
  parent_analysis_id?: string | null;
}

interface AnalysisArchiveClientProps {
  initialAnalyses: AnalysisArchiveItem[];
}

export function AnalysisArchiveClient({ initialAnalyses }: AnalysisArchiveClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Toggle selection for comparison (max 2 items)
  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        // Keep the second one and add the new one
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const clearSelection = () => {
    setSelectedForCompare([]);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" || platformFilter !== "all" || scoreFilter !== "all" || sortBy !== "newest";

  const clearFilters = () => {
    setSearchQuery("");
    setPlatformFilter("all");
    setScoreFilter("all");
    setSortBy("newest");
  };

  // Filter & sort analyses purely on client side
  const filteredAndSorted = useMemo(() => {
    let result = [...initialAnalyses];

    // 1. Keyword search (title + script)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.script.toLowerCase().includes(q)
      );
    }

    // 2. Platform filter
    if (platformFilter !== "all") {
      result = result.filter((item) => item.platform === platformFilter);
    }

    // 3. Score-band filter
    if (scoreFilter === "high") {
      result = result.filter((item) => item.overall_score >= 80);
    } else if (scoreFilter === "medium") {
      result = result.filter((item) => item.overall_score >= 60 && item.overall_score < 80);
    } else if (scoreFilter === "low") {
      result = result.filter((item) => item.overall_score < 60);
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "score_desc") {
        return b.overall_score - a.overall_score;
      }
      if (sortBy === "score_asc") {
        return a.overall_score - b.overall_score;
      }
      // default: newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [initialAnalyses, searchQuery, platformFilter, scoreFilter, sortBy]);

  const handleLaunchCompare = () => {
    if (selectedForCompare.length === 2) {
      router.push(`/app/analyses/compare?id1=${selectedForCompare[0]}&id2=${selectedForCompare[1]}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter & Sort Controls Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scripts or titles..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Platform Filter */}
          <div className="lg:col-span-3">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="all">All Platforms</option>
              <option value="YouTube Shorts">YouTube Shorts</option>
              <option value="TikTok">TikTok</option>
              <option value="Instagram Reels">Instagram Reels</option>
            </select>
          </div>

          {/* Score Band Filter */}
          <div className="lg:col-span-3">
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="all">All Scores</option>
              <option value="high">High (80–100)</option>
              <option value="medium">Medium (60–79)</option>
              <option value="low">Low / At Risk (&lt;60)</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="score_desc">Score: High → Low</option>
              <option value="score_asc">Score: Low → High</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="text-slate-400">
            Showing <strong className="text-white font-semibold">{filteredAndSorted.length}</strong> of {initialAnalyses.length} analyses
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors"
            >
              Reset Filters ↺
            </button>
          )}
        </div>
      </div>

      {/* Recoverable Empty Filter State */}
      {filteredAndSorted.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 space-y-3">
          <div className="text-3xl">🔍</div>
          <h3 className="text-sm font-semibold text-white">No analyses match your filter criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, changing platform selection, or clearing score filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md"
          >
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Card View (visible on small/narrow screens) */}
          <div className="grid gap-3 sm:hidden">
            {filteredAndSorted.map((item) => {
              const isSelected = selectedForCompare.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl bg-slate-900 border transition-all space-y-3 ${
                    isSelected ? "border-indigo-500 ring-1 ring-indigo-500/50 bg-slate-900/90" : "border-slate-800 shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCompare(item.id)}
                        aria-label={`Select ${item.title} for comparison`}
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="font-semibold text-white text-sm truncate">
                            {item.title}
                          </h2>
                          {item.parent_analysis_id && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                              Revision
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {item.script}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-sm shrink-0 tabular-nums ${
                        item.overall_score >= 80
                          ? "text-emerald-400"
                          : item.overall_score >= 60
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {item.overall_score} / 100
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700 text-[11px]">
                        {item.platform}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/app/analyses/${item.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold"
                      >
                        <span>View</span>
                        <span>→</span>
                      </Link>
                      <DeleteAnalysisButton
                        analysisId={item.id}
                        analysisTitle={item.title}
                        variant="table"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table View (hidden on small screens) */}
          <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th scope="col" className="px-4 py-4 w-10 text-center">
                      <span className="sr-only">Compare</span>
                      ⚖️
                    </th>
                    <th scope="col" className="px-6 py-4">Title & Excerpt</th>
                    <th scope="col" className="px-6 py-4">Platform</th>
                    <th scope="col" className="px-6 py-4">Retention Score</th>
                    <th scope="col" className="px-6 py-4">Date</th>
                    <th scope="col" className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredAndSorted.map((item) => {
                    const isSelected = selectedForCompare.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? "bg-indigo-950/20" : ""
                        }`}
                      >
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCompare(item.id)}
                            aria-label={`Select ${item.title} for comparison`}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 max-w-md">
                            <span className="font-semibold text-white truncate">
                              {item.title}
                            </span>
                            {item.parent_analysis_id && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                                Revision
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">
                            {item.script.substring(0, 100)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                            {item.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-bold text-sm tabular-nums ${
                              item.overall_score >= 80
                                ? "text-emerald-400"
                                : item.overall_score >= 60
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {item.overall_score} / 100
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Link
                              href={`/app/analyses/${item.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold"
                            >
                              <span>View Report</span>
                              <span>→</span>
                            </Link>
                            <DeleteAnalysisButton
                              analysisId={item.id}
                              analysisTitle={item.title}
                              variant="table"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Floating Comparison Action Bar */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
              ⚖️
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {selectedForCompare.length === 2
                  ? "2 scripts selected for comparison"
                  : "1 script selected (select 1 more)"}
              </div>
              <p className="text-[11px] text-slate-400">
                {selectedForCompare.length === 2
                  ? "Ready to compare retention score and metric deltas"
                  : "Check a second script in the list above to compare"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleLaunchCompare}
              disabled={selectedForCompare.length !== 2}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/30"
            >
              Compare Reports →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
