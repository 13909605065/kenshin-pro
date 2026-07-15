/**
 * 补充 7/7 训练时长 + sRPE + 训练课明细
 * 训练内容：动态拉伸→抢圈→冲刺→战术讲解→10v10→角球
 * 总时长：60min（16:30-17:30）
 */

const XLSX = require("xlsx");
const path = require("path");

const DATA_DIR = "/Users/kenshin/Desktop/山西/数据收集";
const DURATION = 60; // 总训练时长 min

// 训练课活动明细
const ACTIVITIES = [
  { name: "动态拉伸", category: "热身", duration: 6, intensity: 1, area: "小", note: "RAMP第二阶段，动态激活" },
  { name: "抢圈 第一组", category: "技战术", duration: 5, intensity: 2, area: "小", note: "5min，中路抢圈" },
  { name: "抢圈 第二组", category: "技战术", duration: 5, intensity: 2, area: "小", note: "5min，休息30s后继续" },
  { name: "5m冲刺×3", category: "体能", duration: 5, intensity: 5, area: "1/4", note: "三次5m短距离冲刺，含恢复" },
  { name: "战术演练讲解", category: "技战术", duration: 14, intensity: 1, area: "半", note: "主教练战术布置+走位演练" },
  { name: "10v10 比赛", category: "对抗", duration: 8, intensity: 5, area: "半", note: "50m×50m场地，8min实战" },
  { name: "角球战术演练", category: "技战术", duration: 17, intensity: 2, area: "半", note: "进攻+防守角球套路演练" },
];
// 验证总时长: 6+5+5+5+14+8+17 = 60 ✓

// 7/7 球员RPE数据（从原始数据）
const PLAYERS_RPE = {
  "张海轩": 5, "杨卓燠": 4, "王款": 2,
  "张俊哲": 6, "张天龙": 5, "凌中阳": 6, "陈少豪": 3, "李金羽": 3,
  "王捷": 6, "王皓文": 6, "丁云峰": 3,
  "何麟立": 4, "布格拉汗-斯坎旦尔": null, "巫林峰": 6, "张辉": 6,
  "谢锦政": 3, "栾昊": 2, "杨翼璇": 3, "朱云天": null, "林楷轩": null,
  "陈祥煜": 2, "艾沙江-库尔班": 6, "帕尔曼江-克尤木": 6, "阿西江-白山": 3, "戚博": 2,
};

const POS_MAP = {
  "张海轩": "门将", "杨卓燠": "门将", "王款": "门将(U21)",
  "张俊哲": "后卫", "张天龙": "后卫", "凌中阳": "后卫", "陈少豪": "后卫", "李金羽": "后卫",
  "王捷": "后卫(U21)", "王皓文": "后卫(U21)", "丁云峰": "后卫",
  "何麟立": "中场", "布格拉汗-斯坎旦尔": "中场", "巫林峰": "中场", "张辉": "中场",
  "谢锦政": "中场", "栾昊": "中场(U21)", "杨翼璇": "中场", "朱云天": "中场(U21)", "林楷轩": "中场(U21)",
  "陈祥煜": "前锋", "艾沙江-库尔班": "前锋", "帕尔曼江-克尤木": "前锋", "阿西江-白山": "前锋", "戚博": "前锋(U21)",
};

function findPlayer(name) {
  const clean = name.replace(/\(U21\)/, "").trim();
  if (PLAYERS_RPE[name]) return name;
  if (PLAYERS_RPE[clean]) return clean;
  for (const key of Object.keys(PLAYERS_RPE)) {
    if (key.replace(/\(U21\)/, "").trim() === clean) return key;
  }
  return null;
}

// ═══════════════════════════════════
// 1. 更新 02_每日监控 — 补时长+sRPE
// ═══════════════════════════════════

function updateDailyMonitoring() {
  const fp = path.join(DATA_DIR, "02_每日监控.xlsx");
  const wb = XLSX.readFile(fp);
  const ws = XLSX.utils.sheet_to_json(wb.Sheets["每日监控"], { header: 1, defval: "" });

  let updated = 0;
  for (let i = 0; i < ws.length; i++) {
    const row = ws[i];
    if (row[0] !== "2026-07-07") continue;
    const name = row[1];
    const pkey = findPlayer(name);
    if (!pkey) continue;

    row[11] = DURATION; // 时长(min)

    const rpe = PLAYERS_RPE[pkey];
    if (rpe !== null) {
      row[12] = rpe * DURATION; // sRPE负荷
    }
    updated++;
  }

  console.log(`02_每日监控: 更新 ${updated} 行（时长${DURATION}min + sRPE）`);

  const newWs = XLSX.utils.aoa_to_sheet(ws);
  wb.Sheets["每日监控"] = newWs;
  XLSX.writeFile(wb, fp);
}

// ═══════════════════════════════════
// 2. 更新 03_训练课记录 — 替换为明细
// ═══════════════════════════════════

