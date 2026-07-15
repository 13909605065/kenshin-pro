/**
 * 填充 7/7（MD-1 M2）球员数据到所有监控 Excel
 *
 * 数据来源：kenshin 口头收集的全员身心状态 + RPE
 * 更新文件：
 *   1. 02_每日监控.xlsx — 新增 7/7 行（晨间健康 + RPE）
 *   2. 03_训练课记录.xlsx — 球员明细新增 7/7 行
 *   3. 崇德荣海_教练工作台.xlsx — 填充 7/7 列
 */

const XLSX = require("xlsx");
const path = require("path");

const DATA_DIR = "/Users/kenshin/Desktop/山西/数据收集";

// ══════════════════════════════════════
// 7/7 球员数据（kenshin 口头收集）
// ══════════════════════════════════════

const PLAYERS_0707 = [
  // 门将组
  { name: "张海轩",   pos: "门将", rpe: 5, sleep: 3, fatigue: 3, soreness: 2, note: "无不适，状态正常" },
  { name: "杨卓燠",   pos: "门将", rpe: 4, sleep: 3, fatigue: 4, soreness: 3, note: "无不适，状态正常" },
  { name: "王款",     pos: "门将(U21)", rpe: 2, sleep: 3, fatigue: 4, soreness: 3, note: "无不适，状态正常" },
  // 后卫组
  { name: "张俊哲",   pos: "后卫", rpe: 6, sleep: 3, fatigue: 3, soreness: 3, note: "仅有轻微肌肉酸胀" },
  { name: "张天龙",   pos: "后卫", rpe: 5, sleep: 3, fatigue: 3, soreness: 3, note: "无不适，状态正常" },
  { name: "凌中阳",   pos: "后卫", rpe: 6, sleep: 3, fatigue: 3, soreness: 3, note: "肌肉存在轻微酸痛" },
  { name: "陈少豪",   pos: "后卫", rpe: 3, sleep: 3, fatigue: 2, soreness: 2, note: "无不适，状态正常" },
  { name: "李金羽",   pos: "后卫", rpe: 3, sleep: 3, fatigue: 3, soreness: 5, note: "腰部存在疼痛感 ⚠️" },
  { name: "王捷",     pos: "后卫(U21)", rpe: 6, sleep: 3, fatigue: 4, soreness: 3, note: "左膝盖存在疼痛感 ⚠️" },
  { name: "王皓文",   pos: "后卫(U21)", rpe: 6, sleep: 4, fatigue: 4, soreness: 4, note: "小腿略有酸痛" },
  { name: "丁云峰",   pos: "后卫", rpe: 3, sleep: 4, fatigue: 2, soreness: 2, note: "无不适，状态正常" },
  // 中场组
  { name: "何麟立",   pos: "中场", rpe: 4, sleep: 4, fatigue: 2, soreness: 2, note: "无不适，状态正常" },
  { name: "布格拉汗-斯坎旦尔", pos: "中场", rpe: null, sleep: null, fatigue: 3, soreness: null, note: "RPE/睡眠/酸痛未填写" },
  { name: "巫林峰",   pos: "中场", rpe: 6, sleep: 2, fatigue: 3, soreness: 3, note: "无不适，状态正常 ⚠️睡眠差" },
  { name: "张辉",     pos: "中场", rpe: 6, sleep: 4, fatigue: 3, soreness: 3, note: "无不适，状态正常" },
  { name: "谢锦政",   pos: "中场", rpe: 3, sleep: 3, fatigue: 3, soreness: 3, note: "无不适，状态正常" },
  { name: "栾昊",     pos: "中场(U21)", rpe: 2, sleep: 4, fatigue: 2, soreness: 1, note: "无不适，状态正常" },
  { name: "杨翼璇",   pos: "中场", rpe: 3, sleep: 3, fatigue: 2, soreness: 1, note: "无不适，状态正常" },
  { name: "朱云天",   pos: "中场(U21)", rpe: null, sleep: 4, fatigue: 2, soreness: 3, note: "RPE未填写" },
  { name: "林楷轩",   pos: "中场(U21)", rpe: null, sleep: 4, fatigue: 2, soreness: 3, note: "RPE未填写" },
  // 前锋组
  { name: "陈祥煜",   pos: "前锋", rpe: 2, sleep: 4, fatigue: 4, soreness: 4, note: "无伤病、无不适" },
  { name: "艾沙江-库尔班", pos: "前锋", rpe: 6, sleep: 3, fatigue: 3, soreness: 1, note: "无不适，状态正常" },
  { name: "帕尔曼江-克尤木", pos: "前锋", rpe: 6, sleep: 3, fatigue: 3, soreness: 3, note: "无不适，状态正常" },
  { name: "阿西江-白山", pos: "前锋", rpe: 3, sleep: 4, fatigue: 4, soreness: 3, note: "无不适，状态正常" },
  { name: "戚博",     pos: "前锋(U21)", rpe: 2, sleep: 4, fatigue: 2, soreness: 1, note: "无不适，状态正常" },
];

