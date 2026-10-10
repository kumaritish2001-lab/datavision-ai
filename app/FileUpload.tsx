"use client";
import { useMemo, useState, type ChangeEvent } from "react";
type DataRow = Record<string, string | number | boolean | null>;
type Point = { label: string; value: number };
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const palette = ["#23d8ef", "#a879ff", "#fa59d1", "#4e8bff", "#ffb76b", "#38e5a1", "#f77b8e"];
function numberOf(value: DataRow[string]): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const cleaned = value.trim().replace(/[₹$,%\s,]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
const format = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
const compact = (n: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
function detect(cols: string[], patterns: string[]) {
  return cols.find((col) => patterns.some((p) => col.toLowerCase().replace(/[^a-z0-9]/g, "").includes(p))) || "";
}
function dateOrder(label: string): number | null {
  const time = Date.parse(label);
  return Number.isFinite(time) ? time : null;
}
function ChartPanel({ data, title, mode }: { data: Point[]; title: string; mode: "line" | "bar" | "area" }) {
  if (!data.length) return <div className="flex h-72 items-center justify-center text-sm text-slate-500">Select a date column and numeric metric to see trends.</div>;
  const width = 800, height = 260, left = 18, right = 18, top = 25, bottom = 35;
  const values = data.map((d) => d.value);
  let min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, Math.abs(max) * 0.05, 1);
  min -= pad; max += pad;
  if (mode === "bar") { min = Math.min(0,min); max = Math.max(0,max); }
  const coords = data.map((d, i) => ({ x: left + (data.length === 1 ? 0.5 : i / (data.length - 1)) * (width - left - right), y: top + (1 - (d.value - min) / (max - min)) * (height - top - bottom), ...d }));
  const path = coords.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const area = `${path} L${coords[coords.length - 1].x},${height - bottom} L${coords[0].x},${height - bottom} Z`;
  const latest = values.length > 1 ? values[values.length - 1] - values[values.length - 2] : 0;
  return <div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-400">{title} over {data.length} periods</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${latest < 0 ? "bg-rose-400/10 text-rose-300" : latest > 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>{latest > 0 ? "▲" : latest < 0 ? "▼" : "—"} {compact(Math.abs(latest))} latest change</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full sm:h-80 xl:h-[360px]" role="img" aria-label={`${title} trend chart`}>
      <defs><linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#24d7ec" stopOpacity=".28"/><stop offset="100%" stopColor="#9164f7" stopOpacity="0"/></linearGradient><linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#a879ff"/><stop offset="100%" stopColor="#21e4ed"/></linearGradient></defs>
      {[0,1,2,3,4].map((i) => <g key={i}><line x1={left} x2={width-right} y1={top+i*(height-top-bottom)/4} y2={top+i*(height-top-bottom)/4} stroke="#26344d" strokeDasharray="4 6"/><text x={left+4} y={top+i*(height-top-bottom)/4-5} fill="#71829e" fontSize="10">{compact(max-i*(max-min)/4)}</text></g>)}
      {mode !== "bar" && coords.length > 1 && <>{mode === "area" && <path d={area} fill="url(#trendArea)"/>}<path d={path} fill="none" stroke="url(#trendStroke)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></>}
      {mode === "bar" && coords.map((p,i) => <rect key={i} x={p.x-Math.min(18,320/coords.length)} y={Math.min(p.y,top+(1-(0-min)/(max-min))*(height-top-bottom))} width={Math.min(36,640/coords.length)} height={Math.max(1,Math.abs(top+(1-(0-min)/(max-min))*(height-top-bottom)-p.y))} rx="3" fill={i && p.value<coords[i-1].value ? "#fb7185" : "#22d3ee"}><title>{p.label}: {format(p.value)}</title></rect>)}
      {mode !== "bar" && coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === coords.length-1 ? 5 : 2.5} fill={i && p.value < coords[i-1].value ? "#fb7185" : "#22d3ee"} stroke="#111a30" strokeWidth="2"><title>{p.label}: {format(p.value)}</title></circle>)}
      {[0,Math.floor((coords.length-1)/2),coords.length-1].filter((v,i,a)=>a.indexOf(v)===i).map((i) => <text key={i} x={coords[i].x} y={height-7} textAnchor={i===0 ? "start" : i===coords.length-1 ? "end" : "middle"} fontSize="11" fill="#94a3b8">{coords[i].label.slice(0,16)}</text>)}
    </svg>
    <div className="mt-2 flex gap-4 text-xs text-slate-400"><span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-400"/>Higher / stable</span><span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-400"/>Lower than previous period</span></div>
  </div>;
}
export default function FileUpload() {
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [filter, setFilter] = useState("All");
  const [view, setView] = useState<"overview" | "data">("overview");
  const [chartMode, setChartMode] = useState<"line" | "bar" | "area">("area");
  const [showUploader, setShowUploader] = useState(false);
  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setFileName(""); setRows([]); setColumns([]); setLoading(true); setFilter("All"); setView("overview"); setShowUploader(false);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "csv" && extension !== "xlsx") throw new Error("Please upload an XLSX or CSV file.");
      if (file.size === 0) throw new Error("The selected file is empty.");
      if (file.size > MAX_FILE_SIZE) throw new Error("File must be 10 MB or smaller.");
      let parsed: DataRow[] = [];
      if (extension === "csv") {
        const Papa = (await import("papaparse")).default;
        const result = Papa.parse<DataRow>(await file.text(), { header: true, skipEmptyLines: "greedy", dynamicTyping: true, transformHeader: (header) => header.trim() });
        if (result.errors.length) throw new Error(result.errors[0].message);
        parsed = result.data;
      } else {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error("No worksheet found in this Excel file.");
        const headers: string[] = [];
        sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, index) => { headers[index-1] = cell.text.trim() || `Column ${index}`; });
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const record: DataRow = {};
          headers.forEach((header, index) => {
            const cell = row.getCell(index+1), value = cell.value;
            record[header] = typeof value === "number" || typeof value === "boolean" || typeof value === "string" ? value : value == null ? null : cell.text;
          });
          parsed.push(record);
        });
      }
      if (!parsed.length) throw new Error("No data rows found in this file.");
      const detected = Array.from(new Set(parsed.flatMap((row) => Object.keys(row)))).filter(Boolean);
      if (!detected.length) throw new Error("No columns found in this file.");
      const numeric = detected.filter((col) => parsed.some((row) => numberOf(row[col]) !== null));
      const m = detect(numeric, ["revenue", "saleskg", "salesamount", "amount", "sales", "profit", "quantity", "total"]) || numeric[0] || "";
      const c = detect(detected, ["station", "category", "product", "department", "region", "city"]) || detected.find((col) => col !== m && !numeric.includes(col)) || "";
      const d = detect(detected, ["date", "month", "period", "year"]);
      setColumns(detected); setRows(parsed); setMetric(m); setCategory(c); setDate(d); setFileName(file.name);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to read the file."); }
    finally { setLoading(false); event.target.value = ""; }
  }
  const numericColumns = useMemo(() => columns.filter((col) => rows.some((r) => numberOf(r[col]) !== null)), [columns,rows]);
  const categories = useMemo(() => category ? Array.from(new Set(rows.map((r) => String(r[category] ?? "Unknown")))).sort() : [], [rows,category]);
  const filtered = useMemo(() => !category || filter === "All" ? rows : rows.filter((r) => String(r[category] ?? "Unknown") === filter), [rows,category,filter]);
  const stats = useMemo(() => {
    const values = filtered.map((r) => numberOf(r[metric])).filter((n): n is number => n !== null);
    const total = values.reduce((sum,n)=>sum+n,0);
    return { total, average: values.length ? total/values.length : 0, maximum: values.length ? Math.max(...values) : 0, count: filtered.length, valid: values.length };
  }, [filtered,metric]);
  const groups = useMemo(() => {
    if (!category || !metric) return [];
    const map = new Map<string,number>();
    filtered.forEach((r) => { const n = numberOf(r[metric]); if (n === null) return; const key = String(r[category] ?? "Unknown"); map.set(key,(map.get(key) ?? 0)+n); });
    return Array.from(map,([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  }, [filtered,category,metric]);
  const trend = useMemo(() => {
    if (!date || !metric) return [];
    const map = new Map<string,number>();
    filtered.forEach((r)=> { const label=String(r[date] ?? "").trim(), n=numberOf(r[metric]); if (!label || n === null) return; map.set(label,(map.get(label) ?? 0)+n); });
    return Array.from(map,([label,value])=>({label,value})).sort((a,b)=> { const ad=dateOrder(a.label),bd=dateOrder(b.label); return ad !== null && bd !== null ? ad-bd : a.label.localeCompare(b.label,undefined,{numeric:true}); });
  },[filtered,date,metric]);
  const maxGroup = Math.max(1,...groups.map((g)=>Math.abs(g.value)));
  const positiveGroups = groups.filter((g)=>g.value>0);
  const donutTotal = positiveGroups.reduce((sum,g)=>sum+g.value,0);
  let donutCursor = 0;
  const donut = positiveGroups.length && donutTotal > 0 ? `conic-gradient(${positiveGroups.slice(0,7).map((g,i)=>{ const start=donutCursor; donutCursor += g.value/donutTotal*100; return `${palette[i%palette.length]} ${start}% ${donutCursor}%`; }).join(", ")}${positiveGroups.length>7 ? `, #475569 ${donutCursor}% 100%` : ""})` : "conic-gradient(#26344d 0% 100%)";
  const lastChange = trend.length>1 ? trend[trend.length-1].value-trend[trend.length-2].value : null;
  const previousValue = trend.length > 1 ? trend[trend.length-2].value : null;
  const changePercent = lastChange !== null && previousValue !== null && previousValue !== 0 ? (lastChange / Math.abs(previousValue))*100 : null;
  const targetColumn = detect(numericColumns, ["targetkg", "targetamount", "target", "budget", "goal"]);
  const targetTotal = targetColumn ? filtered.reduce((sum,r)=>sum+(numberOf(r[targetColumn]) ?? 0),0) : null;
  const targetAchievement = targetTotal !== null && targetTotal > 0 ? stats.total/targetTotal*100 : null;
  const peakPeriod = trend.length ? trend.reduce((a,b)=>b.value>a.value?b:a) : null;
  const weakestPeriod = trend.length ? trend.reduce((a,b)=>b.value<a.value?b:a) : null;
  function downloadCSV() {
    if (!columns.length) return;
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g,'""')}"`;
    const content = [columns.map(quote).join(","), ...filtered.map(row=>columns.map(col=>quote(row[col])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF",content], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a"); link.href=url; link.download="datavision-filtered.csv"; link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const cardData = [
    { label: `Total ${metric || "Metric"}`, value: compact(stats.total), detail: `${format(stats.valid)} valid values`, gradient: "from-fuchsia-500 via-purple-500 to-violet-500" },
    { label: "Average per record", value: compact(stats.average), detail: "Calculated from valid values", gradient: "from-cyan-400 via-sky-500 to-blue-600" },
    { label: "Highest record", value: compact(stats.maximum), detail: "Maximum individual value", gradient: "from-blue-500 via-indigo-500 to-violet-600" },
    { label: "Records analyzed", value: format(stats.count), detail: `${format(rows.length)} in original file`, gradient: "from-pink-500 via-rose-500 to-orange-400" },
  ];
  return <div className="mx-auto w-full max-w-none text-slate-100">
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0d1425] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-700/60 bg-[#10162a] p-4 sm:p-6 lg:w-52 lg:border-b-0 lg:border-r 2xl:w-60">
          <div className="mb-8 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-3 py-3 text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">◈ &nbsp; Workspace</div>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Workspace</div>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            <button onClick={()=>setView("overview")} className={`rounded-xl px-4 py-3 text-left text-sm transition ${view==="overview" ? "bg-gradient-to-r from-purple-500/30 to-cyan-500/10 font-semibold text-fuchsia-200 ring-1 ring-purple-500/30" : "text-slate-400 hover:bg-slate-800"}`}>◫ &nbsp; Overview</button>
            <button onClick={()=>setView("data")} className={`rounded-xl px-4 py-3 text-left text-sm transition ${view==="data" ? "bg-gradient-to-r from-purple-500/30 to-cyan-500/10 font-semibold text-fuchsia-200 ring-1 ring-purple-500/30" : "text-slate-400 hover:bg-slate-800"}`}>▤ &nbsp; Data explorer</button>
          </div>
          <div className="mt-9 hidden rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-cyan-500/5 p-4 lg:block"><div className="text-sm font-semibold">Your private workspace</div><p className="mt-2 text-xs leading-5 text-slate-400">Files are parsed in your browser. This version does not save uploaded datasets.</p></div>
          <div className="mt-8 text-xs text-slate-500">Designed by Itish</div>
        </aside>
        <main className="min-w-0 flex-1 space-y-5 bg-[radial-gradient(ellipse_at_top_right,rgba(114,57,202,0.10),transparent_50%)] p-4 sm:p-6 xl:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-400">Intelligent business analytics</div><h2 className="mt-2 text-2xl font-bold sm:text-3xl">{view==="overview" ? "Analytics overview" : "Data explorer"}</h2><p className="mt-1 text-sm text-slate-400">{fileName ? `Analyzing ${fileName}` : "Upload a dataset to bring your dashboard to life"}</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">● {fileName ? "Dataset loaded" : "Ready to upload"}</span></div>
          <div className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold">{fileName ? "Current dataset" : "Import your dataset"}</h3><p className="mt-1 text-xs text-slate-400">{fileName ? `${fileName} · ${format(rows.length)} rows · ${columns.length} columns` : "CSV or Excel (.xlsx) · Up to 10 MB · Processed in your browser"}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {fileName && <button type="button" onClick={downloadCSV} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">↓ Export filtered CSV</button>}
                {fileName && <button type="button" onClick={()=>setShowUploader(v=>!v)} className="rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25">{showUploader ? "Hide upload" : "↻ Change dataset"}</button>}
              </div>
            </div>
            {(!fileName || showUploader) && <input aria-label="Upload CSV or Excel dataset" type="file" accept=".csv,.xlsx" onChange={handleUpload} disabled={loading} className="mt-3 block w-full cursor-pointer rounded-xl border border-dashed border-purple-400/40 bg-[#0e172b] p-3 text-sm text-slate-300 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-fuchsia-500 file:to-purple-600 file:px-4 file:py-2 file:font-semibold file:text-white"/>}
            {loading && <p className="mt-3 text-sm text-cyan-300">Processing file…</p>}{error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
          </div>
          {fileName && <>
            <div className="grid gap-3 rounded-2xl border border-slate-700/70 bg-[#151e34] p-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs text-slate-400">Metric<select value={metric} onChange={(e)=>setMetric(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0e172b] p-2.5 text-sm text-white"><option value="">No numeric metric</option>{numericColumns.map((col)=><option key={col} value={col}>{col}</option>)}</select></label>
              <label className="text-xs text-slate-400">Group by<select value={category} onChange={(e)=>{setCategory(e.target.value);setFilter("All");}} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0e172b] p-2.5 text-sm text-white"><option value="">None</option>{columns.map((col)=><option key={col} value={col}>{col}</option>)}</select></label>
              <label className="text-xs text-slate-400">Time / trend<select value={date} onChange={(e)=>setDate(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0e172b] p-2.5 text-sm text-white"><option value="">None</option>{columns.map((col)=><option key={col} value={col}>{col}</option>)}</select></label>
              <label className="text-xs text-slate-400">Filter category<select value={filter} onChange={(e)=>setFilter(e.target.value)} disabled={!category} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0e172b] p-2.5 text-sm text-white disabled:opacity-50"><option value="All">All categories</option>{categories.map((cat)=><option key={cat} value={cat}>{cat}</option>)}</select></label>
            </div>
            {view==="overview" ? <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cardData.map((card,i)=><div key={card.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 shadow-lg`}><div className="absolute -right-7 -top-9 h-32 w-32 rounded-full bg-white/10"/><div className="relative"><div className="text-xs font-semibold text-white/85">{card.label}</div><div className="mt-5 break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{card.value}</div><div className="mt-3 text-xs text-white/80">{card.detail}</div></div><span className="absolute right-4 bottom-4 text-xl text-white/40">{["◈","⌁","↗","▦"][i]}</span></div>)}</div>
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Performance intelligence">
                <div className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-4"><div className="text-xs text-slate-400">Period-over-period growth</div><div className={`mt-2 text-2xl font-bold ${changePercent===null ? "text-slate-200" : changePercent<0 ? "text-rose-300" : "text-emerald-300"}`}>{changePercent===null ? "N/A" : `${changePercent>0?"+":""}${changePercent.toFixed(1)}%`}</div><div className="mt-2 text-xs text-slate-500">Compared with previous {date || "period"}</div></div>
                <div className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-4"><div className="text-xs text-slate-400">Target achievement</div><div className="mt-2 text-2xl font-bold text-cyan-300">{targetAchievement===null ? "N/A" : `${targetAchievement.toFixed(1)}%`}</div><div className="mt-2 text-xs text-slate-500">{targetColumn ? `Based on ${targetColumn}` : "No target column detected"}</div></div>
                <div className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-4"><div className="text-xs text-slate-400">Highest period</div><div className="mt-2 text-2xl font-bold text-white">{peakPeriod ? compact(peakPeriod.value) : "N/A"}</div><div className="mt-2 truncate text-xs text-slate-500" title={peakPeriod?.label}>{peakPeriod?.label || "Choose a time column"}</div></div>
                <div className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-4"><div className="text-xs text-slate-400">Lowest period</div><div className="mt-2 text-2xl font-bold text-white">{weakestPeriod ? compact(weakestPeriod.value) : "N/A"}</div><div className="mt-2 truncate text-xs text-slate-500" title={weakestPeriod?.label}>{weakestPeriod?.label || "Choose a time column"}</div></div>
              </section>
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
                <section className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-5"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">Performance trends</h3><p className="mt-1 text-xs text-slate-400">Actual {metric || "metric"} totals grouped by {date || "period"}</p></div><div className="flex rounded-lg border border-slate-700 bg-[#0e172b] p-1">{(["area","line","bar"] as const).map(mode=><button key={mode} type="button" onClick={()=>setChartMode(mode)} aria-pressed={chartMode===mode} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${chartMode===mode ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:text-white"}`}>{mode}</button>)}</div></div><ChartPanel data={trend} title={metric || "Metric"} mode={chartMode}/></section>
                <section className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-5"><h3 className="text-lg font-bold">Category distribution</h3><p className="mt-1 text-xs text-slate-400">Share of positive {metric || "metric"} totals</p><div className="mx-auto mt-7 flex h-48 w-48 items-center justify-center rounded-full" style={{background:donut}}><div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#151e34] text-center"><div className="text-2xl font-bold">{compact(donutTotal)}</div><div className="text-xs text-slate-400">Positive total</div></div></div><div className="mt-6 grid gap-2">{positiveGroups.slice(0,5).map((g,i)=><div key={g.label} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:palette[i%palette.length]}}/><span className="truncate">{g.label}</span></span><span className="font-semibold">{donutTotal ? (g.value/donutTotal*100).toFixed(1) : "0"}%</span></div>)}{!positiveGroups.length && <p className="text-center text-sm text-slate-500">No positive category totals to display</p>}</div></section>
              </div>
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
                <section className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-5"><h3 className="text-lg font-bold">Performance by {category || "category"}</h3><p className="mt-1 text-xs text-slate-400">Top 8 categories by total {metric || "metric"}</p><div className="mt-7 space-y-5">{groups.slice(0,8).map((g,i)=><div key={g.label}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="truncate text-slate-300" title={g.label}>{g.label}</span><span className={g.value<0 ? "text-rose-300" : "text-slate-200"}>{compact(g.value)}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-[#0e172b]"><div className="h-full rounded-full transition-all duration-500" style={{width:`${Math.abs(g.value)/maxGroup*100}%`,background:g.value<0 ? "#fb7185" : palette[i%palette.length]}}/></div></div>)}{!groups.length && <p className="text-sm text-slate-500">Choose a grouping column and numeric metric.</p>}</div></section>
                <section className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-5"><h3 className="text-lg font-bold">Performance signals</h3><p className="mt-1 text-xs text-slate-400">Changes in the selected metric</p><div className={`mt-6 rounded-xl border p-5 ${lastChange===null ? "border-slate-700 bg-slate-800/40" : lastChange<0 ? "border-rose-400/20 bg-rose-400/10" : lastChange>0 ? "border-emerald-400/20 bg-emerald-400/10" : "border-slate-700 bg-slate-800/40"}`}><div className="text-sm text-slate-300">Latest period change</div><div className={`mt-3 text-3xl font-bold ${lastChange===null ? "text-slate-300" : lastChange<0 ? "text-rose-300" : lastChange>0 ? "text-emerald-300" : "text-slate-300"}`}>{lastChange===null ? "N/A" : `${lastChange>0 ? "+" : ""}${compact(lastChange)}`}</div><div className="mt-2 text-xs text-slate-400">{lastChange===null ? "At least two time periods are needed" : lastChange<0 ? "Lower than the previous period" : lastChange>0 ? "Higher than the previous period" : "Unchanged from the previous period"}</div></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#0e172b] p-4"><div className="text-xs text-slate-400">Valid values</div><div className="mt-2 text-xl font-bold text-cyan-300">{format(stats.valid)}</div></div><div className="rounded-xl bg-[#0e172b] p-4"><div className="text-xs text-slate-400">Missing values</div><div className="mt-2 text-xl font-bold text-fuchsia-300">{format(stats.count-stats.valid)}</div></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Red indicates a numerical decline, not necessarily poor business performance. Interpretation depends on the metric.</p></section>
              </div>
            </> : <section className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-5"><h3 className="text-lg font-bold">Dataset explorer</h3><p className="mt-1 text-xs text-slate-400">Showing first 100 matching rows of {format(filtered.length)} · {columns.length} columns</p><div className="mt-5 max-h-[580px] overflow-auto rounded-xl border border-slate-700"><table className="min-w-full border-collapse text-left text-xs"><thead className="sticky top-0 bg-[#26304a] text-slate-200"><tr>{columns.map((col)=><th key={col} className="whitespace-nowrap border-b border-slate-600 p-3">{col}</th>)}</tr></thead><tbody>{filtered.slice(0,100).map((row,i)=><tr key={i} className="border-b border-slate-700/50 hover:bg-white/5">{columns.map((col)=><td key={col} className="min-w-28 max-w-60 break-words p-3 text-slate-300">{row[col] == null ? "—" : String(row[col])}</td>)}</tr>)}</tbody></table></div></section>}
          </>}
          {!fileName && <div className="grid gap-4 sm:grid-cols-3">{[{n:"01",title:"Upload",text:"Choose a CSV or Excel file."},{n:"02",title:"Analyze",text:"Metrics and groups are detected automatically."},{n:"03",title:"Explore",text:"View live charts, filters and trends."}].map((step)=><div key={step.n} className="rounded-2xl border border-slate-700/70 bg-[#151e34] p-5"><span className="text-xl font-bold text-purple-400">{step.n}</span><h3 className="mt-3 font-semibold">{step.title}</h3><p className="mt-2 text-xs leading-5 text-slate-400">{step.text}</p></div>)}</div>}
          <footer className="border-t border-slate-700/60 pt-5 text-center text-xs text-slate-500">DataVision AI © 2026 · Designed by Itish · Dashboard values come from your uploaded data</footer>
        </main>
      </div>
    </div>
  </div>;
}