function updateTrainingLog() {
  const fp = path.join(DATA_DIR, "03_训练课记录.xlsx");
  const wb = XLSX.readFile(fp);

  // --- 2a. 主表：删除旧7/7行，插入活动明细 ---
  const mainWs = XLSX.utils.sheet_to_json(wb.Sheets["训练课记录"], { header: 1, defval: "" });

  // 删除旧7/7行
  const filtered = mainWs.filter(r => r[0] !== "2026-07-07");
  // 找到插入位置（7/6数据之后）
  let insertAt = 4; // 表头之后
  for (let i = 4; i < filtered.length; i++) {
    if (filtered[i][0] && filtered[i][0] < "2026-07-07") {
      insertAt = i;
      break;
    }
    if (i === filtered.length - 1) insertAt = filtered.length;
  }

  const meanRPE = (Object.values(PLAYERS_RPE).filter(v => v !== null).reduce((a, b) => a + b, 0) / Object.values(PLAYERS_RPE).filter(v => v !== null).length).toFixed(1);
  const playerCount = Object.values(PLAYERS_RPE).filter(v => v !== null).length;

  const activityRows = ACTIVITIES.map(a => [
    "2026-07-07",           // 日期
    "MD-1 赛前训练",        // 训练主题
    "比赛",                 // 训练阶段
    a.name,                 // 练习名称
    a.category,             // 分类
    "计划",                 // 计划/临时
    a.duration,             // 时长(min)
    a.intensity,            // 教练评分(1-5)
    meanRPE,                // 球员RPE均值
    playerCount,            // 参与人数
    a.area,                 // 场地区域
    "手动记录",             // KenshinPro方案参考
    "完全",                 // 执行度
    "",                     // 调整理由
    a.note,                 // 备注
  ]);

  filtered.splice(insertAt, 0, ...activityRows);
  const newMainWs = XLSX.utils.aoa_to_sheet(filtered);
  wb.Sheets["训练课记录"] = newMainWs;
  console.log(`03_训练课记录(主表): 替换为 ${activityRows.length} 行活动明细`);

  XLSX.writeFile(wb, fp);
}

// ═══════════════════════════════════
// 3. 更新教练工作台 — sRPE列
// ═══════════════════════════════════

function updateWorkbench() {
  const fp = path.join(DATA_DIR, "崇德荣海_教练工作台.xlsx");
  const wb = XLSX.readFile(fp);
  const ws = XLSX.utils.sheet_to_json(wb.Sheets["工作台"], { header: 1, defval: "" });

  let updated = 0;
  for (let r = 5; r <= 33; r++) {
    const row = ws[r];
    if (!row || !row[0]) continue;
    const pkey = findPlayer(row[0]);
    if (!pkey) continue;
    const rpe = PLAYERS_RPE[pkey];
    if (rpe !== null) {
      row[2] = rpe * DURATION; // sRPE
      updated++;
    }
  }

  console.log(`教练工作台: sRPE更新 ${updated} 人（RPE×${DURATION}min）`);

  const newWs = XLSX.utils.aoa_to_sheet(ws);
  wb.Sheets["工作台"] = newWs;
  XLSX.writeFile(wb, fp);
}

// ═══════════════════════════════════
// 统计
// ═══════════════════════════════════

function printSummary() {
  const rpes = Object.values(PLAYERS_RPE).filter(v => v !== null);
  const meanRPE = (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1);
  const meanSRPE = (rpes.reduce((a, b) => a + b * DURATION, 0) / rpes.length).toFixed(0);
  const totalSRPE = rpes.reduce((a, b) => a + b * DURATION, 0);

  console.log("\n═══════════════════════════════════");
  console.log("  📊 7/7 MD-1 训练课摘要");
  console.log("═══════════════════════════════════");
  console.log(`⏱ 总时长: ${DURATION} min（16:30-17:30）`);
  console.log(`📐 活动: 动态拉伸→抢圈×2→5m冲刺×3→战术讲解→10v10(8min)→角球`);
  console.log(`👥 参与: ${rpes.length}人（${Object.values(PLAYERS_RPE).filter(v => v === null).length}人未报RPE）`);
  console.log(`📏 均RPE: ${meanRPE}`);
  console.log(`📊 均sRPE: ${meanSRPE}（RPE×${DURATION}min）`);
  console.log(`📊 全队总sRPE: ${totalSRPE}`);

  // 按强度分
  const low = rpes.filter(v => v <= 3).length;
  const mid = rpes.filter(v => v >= 4 && v <= 6).length;
  const high = rpes.filter(v => v >= 7).length;
  console.log(`📈 RPE: 低${low}人 中${mid}人 高${high}人`);

  // sRPE分布
  console.log(`\n── 分组 sRPE ──`);
  const groups = { "门将": [], "后卫": [], "中场": [], "前锋": [] };
  Object.entries(PLAYERS_RPE).forEach(([name, rpe]) => {
    const pos = POS_MAP[name] || "";
    for (const g of Object.keys(groups)) {
      if (pos.includes(g)) { groups[g].push(rpe); break; }
    }
  });
  Object.entries(groups).forEach(([g, vals]) => {
    const valid = vals.filter(v => v !== null);
    if (valid.length === 0) return;
    const avgRPE = (valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(1);
    const avgSRPE = (valid.reduce((a,b)=>a+b*DURATION,0)/valid.length).toFixed(0);
    console.log(`  ${g}(${valid.length}人): 均RPE=${avgRPE} | 均sRPE=${avgSRPE}`);
  });
}

// ═══════════════════════════════════

console.log("═══════════════════════════════════");
console.log("  补充 7/7 时长 + sRPE + 训练明细");
console.log("═══════════════════════════════════\n");

updateDailyMonitoring();
updateTrainingLog();
updateWorkbench();
printSummary();

console.log("\n✅ 全部更新完成！");
