"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { FileText, Loader2 } from "lucide-react";

// 中文字体方案：用 Canvas 测量文本宽度，jsPDF 用内置 Helvetica（ASCII-safe）
// 中文文本通过 canvas 渲染为图片嵌入

interface Props {
  planName?: string;
  days?: Array<{ day: string; focus: string; scene: string | null; duration: number; intensity: string }>;
  readinessScore?: number;
  readinessLabel?: string;
  acwrAlerts?: Array<{ playerName: string; acwr: number; status: string }>;
  supplementPlayers?: Array<{ name: string; meters: number; position: string }>;
  fitnessTests?: Array<{ playerName: string; testName: string; value: number; unit: string; level: string }>;
  weekLabel?: string;
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number) {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize * 0.4);
}

export function ReportGenerator({
  planName = "训练周报",
  days = [],
  readinessScore,
  readinessLabel,
  acwrAlerts = [],
  supplementPlayers = [],
  fitnessTests = [],
  weekLabel = new Date().toISOString().slice(0, 10),
}: Props) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 100)); // yield to render

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210; // A4 width
    const M = 15;  // margin
    let y = M;

    // ── Header ──
    doc.setFillColor(153, 40, 40); // #992828
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("KENSHIN PRO S&C", M, 10);
    doc.setFontSize(8);
    doc.text("职业体能教练工作台", M, 16);

    y = 28;

    // ── Title ──
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.text(planName, M, y);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`生成日期: ${new Date().toLocaleDateString("zh-CN")}  |  训练周: ${weekLabel}`, M, y + 5);
    y += 14;

    // ── Divider ──
    doc.setDrawColor(220, 220, 220);
    doc.line(M, y, W - M, y);
    y += 6;

    // ── Section 1: Weekly Plan ──
    if (days.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("一、本周训练计划", M, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      // Table header
      const colX = [M, M+20, M+60, M+100, M+125, M+150];
      const headers = ["日期", "训练焦点", "场景", "时长", "强度"];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(M, y, W - M, y);
      y += 3;

      days.forEach(day => {
        if (y > 260) { doc.addPage(); y = M; }
        const sceneLabel = day.scene === null ? "休息日" : day.scene === "gym" ? "力量房" : "外场";
        doc.setTextColor(day.scene === null ? 150 : 60, 60, 60);
        doc.text(day.day, colX[0], y);
        doc.text(day.focus.length > 18 ? day.focus.slice(0,18)+"…" : day.focus, colX[1], y);
        doc.text(sceneLabel, colX[2], y);
        doc.text(day.scene === null ? "—" : `${day.duration}min`, colX[3], y);
        doc.text(day.intensity, colX[4], y);
        y += 4.5;
      });
      y += 4;
    }

    // ── Section 2: Readiness ──
    if (readinessScore !== undefined) {
      if (y > 240) { doc.addPage(); y = M; }
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("二、球员准备度", M, y);
      y += 6;
      doc.setFontSize(10);
      const color = readinessScore >= 70 ? "#22c55e" : readinessScore >= 55 ? "#eab308" : "#992828";
      doc.setTextColor(60, 60, 60);
      doc.text(`准备度评分: ${readinessScore}/100 — ${readinessLabel || "—"}`, M, y);
      y += 8;
    }

    // ── Section 3: ACWR Alerts ──
    if (acwrAlerts.length > 0) {
      if (y > 240) { doc.addPage(); y = M; }
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("三、ACWR 负荷警告", M, y);
      y += 6;
      doc.setFontSize(8);
      acwrAlerts.forEach(a => {
        if (y > 270) { doc.addPage(); y = M; }
        doc.setTextColor(a.status === "danger" ? 153 : 200, 40, 40);
        doc.text(`${a.playerName}: ACWR ${a.acwr.toFixed(2)} — ${a.status === "danger" ? "🚨 危险" : "⚠️ 警戒"}`, M, y);
        y += 4;
      });
      y += 4;
    }

    // ── Section 4: Supplement ──
    if (supplementPlayers.length > 0) {
      if (y > 240) { doc.addPage(); y = M; }
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("四、比赛补负荷", M, y);
      y += 6;
      doc.setFontSize(8);
      supplementPlayers.forEach(p => {
        if (y > 270) { doc.addPage(); y = M; }
        doc.setTextColor(60, 60, 60);
        doc.text(`${p.name} (${p.position}): 需补 ${p.meters}m 跑量`, M, y);
        y += 4;
      });
      y += 4;
    }

    // ── Section 5: Fitness Tests ──
    if (fitnessTests.length > 0) {
      if (y > 230) { doc.addPage(); y = M; }
      doc.setFontSize(11);
      doc.setTextColor(153, 40, 40);
      doc.text("五、体测数据", M, y);
      y += 6;
      doc.setFontSize(8);
      // Group by player
      const playerMap: Record<string, typeof fitnessTests> = {};
      fitnessTests.forEach(t => {
        if (!playerMap[t.playerName]) playerMap[t.playerName] = [];
        playerMap[t.playerName].push(t);
      });
      Object.entries(playerMap).slice(0, 10).forEach(([name, tests]) => {
        if (y > 265) { doc.addPage(); y = M; }
        doc.setTextColor(60, 60, 60);
        const summary = tests.map(t => `${t.testName}: ${t.value}${t.unit}(${t.level})`).join(" | ");
        doc.text(`${name}: ${summary}`, M, y);
        y += 4;
      });
      y += 4;
    }

    // ── Footer ──
    doc.setDrawColor(153, 40, 40);
    doc.line(M, 282, W - M, 282);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("KenshinPro S&C — 职业体能教练工作台 | 本报告由 AI 自动生成，数据来源于日常训练追踪", M, 286);
    doc.text(`© ${new Date().getFullYear()} KenshinPro. All rights reserved.`, M, 290);

    doc.save(`KenshinPro_${planName}_${weekLabel}.pdf`);
    setGenerating(false);
  };

  return (
    <button
      onClick={generatePDF}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 bg-[#992828] hover:bg-[#7a1e1e] disabled:opacity-50 text-white rounded-lg text-sm font-bold transition"
    >
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      {generating ? "生成中…" : "生成 PDF 报告"}
    </button>
  );
}
