/**
 * 零预算恢复模式 — 无补剂/无按摩师/无冰浴的低成本替代方案
 *
 * 为中国基层足球队（校园/业余/半职业）设计。
 */

// ═══════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════

export interface BudgetAlternative {
  /** 原始专业恢复手段 */
  original: string;
  /** 零成本替代方案 */
  alternative: string;
  /** 如何执行 */
  howTo: string;
  /** 科学依据简述 */
  rationale: string;
  /** 适用时机 */
  timing: string;
}

// ═══════════════════════════════════════════
// 替代方案库
// ═══════════════════════════════════════════

export const ZERO_BUDGET_ALTERNATIVES: BudgetAlternative[] = [
  {
    original: '冷水浸泡 (10-15°C × 10-15min)',
    alternative: '自来水冷敷 + 抬高',
    howTo: '用自来水(约15-20°C)浸湿毛巾敷在大腿/小腿肌群，每5分钟换水保持低温，同时抬高双腿靠墙',
    rationale: '局部降温可减轻炎症反应和DOMS。自来水虽比冰浴温度高，延长至20min可达类似效果。',
    timing: '赛后或高强度课后30min内',
  },
  {
    original: '蛋白粉补剂 (25g乳清蛋白)',
    alternative: '鸡蛋+牛奶+香蕉组合',
    howTo: '赛后30min内吃：2个水煮蛋(12g蛋白)+250mL纯牛奶(8g蛋白)+1根香蕉(快碳+钾)',
    rationale: '全食物蛋白的生物利用率不亚于补剂。鸡蛋PDCAAS=1.0(满分)，牛奶含天然乳清。总蛋白≈20g。',
    timing: '训练后30min窗口',
  },
  {
    original: '肌酸补剂 (5g/天)',
    alternative: '红肉饮食优化',
    howTo: '每周2-3次瘦牛肉/羊肉(150-200g/次)。肉类含天然肌酸：牛肉≈0.5g/100g，烹饪损失约30%。',
    rationale: '天然饮食可提供约0.5-1g肌酸/天，虽低于补剂5g但持续摄入可提升肌肉磷酸肌酸储备。',
    timing: '长期饮食调整',
  },
  {
    original: '按摩师深层组织按摩',
    alternative: '双人互按 + 网球自按',
    howTo: '队友互按：一人俯卧，另一人用手掌根部沿肌纤维方向推压。网球：靠墙压痛点（臀/背/肩），每个痛点保持30-60s。',
    rationale: '机械压力可降低肌筋膜张力、改善局部血流。网球自按对扳机点的效果等同于基础按摩。',
    timing: '训练后或休息日',
  },
  {
    original: '冰浴/冷热交替浴',
    alternative: '冷热交替淋浴',
    howTo: '淋浴：热水2min(舒适温度)→冷水30s(尽量冷的自来水)→重复3-4轮。以冷水结束。',
    rationale: '血管交替收缩-扩张促进代谢废物清除。自来水冷水虽不如冰浴低温，温差刺激仍有效。',
    timing: '赛后24h后',
  },
  {
    original: '专业泡沫轴',
    alternative: 'PVC管 + 旧毛巾包裹',
    howTo: '取直径10-15cm的PVC管(约30cm长)，包上旧毛巾防滑。每肌群来回滚动30-60s，痛点停留。',
    rationale: '泡沫轴的作用机制是机械压力+滚动摩擦。PVC管硬度更高(≈高密度泡沫轴)，包毛巾调节硬度。',
    timing: '每日可用',
  },
  {
    original: '压缩服 (2-4h穿着)',
    alternative: '弹力绷带 + 抬高',
    howTo: '用弹力绷带从远端向近端缠绕(脚→小腿→大腿)，松紧以舒适为度。配合20min抬高(腿靠墙>45°)。',
    rationale: '梯度压力促进静脉回流。弹力绷带提供的外压虽不均匀但可模拟压缩服效果。抬高辅助重力引流。',
    timing: '训练后2-4h',
  },
  {
    original: '运动饮料/电解质补剂',
    alternative: '淡盐水 + 香蕉/橙汁',
    howTo: '500mL白开水 + 1/4茶匙盐(≈1.25g) + 1小勺白糖。搭配香蕉补钾或半个橙子。',
    rationale: '自制电解质饮料：钠≈500mg/L、糖≈3-5%，接近WHO推荐ORS配比。钾从水果获取。',
    timing: '训练中及训练后',
  },
  {
    original: '专业营养师饮食方案',
    alternative: '三板斧饮食法',
    howTo: '①每餐保证一掌大蛋白质(鸡蛋/鸡肉/豆腐)；②两拳大碳水(米饭/面/土豆)；③三色蔬菜各一撮。训练日加一根香蕉。',
    rationale: '手掌法简单易行：蛋白≈掌心大小=15-20g，碳水≈两拳=40-60g。满足运动人群基本营养需求。',
    timing: '每餐',
  },
  {
    original: '红外桑拿/热疗',
    alternative: '热水澡 + 毛巾热敷',
    howTo: '热水澡(40-42°C)15-20min，或用热毛巾敷在酸胀肌群10min，中间换一次保持热度。',
    rationale: '热刺激增加局部血流量和代谢率，促进组织修复。40°C水温15min可提升肌肉温度2-3°C。',
    timing: '训练后或休息日',
  },
];

// ═══════════════════════════════════════════
// 函数
// ═══════════════════════════════════════════

/**
 * 获取所有零预算替代方案
 */
export function getBudgetAlternatives(): BudgetAlternative[] {
  return ZERO_BUDGET_ALTERNATIVES;
}

/**
 * 根据原始恢复方法查找替代方案
 */
export function findAlternative(original: string): BudgetAlternative | undefined {
  return ZERO_BUDGET_ALTERNATIVES.find(a =>
    a.original.includes(original) || original.includes(a.original.slice(0, 10))
  );
}

/**
 * 生成零预算恢复方案文本（供AI prompt或UI使用）
 */
export function buildBudgetRecoveryPlan(methods: string[]): string {
  const lines = ['### 💰 零预算恢复方案'];

  for (const method of methods) {
    const alt = findAlternative(method);
    if (alt) {
      lines.push(`**替代: ${alt.original}** → ${alt.alternative}`);
      lines.push(`  做法: ${alt.howTo}`);
      lines.push(`  时机: ${alt.timing}`);
    }
  }

  lines.push('', '> 以上方案基于运动科学原理，由零成本常见物品替代专业设备。效果略低于专业方法但远优于不恢复。');
  return lines.join('\n');
}

/**
 * 获取AI prompt用的零预算提示文本
 */
export function getZeroBudgetPrompt(): string {
  return `### 零预算恢复模式（重要约束）
用户处于零预算模式（无补剂/无按摩师/无冰浴）。
- 禁止推荐任何补剂（蛋白粉/肌酸/BCAA等）
- 禁止推荐专业恢复设备（冰浴/压缩服/氮气冷疗等）
- 禁止推荐专业按摩服务
- 仅使用自重+日常物品的恢复方法：自来水冷敷、PVC管筋膜放松、双人互按、热水澡、弹力带缠绕、食物替代补剂
- 营养建议提供具体食物名称和克数，不用补剂品牌

参考方案：
${ZERO_BUDGET_ALTERNATIVES.slice(0, 5).map(a => `- ${a.original} → ${a.alternative}: ${a.howTo}`).join('\n')}`;
}