// 未报告球员（29人名单 - 25人已报 = 4人未报）
const MISSING = ["栾家铭(U21)", "杨文杰", "王宇扬", "高云鹏"];

// ═══════════════════════════
// 辅助函数
// ═══════════════════════════

function findPlayer(name) {
  // 精确匹配优先
  let p = PLAYERS_0707.find(p => p.name === name);
  if (p) return p;
  // 工作台带(U21)后缀 vs 数据不带 → 模糊匹配
  const clean = name.replace(/\(U21\)/, "").trim();
  p = PLAYERS_0707.find(p => p.name === clean);
  if (p) return p;
  // 数据带(U21) vs 工作台不带
  p = PLAYERS_0707.find(p => p.name.replace(/\(U21\)/, "").trim() === clean);
  return p || null;
}

// ═══════════════════════════════════
// 1. 更新 02_每日监控.xlsx
// ═══════════════════════════════════

function updateDailyMonitoring() {
  const filePath = path.join(DATA_DIR, "02_每日监控.xlsx");
  const wb = XLSX.readFile(filePath);
  const ws = XLSX.utils.sheet_to_json(wb.Sheets["每日监控"], { header: 1, defval: "" });

  // 检查 7/7 数据是否已存在
  const has0707 = ws.some(row => row[0] === "2026-07-07");
  if (has0707) {
    console.log("⚠️ 02_每日监控: 7/7 数据已存在，跳过（如需覆盖请先删除旧数据）");
    return;
  }

  // 找到插入位置（在 7/6 数据之后，7/5 数据之前）
  // ws 是按日期倒序排列的（7/6 在前，7/5 在后）
  // 新数据 7/7 应该插在最前面（最新日期）
  let insertAt = 5; // 默认从第5行（表头之后）开始
  for (let i = 5; i < ws.length; i++) {
    if (ws[i][0] && ws[i][0] !== "2026-07-07" && ws[i][0] < "2026-07-07") {
      insertAt = i;
      break;
    }
    if (i === ws.length - 1) insertAt = ws.length;
  }

  // 构建新行
  const newRows = PLAYERS_0707.map(p => [
    "2026-07-07",           // 日期
    p.name,                 // 球员
    p.pos,                  // 位置
    p.sleep ?? "",          // 睡眠(1-5)
    p.fatigue,              // 疲劳(1-5)
    p.soreness ?? "",       // 酸痛(1-5)
    "",                     // 压力(1-5) - 未采集
    "",                     // 情绪(1-5) - 未采集
    "",                     // 健康总分
    "训练",                 // 训练/比赛 — MD-1 训练日
    p.rpe ?? "",            // RPE(0-10)
    "",                     // 时长(min) — 待补
    "",                     // sRPE负荷 — 待补
    "",                     // CMJ今日(cm)
    "",                     // CMJ变化%
    "",                     // 恢复干预
    "MD-1 M2 | " + p.note,  // 备注
  ]);

  // 插入新行
  ws.splice(insertAt, 0, ...newRows);

  // 写回
  const newWs = XLSX.utils.aoa_to_sheet(ws);
  wb.Sheets["每日监控"] = newWs;
  XLSX.writeFile(wb, filePath);
  console.log(`✅ 02_每日监控: 新增 ${newRows.length} 行 7/7 数据（插入位置: 行${insertAt + 1}）`);
}

