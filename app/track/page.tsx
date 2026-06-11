"use client";

import Link from "next/link";
import { useState } from "react";
import { getReportByTrackingCode, SubmittedReport } from "@/lib/reportService";
import { formatDate } from "@/lib/dateUtils";

export default function TrackPage() {
  const [trackingCode, setTrackingCode] = useState("");
  const [report, setReport] = useState<SubmittedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setReport(null);

    const inputValue = trackingCode.trim().toUpperCase();
    if (!inputValue) {
      setError("Please enter a tracking code to search for your report.");
      return;
    }

    setIsSearching(true);

    try {
      const result = await getReportByTrackingCode(inputValue);

      if (!result.success) {
        setError(result.error || "Unable to search for the report. Please try again.");
        return;
      }

      if (!result.report) {
        setError("No report found");
        return;
      }

      setReport(result.report);
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while searching. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-4xl px-6 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300/80 bg-white/90 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm shadow-slate-200 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            ← Back to homepage
          </Link>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter your tracking code to view the status of an existing report.
          </p>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 sm:p-10">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">SafeReport NG</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Track your report
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Use the tracking code from your submission to see the current report status and assigned institution.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
              <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSearch}>
            <label className="space-y-3 block">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Tracking Code</span>
              <input
                type="text"
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
                disabled={isSearching}
                placeholder="DFOC-XXXXXX"
                className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition disabled:opacity-50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
              />
            </label>

            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex w-full items-center justify-center rounded-3xl bg-slate-900 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-100"
            >
              {isSearching ? "Searching…" : "Search report"}
            </button>
          </form>

          {report && (
            <div className="mt-10 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-950">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Report found
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                    {report.trackingCode}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {report.status}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Category</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{report.category}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Institution</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{report.institution}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Priority</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{report.priority}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Date submitted</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{formatDate(report.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
