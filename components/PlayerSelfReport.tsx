"use client";

import { useState, useMemo } from "react";
import { Upload, Download, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface SelfReport {
  name: string;
  rpe: number;
  fatigue: number;
  soreness: number;
  note: string;
  date: string;
}

const STORAGE_KEY = "kenshin_player_self_reports";

function loadReports(): SelfReport[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveReports(reports: SelfReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function statusColor(rpe: number, fatigue: number, soreness: number): string {
  const score = (fatigue + soreness) / 2 + (rpe > 7 ? 1 : rpe > 5 ? 0.5 : 0);
  if (score <= 2) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score <= 3.5) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-[#992828]/20 text-[#992828] border-[#992828]/30";
}

function statusLabel(rpe: number, fatigue: number, soreness: number): string {
  const score = (fatigue + soreness) / 2 + (rpe > 7 ? 1 : rpe > 5 ? 0.5 : 0);
  if (score <= 2) return "良好";
  if (score <= 3.5) return "注意";
  return "疲劳";
}

export function PlayerSelfReport() {
  const [show, setShow] = useState(false);
  const [reports, setReports] = useState<SelfReport[]>(loadReports);
  const latest = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return reports.filter(r => r.date === today);
  }, [reports]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    if (rows.length < 2) return;

    const today = new Date().toISOString().slice(0, 10);
    const imported: SelfReport[] = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[0]) continue;
      imported.push({
        name: String(r[0] || "").trim(),
        rpe: Number(r[1]) || 0,
        fatigue: Number(r[2]) || 0,
        soreness: Number(r[3]) || 0,
        note: String(r[4] || "").trim(),
        date: today,
      });
    }

    const merged = [...reports.filter(r => r.date !== today), ...imported];
    setReports(merged);
    saveReports(merged);
    e.target.value = "";
  };

  const handleExportTemplate = () => {
    const csv = "姓名,RPE(1-10),疲劳度(1-5),肌肉酸痛(1-5),备注\n张三,7,3,2,\n李四,4,5,4,抽筋\n王五,2,1,1,感觉良好";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "球员自评模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#1e1e1e] border border-[#222] text-gray-400 hover:text-white hover:border-[#444] transition"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        球员自评
        {latest.length > 0 && (
          <span className="px-1 py-0 rounded text-[9px] bg-[#992828]/20 text-[#992828]">{latest.length}人</span>
        )}
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShow(false)}>
          <div className="bg-[#1e1e1e] border border-[#222] rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
              <h2 className="text-sm font-bold text-[#d1d1d1] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#992828]" />
                球员自评
              </h2>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#222]">
              <button onClick={handleExportTemplate}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-400 bg-[#111] hover:text-white hover:bg-[#222] transition">
                <Download className="w-3 h-3" />下载模板
              </button>
              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-400 bg-[#111] hover:text-white hover:bg-[#222] transition cursor-pointer">
                <Upload className="w-3 h-3" />导入Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
              </label>
            </div>

            {/* Table */}
            <div className="overflow-y-auto max-h-[55vh]">
              {latest.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  今日暂无自评数据<br />
                  <span className="text-gray-600">下载模板发给球员填写后再导入</span>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#222] text-gray-500">
                      <th className="text-left py-2 px-4 font-medium">姓名</th>
                      <th className="text-center py-2 px-2 font-medium">RPE</th>
                      <th className="text-center py-2 px-2 font-medium">疲劳</th>
                      <th className="text-center py-2 px-2 font-medium">酸痛</th>
                      <th className="text-left py-2 px-2 font-medium">备注</th>
                      <th className="text-center py-2 px-3 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((r, i) => (
                      <tr key={i} className="border-b border-[#111] hover:bg-[#222]/50">
                        <td className="py-2 px-4 text-gray-300 font-medium">{r.name}</td>
                        <td className="py-2 px-2 text-center text-gray-400">{r.rpe || "-"}</td>
                        <td className="py-2 px-2 text-center text-gray-400">{r.fatigue || "-"}</td>
                        <td className="py-2 px-2 text-center text-gray-400">{r.soreness || "-"}</td>
                        <td className="py-2 px-2 text-gray-500 max-w-[120px] truncate">{r.note || "-"}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] border ${statusColor(r.rpe, r.fatigue, r.soreness)}`}>
                            {statusLabel(r.rpe, r.fatigue, r.soreness)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