// ═══════════════════════════════════
// 2. 更新 03_训练课记录.xlsx
// ═══════════════════════════════════

function updateTrainingLog() {
  const filePath = path.join(DATA_DIR, "03_训练课记录.xlsx");
  const wb = XLSX.readFile(filePath);

  // --- 2a. 训练课记录（主表）---
  const mainWs = XLSX.utils.sheet_to_json(wb.Sheets["训练课记录"], { header: 1, defval: "" });

  const has0707main = mainWs.some(row => row[0] === "2026-07-07");
  if (!has0707main) {
    // 添加一行 MD-1 训练课摘要
    const mainRow = [
      "2026-07-07",           // 日期
      "MD-1 赛前训练",        // 训练主题
      "比赛",                 // 训练阶段
      "整体训练",             // 练习名称
      "技战术",               // 分类
      "计划",                 // 计划/临时
      "",                     // 时长(min) — 待补
      "",                     // 教练评分
      calcMeanRPE().toFixed(1), // 球员RPE均值
      PLAYERS_0707.filter(p => p.rpe !== null).length, // 参与人数(有RPE的)
      "半",                   // 场地区域
      "手动记录",             // KenshinPro方案参考
      "完全",                 // 执行度
      "",                     // 调整理由
      "MD-1 M2 赛前一天 | 25人报告，4人未报(" + MISSING.join("/") + ") | 主教练带领 | 时长待补", // 备注
    ];
    mainWs.splice(4, 0, mainRow); // 插入在表头后
    const newMainWs = XLSX.utils.aoa_to_sheet(mainWs);
    wb.Sheets["训练课记录"] = newMainWs;
    console.log("✅ 03_训练课记录(主表): 新增 7/7 训练课行");
  } else {
    console.log("⚠️ 03_训练课记录(主表): 7/7 已存在，跳过");
  }

  // --- 2b. 球员明细 ---
  const detailWs = XLSX.utils.sheet_to_json(wb.Sheets["球员明细"], { header: 1, defval: "" });

  const has0707detail = detailWs.some(row => row[0] === "2026-07-07");
  if (!has0707detail) {
    const detailRows = PLAYERS_0707.map(p => [
      "2026-07-07",           // 日期
      p.name,                 // 球员
      p.pos,                  // 位置
      p.rpe !== null ? "全" : "部分", // 参与
      p.rpe ?? "",            // 球员RPE
      "",                     // 教练技术评分
      "",                     // 教练体能评分
      "MD-1 | " + p.note,     // 备注
    ]);
    // 插入在 7/6 数据之后
    let insertAt = 3;
    for (let i = 3; i < detailWs.length; i++) {
      if (detailWs[i][0] && detailWs[i][0] !== "2026-07-07" && detailWs[i][0] < "2026-07-07") {
        insertAt = i;
        break;
      }
      if (i === detailWs.length - 1) insertAt = detailWs.length;
    }
    detailWs.splice(insertAt, 0, ...detailRows);
    const newDetailWs = XLSX.utils.aoa_to_sheet(detailWs);
    wb.Sheets["球员明细"] = newDetailWs;
    console.log(`✅ 03_训练课记录(球员明细): 新增 ${detailRows.length} 行 7/7 球员数据`);
  } else {
    console.log("⚠️ 03_训练课记录(球员明细): 7/7 已存在，跳过");
  }

  XLSX.writeFile(wb, filePath);
}

// ═══════════════════════════════════
// 3. 更新 崇德荣海_教练工作台.xlsx
// ═══════════════════════════════════

