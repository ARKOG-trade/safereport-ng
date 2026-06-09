import Link from "next/link";

const categories = [
  {
    label: "Report Crime",
    details: "Securely submit details for criminal activity.",
    icon: "🚓",
    highlight: "border-red-400/60 bg-red-50/70 dark:bg-red-500/10",
  },
  {
    label: "Medical Emergency",
    details: "Get help for urgent health and injury cases.",
    icon: "🚑",
    highlight: "border-emerald-400/60 bg-emerald-50/70 dark:bg-emerald-500/10",
  },
  {
    label: "Fire Emergency",
    details: "Report fires quickly so responders can act fast.",
    icon: "🔥",
    highlight: "border-orange-400/60 bg-orange-50/70 dark:bg-orange-500/10",
  },
  {
    label: "Cybercrime",
    details: "Report online fraud, hacking, or data theft.",
    icon: "🖥️",
    highlight: "border-indigo-400/60 bg-indigo-50/70 dark:bg-indigo-500/10",
  },
  {
    label: "Other Emergency",
    details: "Report any other urgent situation anonymously.",
    icon: "⚠️",
    highlight: "border-sky-400/60 bg-sky-50/70 dark:bg-sky-500/10",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-8 shadow-[0_35px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white shadow-sm shadow-slate-900/10 dark:bg-slate-50 dark:text-slate-950">
                SafeReport NG
              </span>
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Powered by DFOC</p>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-6xl">
                SafeReport NG
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Anonymous crime and emergency reporting platform built for fast, secure,
                and modern incident reporting.
              </p>
              <div className="mt-8">
                <Link
                  href="/track"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  Track existing reports
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-50 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] dark:bg-slate-950/90">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Choose an emergency type
              </p>
              <div className="mt-6 grid gap-4">
                {categories.map((item) => (
                  <Link
                    key={item.label}
                    href={`/report?category=${encodeURIComponent(item.label)}`}
                    className={`group flex w-full items-start gap-4 rounded-3xl border px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${item.highlight} border-opacity-70 focus:outline-none focus:ring-2 focus:ring-slate-400/60 dark:focus:ring-slate-200/30`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm shadow-slate-200/60 dark:bg-slate-950 dark:shadow-slate-950/40">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                        {item.label}
                      </p>
                      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
                        {item.details}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
