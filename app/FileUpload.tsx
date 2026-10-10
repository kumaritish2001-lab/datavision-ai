
"use client";

import { useState, type ChangeEvent } from "react";

type DataRow = Record<string, string | number | boolean | null>;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function FileUpload() {
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName("");
    setColumns([]);
    setRows([]);
    setLoading(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!["xlsx", "csv"].includes(extension || "")) {
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
        worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, index) => {
          headers[index - 1] = String(cell.text || `Column ${index}`);
        });

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
        throw new Error("No data rows were found in this file.");
      }

      const detectedColumns = Object.keys(parsedRows[0]);

      if (detectedColumns.length === 0) {
        throw new Error("No columns were detected.");
      }

      setFileName(file.name);
      setColumns(detectedColumns);
      setRows(parsedRows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to process this file."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white">
      <h2 className="mb-2 text-2xl font-bold">Upload your dataset</h2>

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
        <p className="mt-4 text-sky-400">Processing your file...</p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-red-400">
          {error}
        </p>
      )}

      {fileName && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-sky-400">
            {fileName}
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            {rows.length} rows · {columns.length} columns
          </p>

          <h4 className="mt-6 mb-3 font-semibold">
            Data preview (first 10 rows)
          </h4>

          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-800">
                <tr>
                  {columns.map((column, index) => (
                    <th key={index} className="whitespace-nowrap p-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-t border-slate-700">
                    {columns.map((column, columnIndex) => (
                      <td key={columnIndex} className="p-3">
                        {row[column] == null ? "—" : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