function updateCoachWorkbench() {
  const filePath = path.join(DATA_DIR, "崇德荣海_教练工作台.xlsx");
  const wb = XLSX.readFile(filePath);
  const ws = XLSX.utils.sheet_to_json(wb.Sheets["工作台"], { header: 1, defval: "" });

  // 球员在工作台中的行映射（从原始行5-33）
  // 需要根据名字匹配
  const sRPE_START = 5;   // sRPE区域球员起始行
  const sRPE_END = 33;    // sRPE区域球员结束行
  const WELLNESS_START = 38; // 晨间监测球员起始行
  const WELLNESS_END = 66;   // 晨间监测球员结束行

  let sRPEUpdated = 0, wellnessUpdated = 0;

  // 填充 sRPE 区域（C列 = index 2 是 7/7 sRPE）
  for (let r = sRPE_START; r <= sRPE_END; r++) {
    const row = ws[r];
    if (!row || !row[0]) continue;
    const name = row[0];
    const p = findPlayer(name);
    if (p && p.rpe !== null) {
      // sRPE = RPE × 时长，时长待补，先填 RPE 值并标注
      row[2] = p.rpe; // 7/7 sRPE 列填 RPE（时长待补则暂用RPE）
      sRPEUpdated++;
    } else if (p && p.rpe === null) {
      row[2] = "—"; // 未填
      sRPEUpdated++;
    }
    // 如果球员不在25人报告中，留空
  }

  // 填充晨间监测区域
  for (let r = WELLNESS_START; r <= WELLNESS_END; r++) {
    const row = ws[r];
    if (!row || !row[0]) continue;
    const name = row[0];
    const p = findPlayer(name);
    if (p) {
      row[2] = "";               // 7/7睡h — 未采集
      row[3] = p.sleep ?? "";    // 7/7睡质
      row[4] = p.fatigue;        // 7/7疲劳
      row[5] = p.soreness ?? ""; // 7/7酸痛
      wellnessUpdated++;
    }
  }

  // 写回
  const newWs = XLSX.utils.aoa_to_sheet(ws);
  wb.Sheets["工作台"] = newWs;
  XLSX.writeFile(wb, filePath);
  console.log(`✅ 教练工作台: sRPE更新 ${sRPEUpdated} 人 | 晨间更新 ${wellnessUpdated} 人`);
}

// ═══════════════════════════════════
// 统计函数
// ═══════════════════════════════════

function calcMeanRPE() {
  const rpes = PLAYERS_0707.filter(p => p.rpe !== null).map(p => p.rpe);
  return rpes.reduce((a, b) => a + b, 0) / rpes.length;
}

function countHigh(val, threshold) {
  return PLAYERS_0707.filter(p => p[val] !== null && p[val] >= threshold).length;
}

function flagPlayers() {
  const flags = [];
  PLAYERS_0707.forEach(p => {
    const issues = [];
    if (p.soreness >= 4) issues.push(`酸痛${p.soreness}`);
    if (p.fatigue >= 4) issues.push(`疲劳${p.fatigue}`);
    if (p.sleep !== null && p.sleep <= 2) issues.push(`睡眠差(${p.sleep})`);
    if (p.rpe !== null && p.rpe >= 7) issues.push(`高RPE(${p.rpe})`);
    if (p.note && (p.note.includes("疼痛") || p.note.includes("⚠️"))) issues.push(p.note.replace(" ⚠️", ""));
    if (issues.length > 0) {
      flags.push({ name: p.name, pos: p.pos, issues });
    }
  });
  return flags;
}

// ═══════════════════════════════════
// 执行
// ═══════════════════════════════════

console.log("═══════════════════════════════════");
console.log("  7/7（MD-1 M2）数据填充脚本");
console.log("═══════════════════════════════════\n");

updateDailyMonitoring();
updateTrainingLog();
updateCoachWorkbench();

// ═══════════════════════════════════
// 数据分析报告
// ═══════════════════════════════════

