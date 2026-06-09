"use client";

import Link from "next/link";
import { use, useState } from "react";
import { submitReport } from "@/lib/reportService";

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
  
  // Form state
  const [category, setCategory] = useState(defaultCategory);
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitReport({
        category,
        priority,
        description,
        name: name || undefined,
        phone: phone || undefined,
        email: email || undefined,
        location: location || undefined,
      });

      if (result.success && result.trackingCode) {
        setTrackingCode(result.trackingCode);
        // Reset form
        setCategory(defaultCategory);
        setPriority("Medium");
        setDescription("");
        setName("");
        setPhone("");
        setEmail("");
        setLocation("");
      } else {
        setError(result.error || "Failed to submit report. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (trackingCode) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
        <main className="mx-auto max-w-4xl px-6 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="flex flex-col gap-6">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300/80 bg-white/90 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm shadow-slate-200 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              ← Back to homepage
            </Link>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95 sm:p-10">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                  <span className="text-3xl">✓</span>
                </div>
                <h1 className="text-4xl font-semibold text-slate-950 dark:text-white">
                  Report Submitted Successfully
                </h1>
                <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                  Thank you for your report. Your report has been received and assigned to the appropriate institution for review.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-950">
                <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                  Your Report Tracking Code
                </p>
                <p className="mt-4 text-center text-3xl font-bold tracking-widest text-slate-950 dark:text-white">
                  {trackingCode}
                </p>
                <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
                  Save this code to track your report. You can use it to check the status of your submission.
                </p>
              </div>

              <button
                onClick={() => {
                  setTrackingCode(null);
                }}
                className="mt-8 inline-flex w-full items-center justify-center rounded-3xl bg-slate-900 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/60 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-100"
              >
                Submit Another Report
              </button>
            </section>
          </div>
        </main>
      </div>
    );
  }

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

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
              <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-3">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Report Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
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
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                >
                  {priorities.map((priorityOption) => (
                    <option key={priorityOption} value={priorityOption}>
                      {priorityOption}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isSubmitting}
                rows={6}
                placeholder="Describe the situation with as much detail as possible..."
                className="min-h-[170px] w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-4 text-slate-900 outline-none transition disabled:opacity-50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
              />
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-3 block">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Optional"
                  className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition disabled:opacity-50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                />
              </label>
              <label className="space-y-3 block">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Optional"
                  className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition disabled:opacity-50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                />
              </label>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-3 block">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Optional"
                  className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition disabled:opacity-50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                />
              </label>
              <label className="space-y-3 block">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Location</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Optional"
                  className="w-full rounded-[1.5rem] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition disabled:opacity-50 focus:border-slate-500 focus:ring-2 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-500 dark:focus:ring-slate-500/20"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-3xl bg-slate-900 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-400/60 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-100"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
