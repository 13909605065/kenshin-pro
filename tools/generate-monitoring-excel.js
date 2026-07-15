/**
 * 两个Sheet，竖向日报式，手机滑到今天就填
 */

const XLSX = require("xlsx");

// 7/8 确认: 栾家铭/王宇扬/杨文杰/任一求不在队 | 杨翼璇→后卫
const POS = [
  {
    label: "🧤 门将",
    names: ["张海轩","杨卓燠","王款(U21)"],
  },
  {
    label: "🛡 后卫",
    names: ["王捷(U21)","丁云峰","凌中阳","陈少豪","李金羽","王皓文(U21)","杨翼璇","张俊哲","张天龙"],
  },
  {
    label: "⚙ 中场",
    names: ["何麟立","布格拉汗-斯坎旦尔","巫林峰","张辉","谢锦政","栾昊(U21)","林楷轩(U21)","朱云天(U21)","高云鹏"],
  },
  {
    label: "⚡ 前锋",
    names: ["陈祥煜","艾沙江-库尔班","帕尔曼江-克尤木","阿西江-白山","戚博(U21)"],
  },
];

const DAYS = [
  { d:"7/7",  w:"周二", t:"" },
  { d:"7/8",  w:"周三", t:"⚽ 主 vs 大连可为 16:00" },
  { d:"7/9",  w:"周四", t:"" },
  { d:"7/10", w:"周五", t:"" },
  { d:"7/11", w:"周六", t:"⚽ 客 vs 上海海港B 16:30" },
  { d:"7/12", w:"周日", t:"" },
  { d:"7/13", w:"周一", t:"" },
];

// ═══════════════════════════════
// Sheet 1: 训练负荷（RPE + 时长）
// ═══════════════════════════════

function buildTraining() {
  const R = [];
  R.push(["🌙 训练负荷 — 训练/比赛后填"]);
  R.push(["RPE: 0=休息 2=轻松 5=中等 8=很累 10=极限"]);
  R.push([""]);

  DAYS.forEach(day => {
    R.push([`━━━ ${day.d} ${day.w} ${day.t} ━━━`]);
    R.push([day.t ? "RPE  时长  ← 比赛日必填！" : "RPE  时长"]);

    POS.forEach(pos => {
      R.push([pos.label]);
      pos.names.forEach(name => {
        R.push([name, "", ""]);
      });
    });

    R.push([""]);
  });

  return R;
}

// ═══════════════════════════════
// Sheet 2: 身体状态（睡+疲劳+酸痛）
// ═══════════════════════════════

function buildBody() {
  const R = [];
  R.push(["☀️ 身体状态 — 每天早起填"]);
  R.push(["睡h=小时 睡质/疲劳/酸痛=1-5（1最差 5最好）"]);
  R.push([""]);

  DAYS.forEach(day => {
    R.push([`━━━ ${day.d} ${day.w} ━━━`]);
    R.push(["睡h  睡质  疲劳  酸痛  备注"]);

    POS.forEach(pos => {
      R.push([pos.label]);
      pos.names.forEach(name => {
        R.push([name, "", "", "", "", ""]);
      });
    });

    R.push([""]);
  });

  R.push(["疲劳:1=精力好 3=一般 5=极累 | 酸痛:1=不酸 3=轻微 5=剧痛 | 不适写备注"]);

  return R;
}

// ═══════════════════════════════
// Sheet 3: 说明
// ═══════════════════════════════

function buildGuide() {
  return [
    ["怎么填"],
    [""],
    ["🌙 Sheet1 训练负荷 → 训练/比赛后"],
    ["  填 RPE（0-10）+ 训练时长（分钟）"],
    [""],
    ["☀️ Sheet2 身体状态 → 第二天早起"],
    ["  填 睡h + 睡质 + 疲劳 + 酸痛 + 备注"],
    [""],
    ["RPE 量表"],
    ["  0=休息  2=轻松（散步）  5=中等（对抗）"],
    ["  8=很累（比赛）  10=极限"],
    [""],
    ["⚽ 比赛日必须填RPE！没上场标「替补」"],
    ["🤕 不适在备注栏写"],
  ];
}

// ═══════════════════════════════

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildTraining()), "🌙 训练负荷");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildBody()), "☀️ 身体状态");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildGuide()), "📋 怎么填");
XLSX.writeFile(wb, "/Users/kenshin/Desktop/崇德荣海_每日自填.xlsx");

console.log("✅ 已更新");
