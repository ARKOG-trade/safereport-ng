import Link from "next/link";

const categories = [
  { id: "crime", label: "Crime", emoji: "🚓", color: "border-red-400" },
  { id: "medical", label: "Medical", emoji: "🚑", color: "border-green-400" },
  { id: "fire", label: "Fire", emoji: "🔥", color: "border-orange-400" },
  { id: "cybercrime", label: "Cybercrime", emoji: "🖥️", color: "border-indigo-400" },
  { id: "other", label: "Other Emergency", emoji: "⚠️", color: "border-yellow-400" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black text-zinc-900 dark:text-zinc-50">
      <main className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold">SafeReport NG</h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Quickly report emergencies to the right responders. Choose a category
            below to get started.
          </p>
        </header>

        <section>
          <h2 className="sr-only">Emergency Categories</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/report/${c.id}`}
                className={`group flex flex-col justify-between rounded-lg border p-5 transition-shadow hover:shadow-lg ${c.color} border-opacity-30 bg-white dark:bg-[#0b0b0b]`}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-black/5 p-3 text-2xl dark:bg-white/5">{c.emoji}</div>
                  <div>
                    <h3 className="text-xl font-semibold">{c.label}</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Tap to start a report for {c.label.toLowerCase()}.</p>
                  </div>
                </div>
                <div className="mt-4 text-sm font-medium text-foreground/80 group-hover:text-foreground">Start Report →</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
