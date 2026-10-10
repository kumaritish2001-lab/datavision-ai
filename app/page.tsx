import FileUpload from "./FileUpload";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080d19] text-slate-100">
      <div className="mx-auto w-full max-w-none px-3 py-4 sm:px-5 lg:px-7 xl:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-xl font-bold text-white shadow-lg shadow-violet-500/20">
              ◈
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                DataVision <span className="text-cyan-400">AI</span>
              </h1>
              <p className="text-[11px] uppercase tracking-[.18em] text-slate-500">
                Business intelligence studio
              </p>
            </div>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs text-slate-300">
            Designed by Itish
          </span>
        </header>

        <section className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-cyan-400">
              Intelligent business analytics
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Your data.{" "}
              <span className="text-cyan-400">Clearer decisions.</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Upload a dataset, explore performance and uncover meaningful trends.
            </p>
          </div>
          <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300">
            CSV &amp; Excel analytics
          </span>
        </section>

        <FileUpload />
      </div>
    </main>
  );
}