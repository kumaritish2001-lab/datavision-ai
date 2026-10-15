"use client";
// DataVision AI - Restored working dashboard
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
  const [insightQuestion, setInsightQuestion] = useState("");
  const [insightAnswer, setInsightAnswer] = useState("");
  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setInsightAnswer(""); setInsightQuestion("");
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