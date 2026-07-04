"use client";

import { useState, useMemo } from "react";
import { jsPDF } from "jspdf";
import { FileText, Loader2 } from "lucide-react";

export function ReportGenerator() {
  const [generating, setGenerating] = useState(false);

  // Pull real data from localStorage
  const data = useMemo(() => {
    try {
      const logs = JSON.parse(localStorage.getItem("kenshin_daily_training_log") || "[]");
      const roster = JSON.parse(localStorage.getItem("roster_players") || "[]");
      const gyms = JSON.parse(localStorage.getItem("kenshin_gym_calendar") || "[]");
      const selfReports = JSON.parse(localStorage.getItem("kenshin_player_self_reports") || "[]");
      return { logs, roster, gyms, selfReports };
    } catch { return { logs: [], roster: [], gyms: [], selfReports: [] }; }
  }, []);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekLabel = `${weekStart.getMonth()+1}/${weekStart.getDate()}`;

  const generatePDF = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 100));

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 15;
    let y = M;

    // Header
    doc.setFillColor(153, 40, 40);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("KENSHIN PRO S&C", M, 10);
    doc.setFontSize(8);
    doc.text("职业体能教练工作台", M, 16);
    y = 28;

    // Title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.text("训练周报", M, y);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`生成日期: ${today.toLocaleDateString("zh-CN")}  |  本周: ${weekLabel}起`, M, y + 5);
    y += 14;
    doc.setDrawColor(220, 220, 220);
    doc.line(M, y, W - M, y);
    y += 6;

    // Section 1: Roster status
    if (data.roster.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("一、球队状态", M, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const healthy = data.roster.filter((p: any) => p.injuryStatus === "healthy").length;
      const injured = data.roster.filter((p: any) => p.injuryStatus !== "healthy").length;
      doc.text(`总人数: ${data.roster.length}  |  健康: ${healthy}  |  伤病: ${injured}`, M, y);
      y += 4;
      data.roster.filter((p: any) => p.injuryStatus !== "healthy").forEach((p: any) => {
        if (y > 270) { doc.addPage(); y = M; }
        doc.text(`${p.name} (${p.position}): ${p.injuryStatus === "out" ? "伤停" : "轻伤"} — ${p.injuryNote || "—"}`, M, y);
        y += 4;
      });
      y += 4;
    }

    // Section 2: Training logs this week
    const weekLogs = data.logs.filter((l: any) => {
      const d = new Date(l.date);
      return d >= weekStart && d <= today;
    });
    if (weekLogs.length > 0) {
      if (y > 240) { doc.addPage(); y = M; }
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("二、本周训练记录", M, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      weekLogs.forEach((l: any) => {
        if (y > 270) { doc.addPage(); y = M; }
        const names = (l.exercises || []).map((e: any) => e.name).join("、");
        doc.text(`${l.date}: ${l.planId || "训练"} (${l.scene}) — ${l.duration}min — ${names.slice(0, 60)}`, M, y);
        y += 4;
      });
      y += 4;
    }

    // Section 3: Self reports
    const todayReports = data.selfReports.filter((r: any) => r.date === today.toISOString().slice(0, 10));
    if (todayReports.length > 0) {
      if (y > 240) { doc.addPage(); y = M; }
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("三、今日球员自评", M, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      todayReports.forEach((r: any) => {
        if (y > 270) { doc.addPage(); y = M; }
        const score = (r.fatigue + r.soreness) / 2 + (r.rpe > 7 ? 1 : 0);
        const status = score <= 2 ? "良好" : score <= 3.5 ? "注意" : "疲劳";
        doc.text(`${r.name}: RPE${r.rpe} 疲${r.fatigue} 酸${r.soreness} — ${status} ${r.note ? "("+r.note+")" : ""}`, M, y);
        y += 4;
      });
      y += 4;
    }

    // Section 4: Gym calendar
    const weekGyms = data.gyms.filter((g: any) => {
      const d = new Date(g.date || g.createdAt);
      return d >= weekStart && d <= today;
    });
    if (weekGyms.length > 0) {
      if (y > 240) { doc.addPage(); y = M; }
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("四、力量房排课", M, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      weekGyms.forEach((g: any) => {
        if (y > 270) { doc.addPage(); y = M; }
        doc.text(`${g.date || g.createdAt}: ${g.goal || ""} ${g.phase || ""} — ${(g.exerciseIds || []).length}个动作`, M, y);
        y += 4;
      });
      y += 4;
    }

    // Footer
    doc.setDrawColor(153, 40, 40);
    doc.line(M, 282, W - M, 282);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("KenshinPro S&C — 体能教练工作台 | 本报告由系统自动生成", M, 286);

    doc.save(`KenshinPro_周报_${weekLabel}.pdf`);
    setGenerating(false);
  };

  return (
    <button
      onClick={generatePDF}
      disabled={generating}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#1e1e1e] border border-[#222] text-gray-400 hover:text-white hover:border-[#444] transition"
    >
      {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
      {generating ? "生成中…" : "生成周报告"}
    </button>
  );
}
