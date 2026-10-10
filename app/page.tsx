
import FileUpload from "./FileUpload";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto w-full max-w-[1800px]">
        {/* Header */}
        <header className="mb-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            DataVision <span className="text-sky-400">AI</span>
          </h1>

          <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
            By Itish
          </span>
        </header>

        {/* Main Section */}
        <section className="py-16 text-center">
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-sky-400">
            Intelligent Business Analytics
          </p>

          <h2 className="mx-auto max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
            Turn your business data into
            <span className="text-sky-400">
              {" "}meaningful insights.
            </span>
          </h2>

          <p className="mx-auto mt-7 max-w-2xl text-lg text-slate-400">
            Upload your datasets, explore interactive dashboards,
            and make informed decisions with DataVision AI.
          </p>

          {/* File Upload Workspace */}
          <div className="mx-auto mt-12 max-w-5xl">
            <FileUpload />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          DataVision AI © 2026 · Developed by Itish
        </footer>
      </div>
    </main>
  );
}