console.log("\n═══════════════════════════════════");
console.log("  📊 7/7 数据分析报告");
console.log("═══════════════════════════════════\n");

// 基本信息
const withRPE = PLAYERS_0707.filter(p => p.rpe !== null);
const meanRPE = calcMeanRPE();
console.log(`👥 报告人数: ${PLAYERS_0707.length}/29（未报: ${MISSING.join("、")}）`);
console.log(`🏃 平均RPE: ${meanRPE.toFixed(1)}（${withRPE.length}人有RPE，${PLAYERS_0707.length - withRPE.length}人未填）`);
console.log(`😴 平均睡眠质量: ${(PLAYERS_0707.filter(p => p.sleep !== null).reduce((a, p) => a + p.sleep, 0) / PLAYERS_0707.filter(p => p.sleep !== null).length).toFixed(1)}/5`);
console.log(`💪 平均疲劳: ${(PLAYERS_0707.reduce((a, p) => a + p.fatigue, 0) / PLAYERS_0707.length).toFixed(1)}/5`);
console.log(`🦵 平均酸痛: ${(PLAYERS_0707.filter(p => p.soreness !== null).reduce((a, p) => a + p.soreness, 0) / PLAYERS_0707.filter(p => p.soreness !== null).length).toFixed(1)}/5`);

// RPE分布
const rpeDist = { low: 0, mid: 0, high: 0 };
withRPE.forEach(p => {
  if (p.rpe <= 3) rpeDist.low++;
  else if (p.rpe <= 6) rpeDist.mid++;
  else rpeDist.high++;
});
console.log(`\n📈 RPE分布: 低(0-3)=${rpeDist.low}人 | 中(4-6)=${rpeDist.mid}人 | 高(7-10)=${rpeDist.high}人`);

// 按位置分组
const groups = { "门将": [], "后卫": [], "中场": [], "前锋": [] };
PLAYERS_0707.forEach(p => {
  const g = p.pos.replace(/\(U21\)/, "").trim();
  if (groups[g]) groups[g].push(p);
  else {
    // 模糊匹配
    for (const key of Object.keys(groups)) {
      if (g.includes(key) || key.includes(g)) {
        groups[key].push(p);
        break;
      }
    }
  }
});

console.log("\n── 分组统计 ──");
Object.entries(groups).forEach(([group, players]) => {
  if (players.length === 0) return;
  const rpes = players.filter(p => p.rpe !== null).map(p => p.rpe);
  const avgRPE = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : "—";
  const avgSleep = (players.filter(p => p.sleep !== null).reduce((a, p) => a + p.sleep, 0) / players.filter(p => p.sleep !== null).length).toFixed(1);
  const avgFatigue = (players.reduce((a, p) => a + p.fatigue, 0) / players.length).toFixed(1);
  const avgSoreness = (players.filter(p => p.soreness !== null).reduce((a, p) => a + p.soreness, 0) / players.filter(p => p.soreness !== null).length).toFixed(1);
  console.log(`  ${group}(${players.length}人): RPE=${avgRPE} | 睡质=${avgSleep} | 疲劳=${avgFatigue} | 酸痛=${avgSoreness}`);
});

// ⚠️ 红旗球员
const flags = flagPlayers();
console.log("\n── 🚩 需关注球员 ──");
if (flags.length === 0) {
  console.log("  ✅ 全队状态良好，无红旗");
} else {
  flags.forEach(f => {
    console.log(`  🔴 ${f.name}(${f.pos}): ${f.issues.join(" | ")}`);
  });
}

// 明天比赛提醒
console.log("\n── ⚽ 明日比赛 ──");
console.log("  7/8 16:00 主场 vs 大连可为（第12轮补赛）");
console.log("  MD-1 → 比赛日：今晚保证睡眠，赛前2.5h集合");
console.log(`  红旗球员需医疗评估：${flags.filter(f => f.issues.some(i => i.includes("疼痛"))).map(f => f.name).join("、") || "无疼痛报告"}`);

console.log("\n✅ 全部更新完成！");
