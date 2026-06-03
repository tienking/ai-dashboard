// Web worker: parses CSV/Excel off the main thread so large files don't freeze the UI.
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { analyzeColumns } from "./analyze";

self.onmessage = async (e) => {
  const { file } = e.data;
  try {
    const name = file.name.toLowerCase();
    let rows;

    if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
      const text = await file.text();
      const res = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
      rows = res.data;
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    } else {
      throw new Error("Định dạng không hỗ trợ. Chỉ nhận .csv, .xlsx, .xls, .tsv");
    }

    if (!rows.length) throw new Error("File không có dữ liệu.");

    const { columns, stats } = analyzeColumns(rows);
    self.postMessage({ ok: true, rows, columns, stats, rowCount: rows.length });
  } catch (err) {
    self.postMessage({ ok: false, error: err.message });
  }
};
