
"use client";

import { useMemo, useState, type ChangeEvent } from "react";

type DataRow = Record<string, string | number | boolean | null>;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function numericValue(value: DataRow[string]): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const cleaned = value.trim().replace(/[₹$,\s]/g, "");

    if (cleaned === "") return null;

    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function shortNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function detectColumn(columns: string[], patterns: string[]) {
  return columns.find((column) =>
    patterns.some((pattern) =>
      column.toLowerCase().replace(/[^a-z0-9]/g, "").includes(pattern)
    )
  );
}

export default function FileUpload() {
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [categoryColumn, setCategoryColumn] = useState("");
  const [metricColumn, setMetricColumn] = useState("");
  const [dateColumn, setDateColumn] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName("");
    setColumns([]);
    setRows([]);
    setLoading(true);
    setSelectedCategory("All");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension !== "xlsx" && extension !== "csv") {
        throw new Error("Please upload an XLSX or CSV file.");
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File must be smaller than 10 MB.");
      }

      if (file.size === 0) {
        throw new Error("The selected file is empty.");
      }

      let parsedRows: DataRow[] = [];

      if (extension === "csv") {
        const Papa = (await import("papaparse")).default;
        const text = await file.text();

        const result = Papa.parse<DataRow>(text, {
          header: true,
          skipEmptyLines: "greedy",
          dynamicTyping: true,
        });

        if (result.errors.length > 0) {
          throw new Error(result.errors[0].message);
        }

        parsedRows = result.data;
      } else {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();

        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
          throw new Error("No worksheet found in the Excel file.");
        }

        const headers: string[] = [];

        worksheet.getRow(1).eachCell(
          { includeEmpty: true },
          (cell, index) => {
            headers[index - 1] = String(
              cell.text || `Column ${index}`
            );
          }
        );

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;

          const record: DataRow = {};

          headers.forEach((header, index) => {
            const cell = row.getCell(index + 1);
            const value = cell.value;

            record[header] =
              typeof value === "number" ||
              typeof value === "boolean" ||
              typeof value === "string"
                ? value
                : value == null
                  ? null
                  : cell.text;
          });

          parsedRows.push(record);
        });
      }

      if (parsedRows.length === 0) {
        throw new Error("No data rows found in this file.");
      }

      const detectedColumns = Array.from(
        new Set(parsedRows.flatMap((row) => Object.keys(row)))
      ).filter((column) => column.trim() !== "");

      if (detectedColumns.length === 0) {
        throw new Error("No columns were detected.");
      }

      const numericColumns = detectedColumns.filter((column) =>
        parsedRows.some((row) => numericValue(row[column]) !== null)
      );

      const preferredMetric =
        detectColumn(numericColumns, [
          "revenue",
          "saleskg",
          "salesamount",
          "amount",
          "sales",
          "profit",
          "quantity",
          "total",
        ]) ||
        numericColumns[0] ||
        "";

      const preferredCategory =
        detectColumn(detectedColumns, [
          "station",
          "category",
          "product",
          "department",
          "region",
          "city",
        ]) ||
        detectedColumns.find(
          (column) =>
            column !== preferredMetric &&
            !numericColumns.includes(column)
        ) ||
        "";

      const preferredDate =
        detectColumn(detectedColumns, [
          "date",
          "month",
          "period",
          "year",
        ]) || "";

      setColumns(detectedColumns);
      setRows(parsedRows);
      setFileName(file.name);
      setMetricColumn(preferredMetric);
      setCategoryColumn(preferredCategory);
      setDateColumn(preferredDate);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process this file."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  const numericColumns = useMemo(
    () =>
      columns.filter((column) =>
        rows.some((row) => numericValue(row[column]) !== null)
      ),
    [columns, rows]
  );

  const categories = useMemo(() => {
    if (!categoryColumn) return [];

    return Array.from(
      new Set(
        rows.map((row) => String(row[categoryColumn] ?? "Unknown"))
      )
    ).sort();
  }, [rows, categoryColumn]);

  const filteredRows = useMemo(() => {
    if (!categoryColumn || selectedCategory === "All") {
      return rows;
    }

    return rows.filter(
      (row) =>
        String(row[categoryColumn] ?? "Unknown") ===
        selectedCategory
    );
  }, [rows, categoryColumn, selectedCategory]);

  const statistics = useMemo(() => {
    const values = filteredRows
      .map((row) => numericValue(row[metricColumn]))
      .filter((value): value is number => value !== null);

    const total = values.reduce((sum, value) => sum + value, 0);

    return {
      total,
      average: values.length ? total / values.length : 0,
      maximum: values.length ? Math.max(...values) : 0,
      count: filteredRows.length,
      validCount: values.length,
    };
  }, [filteredRows, metricColumn]);

  const categoryData = useMemo(() => {
    if (!categoryColumn || !metricColumn) return [];

    const totals = new Map<string, number>();

    for (const row of filteredRows) {
      const category = String(row[categoryColumn] ?? "Unknown");
      const value = numericValue(row[metricColumn]);

      if (value === null) continue;

      totals.set(category, (totals.get(category) ?? 0) + value);
    }

    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRows, categoryColumn, metricColumn]);

  const trendData = useMemo(() => {
    if (!dateColumn || !metricColumn) return [];

    const totals = new Map<string, number>();

    for (const row of filteredRows) {
      const date = String(row[dateColumn] ?? "").trim();
      const value = numericValue(row[metricColumn]);

      if (!date || value === null) continue;

      totals.set(date, (totals.get(date) ?? 0) + value);
    }

    return Array.from(totals.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows, dateColumn, metricColumn]);

  const maxCategoryValue = Math.max(
    0,
    ...categoryData.map((item) => Math.abs(item.value))
  );

  const trendValues = trendData.map((item) => item.value);
  const trendMin = trendValues.length
    ? Math.min(...trendValues)
    : 0;
  const trendMax = trendValues.length
    ? Math.max(...trendValues)
    : 0;

  const trendPoints = trendData
    .map((item, index) => {
      const x =
        trendData.length === 1
          ? 50
          : 5 + (index / (trendData.length - 1)) * 90;

      const y =
        trendMax === trendMin
          ? 50
          : 90 -
            ((item.value - trendMin) /
              (trendMax - trendMin)) *
              80;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-white">
      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="mb-2 text-2xl font-bold">
          Upload your dataset
        </h2>

        <p className="mb-6 text-sm text-slate-400">
          Upload an Excel (.xlsx) or CSV file, up to 10 MB.
          Files are processed in your browser.
        </p>

        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={handleUpload}
          disabled={loading}
          className="block w-full rounded-lg border border-dashed border-slate-600 p-4 text-sm"
        />

        {loading && (
          <p className="mt-4 text-sky-400">
            Processing your file...
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-red-400">
            {error}
          </p>
        )}

        {fileName && (
          <div className="mt-5 rounded-lg bg-slate-800 p-4">
            <p className="font-semibold text-sky-400">
              {fileName}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {rows.length} rows · {columns.length} columns
            </p>
          </div>
        )}
      </section>

      {fileName && (
        <>
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-bold">
              Dashboard controls
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Metric to analyze
                </label>

                <select
                  value={metricColumn}
                  onChange={(event) =>
                    setMetricColumn(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
                >
                  {numericColumns.length === 0 && (
                    <option value="">No numeric columns</option>
                  )}

                  {numericColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Group by
                </label>

                <select
                  value={categoryColumn}
                  onChange={(event) => {
                    setCategoryColumn(event.target.value);
                    setSelectedCategory("All");
                  }}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
                >
                  <option value="">None</option>

                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Date / trend column
                </label>

                <select
                  value={dateColumn}
                  onChange={(event) =>
                    setDateColumn(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3"
                >
                  <option value="">None</option>

                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {categoryColumn && (
              <div className="mt-5">
                <label className="mb-2 block text-sm text-slate-400">
                  Filter {categoryColumn}
                </label>

                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 md:max-w-sm"
                >
                  <option value="All">All categories</option>

                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-bold">
                Analytics Dashboard
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Calculated directly from your uploaded dataset
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: `Total ${metricColumn || "Metric"}`,
                  value: formatNumber(statistics.total),
                },
                {
                  label: "Average per valid record",
                  value: formatNumber(statistics.average),
                },
                {
                  label: "Maximum record value",
                  value: formatNumber(statistics.maximum),
                },
                {
                  label: "Records",
                  value: formatNumber(statistics.count),
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                >
                  <p className="text-sm text-slate-400">
                    {card.label}
                  </p>

                  <p className="mt-3 break-words text-2xl font-bold text-sky-400">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h3 className="mb-2 text-xl font-bold">
                Performance by {categoryColumn || "Category"}
              </h3>

              <p className="mb-6 text-xs text-slate-400">
                Sum of {metricColumn || "selected metric"} by group
              </p>

              {categoryData.length > 0 ? (
                <div className="space-y-5">
                  {categoryData.map((item) => {
                    const width =
                      maxCategoryValue === 0
                        ? 0
                        : (Math.abs(item.value) /
                            maxCategoryValue) *
                          100;

                    return (
                      <div key={item.name}>
                        <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                          <span className="break-words text-slate-300">
                            {item.name}
                          </span>

                          <span className="shrink-0 font-semibold text-sky-400">
                            {shortNumber(item.value)}
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              item.value < 0
                                ? "bg-rose-400"
                                : "bg-sky-400"
                            }`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Select a grouping column and numeric metric
                  to display this chart.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h3 className="mb-2 text-xl font-bold">
                Performance Trend
              </h3>

              <p className="mb-6 text-xs text-slate-400">
                Sum of {metricColumn || "metric"} by{" "}
                {dateColumn || "date"}
              </p>

              {trendData.length > 0 ? (
                <>
                  <div className="mb-3 flex justify-between gap-3 text-xs text-slate-400">
                    <span>
                      Min: {shortNumber(trendMin)}
                    </span>

                    <span>
                      Max: {shortNumber(trendMax)}
                    </span>
                  </div>

                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="h-64 w-full overflow-visible"
                    role="img"
                    aria-label={`Trend chart for ${metricColumn}`}
                  >
                    {[10, 30, 50, 70, 90].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke="#334155"
                        strokeWidth="0.35"
                        strokeDasharray="1 1"
                      />
                    ))}

                    {trendData.length === 1 ? (
                      <circle
                        cx="50"
                        cy="50"
                        r="1.5"
                        fill="#38bdf8"
                      />
                    ) : (
                      <polyline
                        points={trendPoints}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                  </svg>

                  <div className="mt-4 flex justify-between gap-3 text-xs text-slate-400">
                    <span className="break-all">
                      {trendData[0]?.date}
                    </span>

                    <span className="break-all text-right">
                      {trendData[trendData.length - 1]?.date}
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    {trendData.length} distinct periods
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">
                  Select a date column and numeric metric
                  to display the trend.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-2 text-xl font-bold">
              Data Quality Summary
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-sm text-slate-400">
                  Total rows
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {formatNumber(rows.length)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-sm text-slate-400">
                  Valid metric values (filtered)
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {formatNumber(statistics.validCount)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-800 p-4">
                <p className="text-sm text-slate-400">
                  Missing / invalid metric values
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {formatNumber(
                    statistics.count - statistics.validCount
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-2 text-xl font-bold">
              Data Preview
            </h3>

            <p className="mb-5 text-sm text-slate-400">
              First 10 matching rows
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap p-3"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.slice(0, 10).map((row, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-700"
                    >
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="min-w-24 p-3"
                        >
                          {row[column] == null
                            ? "—"
                            : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
