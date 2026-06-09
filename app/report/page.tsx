"use client";

import Link from "next/link";
import { use, useState } from "react";

const categories = [
  "Crime",
  "Medical Emergency",
  "Fire Emergency",
  "Cybercrime",
  "Other Emergency",
];

const priorities = ["Low", "Medium", "High", "Critical"];

type ReportPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default function ReportPage({ searchParams }: ReportPageProps) {
  const params = use(searchParams);
  const queryCategory = params.category;
  const defaultCategory = categories.includes(queryCategory || "") ? queryCategory! : categories[0];
  const [category, setCategory] = useState(defaultCategory);

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
            Fill out the report details below. All reports are kept anonymous unless you provide contact details.
          </p>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 sm:p-10">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">SafeReport NG</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Report an emergency
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Use this form to describe the incident, choose a category and priority level, and optionally provide contact information.
            </p>
          </div>

          <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-3">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Report Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                >
                  {categories.map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption}>
                      {categoryOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-3">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Priority</span>
                <select className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50">
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-3 block">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Description</span>
                <span className="text-sm text-rose-500">*</span>
              </div>
              <textarea
                required
                rows={6}
                placeholder="Describe the situation with as much detail as possible..."
                className="min-h-[170px] w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-4 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
              />
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-3 block">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Name</span>
                <input
                  type="text"
                  placeholder="Optional"
                  className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                />
              </label>
              <label className="space-y-3 block">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Phone Number</span>
                <input
                  type="tel"
                  placeholder="Optional"
                  className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                />
              </label>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-3 block">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Email Address</span>
                <input
                  type="email"
                  placeholder="Optional"
                  className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                />
              </label>
              <label className="space-y-3 block">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Location</span>
                <input
                  type="text"
                  placeholder="Optional"
                  className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                />
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-3xl bg-slate-900 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/60 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-100"
            >
              Submit Report
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
