/**
 * kenshinpro.cn 浏览器控制台脚本
 * 打开 https://kenshinpro.cn → F12 → Console → 粘贴全部 → 回车
 * 将 7/7 MD-1 训练数据写入 localStorage
 */

(function() {
  'use strict';

  // ═══════════════════════════════════
  // 7/7 MD-1 训练数据
  // ═══════════════════════════════════
  const DATE = "2026-07-07";
  const DURATION = 60; // min
  const TRAIN_TYPE = "pitch"; // pitch | gym | recovery
  const TIME_SLOT = "16:30-17:30";
  const NOTE = "MD-1 M2 赛前训练 | 动态拉伸6min→抢圈5min×2→5m冲刺×3→战术讲解14min→10v10 50m×50m 8min→角球战术17min | 主教练带领";

  // 球员 RPE 数据
  const PLAYERS = [
    { name: "张海轩", rpe: 5, pos: "门将" },
    { name: "杨卓燠", rpe: 4, pos: "门将" },
    { name: "王款", rpe: 2, pos: "门将" },
    { name: "张俊哲", rpe: 6, pos: "后卫" },
    { name: "张天龙", rpe: 5, pos: "后卫" },
    { name: "凌中阳", rpe: 6, pos: "后卫" },
    { name: "陈少豪", rpe: 3, pos: "后卫" },
    { name: "李金羽", rpe: 3, pos: "后卫" },
    { name: "王捷", rpe: 6, pos: "后卫" },
    { name: "王皓文", rpe: 6, pos: "后卫" },
    { name: "丁云峰", rpe: 3, pos: "后卫" },
    { name: "何麟立", rpe: 4, pos: "中场" },
    { name: "巫林峰", rpe: 6, pos: "中场" },
    { name: "张辉", rpe: 6, pos: "中场" },
    { name: "谢锦政", rpe: 3, pos: "中场" },
    { name: "栾昊", rpe: 2, pos: "中场" },
    { name: "杨翼璇", rpe: 3, pos: "中场" },
    { name: "陈祥煜", rpe: 2, pos: "前锋" },
    { name: "艾沙江-库尔班", rpe: 6, pos: "前锋" },
    { name: "帕尔曼江-克尤木", rpe: 6, pos: "前锋" },
    { name: "阿西江-白山", rpe: 3, pos: "前锋" },
    { name: "戚博", rpe: 2, pos: "前锋" },
  ];

  // ── 辅助 ──
  function getActiveTeamId() {
    return localStorage.getItem("kenshin_active_team_id") || "";
  }
  function scopedKey(base) {
    const tid = getActiveTeamId();
    // Match the website's teamKey function
    return tid ? base + "_" + tid : base + "_server_";
  }

  const tid = getActiveTeamId();
  if (!tid) {
    console.error("❌ 未找到活动球队！请先在网站中创建/选择球队。");
    return;
  }
  console.log("🏟 活动球队 ID:", tid);

  // ═══════════════════════════════════
  // 1. 写入 kenshin_daily_training_log
  // ═══════════════════════════════════
  const LOG_KEY = scopedKey("kenshin_daily_training_log");
  const TRIMP_MULTIPLIER = 2.5; // pitch type
  const perPlayerTRIMP = Math.round((DURATION * TRIMP_MULTIPLIER) / PLAYERS.length);

  const newEntry = {
    date: DATE,
    trainType: TRAIN_TYPE,
    timeSlot: TIME_SLOT,
    duration: DURATION,
    weather: "",
    savedAt: new Date().toISOString(),
    players: PLAYERS.map(p => ({ name: p.name, trimp: perPlayerTRIMP })),
    slot: Date.now().toString(),
    note: NOTE,
  };

  let logs = [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    logs = raw ? JSON.parse(raw) : [];
  } catch (e) { logs = []; }

  // 检查是否已有 7/7 记录，有则替换
  const existingIdx = logs.findIndex(l => l.date === DATE);
  if (existingIdx >= 0) {
    logs[existingIdx] = newEntry;
    console.log("⚠️ 7/7 记录已存在，已替换");
  } else {
    logs.unshift(newEntry);
    console.log("✅ 新增 7/7 训练记录");
  }

  // Keep max 200 entries
  localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 200)));

  // ═══════════════════════════════════
  // 2. 写入 kenshin_load_data（每日快照+ACWR用）
  // ═══════════════════════════════════
  const LOAD_KEY = scopedKey("kenshin_load_data");
  let loadData = {};
  try {
    const raw = localStorage.getItem(LOAD_KEY);
    loadData = raw ? JSON.parse(raw) : {};
  } catch (e) { loadData = {}; }

  PLAYERS.forEach(p => {
    if (!loadData[p.name]) loadData[p.name] = [];
    // 检查是否已有 7/7 条目
    const existing = loadData[p.name].findIndex(e => e.date === DATE);
    const entry = { date: DATE, sRPE: p.rpe, duration: DURATION };
    if (existing >= 0) {
      loadData[p.name][existing] = entry;
    } else {
      loadData[p.name].push(entry);
    }
    // 保持按日期降序，最多35天
    loadData[p.name].sort((a, b) => b.date.localeCompare(a.date));
    if (loadData[p.name].length > 35) {
      loadData[p.name] = loadData[p.name].slice(0, 35);
    }
  });

  localStorage.setItem(LOAD_KEY, JSON.stringify(loadData));

  // ═══════════════════════════════════
  // 3. 触发更新事件
  // ═══════════════════════════════════
  window.dispatchEvent(new CustomEvent('training-log-updated'));
  // 如果 load 页有监听 storage 事件
  window.dispatchEvent(new StorageEvent('storage', {
    key: LOAD_KEY,
    newValue: JSON.stringify(loadData),
  }));

  // ═══════════════════════════════════
  // 4. 输出结果
  // ═══════════════════════════════════
  const totalRPE = PLAYERS.reduce((s, p) => s + p.rpe, 0);
  const avgRPE = (totalRPE / PLAYERS.length).toFixed(1);

  console.log("\n════════════════════════");
  console.log("  ✅ 7/7 数据已写入 kenshinpro.cn");
  console.log("════════════════════════");
  console.log("📅 日期:", DATE);
  console.log("⏱ 时长:", DURATION + "min");
  console.log("👥 球员:", PLAYERS.length + "人");
  console.log("📏 均RPE:", avgRPE);
  console.log("📊 全队sRPE:", totalRPE * DURATION);
  console.log("\n🔍 验证: 打开「负荷管理」页面 → 选择 7/7 → 查看每日快照");
  console.log("🔍 验证: 打开「教练工作台」→ 查看训练日志面板");
  console.log("\n💡 刷新页面即可看到数据。");

})();
