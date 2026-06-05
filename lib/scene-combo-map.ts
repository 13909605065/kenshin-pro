/**
 * 场景映射表 — 确定性查找引擎
 *
 * scene × goal × phase × position → 最优 combo_id
 * 这是系统的"唯一真理源"——AI 选型错误时，此表自动覆盖。
 *
 * 数据源: NSCA-CSCS第4版 + Routledge Handbook Ch.5 + Soccer Anatomy
 *         500个战术体能训练 + 足球体能训练(刘丹)
 */

import type { SeasonPhase, Position } from './types';

export interface ComboTarget {
  comboId: string | null;
  confidence: number; // 0-1, how well this combo matches
  bookSource: string;
  fallbackComboId?: string; // if primary not found in library
}

type SceneKey = 'gym' | 'pitch';
type GoalKey = string;

// ═══════════════════════════════════════════
// MASTER LOOKUP: scene × goal × phase × position → combo
// ═══════════════════════════════════════════

const MAP: Record<SceneKey, Record<GoalKey, Record<string, Record<string, ComboTarget>>>> = {
  gym: {
    strength: {
      offseason: {
        goalkeeper:     { comboId: 'combo_gk_strength_offseason', confidence: 1.0, bookSource: 'NSCA-CSCS第4版 + Routledge Ch.5' },
        defender:       { comboId: 'combo_df_strength_offseason', confidence: 1.0, bookSource: 'NSCA-CSCS第4版' },
        midfielder:     { comboId: 'combo_mf_strength_offseason', confidence: 1.0, bookSource: 'NSCA-CSCS第4版' },
        forward:        { comboId: 'combo_fw_strength_offseason', confidence: 1.0, bookSource: 'NSCA-CSCS第4版' },
        center_forward: { comboId: 'combo_fw_strength_offseason', confidence: 0.9, bookSource: 'NSCA-CSCS第4版', fallbackComboId: 'combo_fw_strength_offseason' },
        winger:         { comboId: 'combo_fw_strength_offseason', confidence: 0.85, bookSource: 'NSCA-CSCS第4版' },
        wingback:       { comboId: 'combo_df_strength_offseason', confidence: 0.85, bookSource: 'NSCA-CSCS第4版' },
      },
      preseason: {
        goalkeeper:     { comboId: 'combo_gk_power_preseason', confidence: 0.7, bookSource: 'Routledge Ch.5 GPT阶段', fallbackComboId: 'combo_gk_strength_offseason' },
        defender:       { comboId: 'combo_df_power_preseason', confidence: 0.8, bookSource: 'Routledge Ch.5 GPT→SST', fallbackComboId: 'combo_df_strength_offseason' },
        midfielder:     { comboId: 'combo_mf_power_preseason', confidence: 0.8, bookSource: 'Routledge Ch.5 GPT→SST', fallbackComboId: 'combo_mf_strength_offseason' },
        forward:        { comboId: 'combo_fw_power_preseason', confidence: 0.8, bookSource: 'Routledge Ch.5 GPT→SST', fallbackComboId: 'combo_fw_strength_offseason' },
        center_forward: { comboId: 'combo_fw_power_preseason', confidence: 0.75, bookSource: 'Routledge Ch.5 GPT→SST' },
        winger:         { comboId: 'combo_fw_power_preseason', confidence: 0.75, bookSource: 'Routledge Ch.5 GPT→SST' },
        wingback:       { comboId: 'combo_wb_power_preseason', confidence: 0.85, bookSource: 'Routledge Ch.5 GPT→SST' },
      },
      competition: {
        goalkeeper:     { comboId: 'combo_gk_agility_competition', confidence: 0.8, bookSource: 'NSCA赛季维持模型', fallbackComboId: 'combo_gk_power_preseason' },
        defender:       { comboId: 'combo_df_power_preseason', confidence: 0.6, bookSource: 'Routledge Ch.5 SST', fallbackComboId: 'combo_df_strength_offseason' },
        midfielder:     { comboId: 'combo_mf_agility_competition', confidence: 0.75, bookSource: 'NSCA赛季维持模型' },
        forward:        { comboId: 'combo_fw_power_preseason', confidence: 0.6, bookSource: 'Routledge Ch.5 SST', fallbackComboId: 'combo_fw_strength_offseason' },
        center_forward: { comboId: 'combo_fw_power_preseason', confidence: 0.6, bookSource: 'Routledge Ch.5 SST' },
        winger:         { comboId: 'combo_fw_power_preseason', confidence: 0.55, bookSource: 'Routledge Ch.5 SST' },
        wingback:       { comboId: 'combo_wb_agility_competition', confidence: 0.75, bookSource: 'NSCA赛季维持模型' },
      },
      recovery: {
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书: GK恢复期套餐', fallbackComboId: 'combo_gk_agility_competition' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书: 恢复期力量套餐', fallbackComboId: 'combo_df_power_preseason' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书: 恢复期力量套餐', fallbackComboId: 'combo_mf_agility_competition' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书: 恢复期力量套餐', fallbackComboId: 'combo_fw_power_preseason' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书: 恢复期力量套餐' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书: 恢复期力量套餐' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书: 恢复期力量套餐' },
      },
    },
    power: {
      preseason: {
        goalkeeper:     { comboId: 'combo_gk_power_preseason', confidence: 1.0, bookSource: 'NSCA爆发力优先季前模型' },
        defender:       { comboId: 'combo_df_power_preseason', confidence: 1.0, bookSource: 'NSCA爆发力优先季前模型' },
        midfielder:     { comboId: 'combo_mf_power_preseason', confidence: 1.0, bookSource: 'NSCA爆发力优先季前模型' },
        forward:        { comboId: 'combo_fw_power_preseason', confidence: 1.0, bookSource: 'NSCA爆发力优先季前模型' },
        center_forward: { comboId: 'combo_fw_power_preseason', confidence: 1.0, bookSource: 'NSCA爆发力优先季前模型' },
        winger:         { comboId: 'combo_fw_power_preseason', confidence: 0.9, bookSource: 'NSCA爆发力优先季前模型' },
        wingback:       { comboId: 'combo_wb_power_preseason', confidence: 1.0, bookSource: 'NSCA爆发力优先季前模型' },
      },
      competition: {
        goalkeeper:     { comboId: 'combo_gk_power_preseason', confidence: 0.7, bookSource: 'NSCA赛季爆发力维持' },
        defender:       { comboId: 'combo_df_power_preseason', confidence: 0.7, bookSource: 'NSCA赛季爆发力维持' },
        midfielder:     { comboId: 'combo_mf_power_preseason', confidence: 0.7, bookSource: 'NSCA赛季爆发力维持' },
        forward:        { comboId: 'combo_fw_power_preseason', confidence: 0.7, bookSource: 'NSCA赛季爆发力维持' },
        center_forward: { comboId: 'combo_fw_power_preseason', confidence: 0.7, bookSource: 'NSCA赛季爆发力维持' },
        winger:         { comboId: 'combo_fw_power_preseason', confidence: 0.65, bookSource: 'NSCA赛季爆发力维持' },
        wingback:       { comboId: 'combo_wb_power_preseason', confidence: 0.7, bookSource: 'NSCA赛季爆发力维持' },
      },
      offseason: {
        goalkeeper:     { comboId: 'combo_gk_power_preseason', confidence: 0.6, bookSource: 'NSCA休赛期爆发力引入' },
        defender:       { comboId: 'combo_df_power_preseason', confidence: 0.6, bookSource: 'NSCA休赛期爆发力引入' },
        midfielder:     { comboId: 'combo_mf_power_preseason', confidence: 0.6, bookSource: 'NSCA休赛期爆发力引入' },
        forward:        { comboId: 'combo_fw_power_preseason', confidence: 0.6, bookSource: 'NSCA休赛期爆发力引入' },
        center_forward: { comboId: 'combo_fw_power_preseason', confidence: 0.6, bookSource: 'NSCA休赛期爆发力引入' },
        winger:         { comboId: 'combo_fw_power_preseason', confidence: 0.55, bookSource: 'NSCA休赛期爆发力引入' },
        wingback:       { comboId: 'combo_wb_power_preseason', confidence: 0.6, bookSource: 'NSCA休赛期爆发力引入' },
      },
      recovery: {
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书: GK爆发力恢复期' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书: 恢复期爆发力套餐' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书: 恢复期爆发力套餐' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书: 恢复期爆发力套餐' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书: 恢复期爆发力套餐' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书: 恢复期爆发力套餐' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书: 恢复期爆发力套餐' },
      },
    },
    agility: {
      competition: {
        goalkeeper:     { comboId: 'combo_gk_agility_competition', confidence: 1.0, bookSource: 'NSCA赛季灵敏维持' },
        defender:       { comboId: 'combo_df_power_preseason', confidence: 0.4, bookSource: '缺专项灵敏套餐，力量替代', fallbackComboId: 'combo_df_power_preseason' },
        midfielder:     { comboId: 'combo_mf_agility_competition', confidence: 1.0, bookSource: 'NSCA赛季灵敏维持' },
        forward:        { comboId: 'combo_fw_power_preseason', confidence: 0.4, bookSource: '缺专项灵敏套餐', fallbackComboId: 'combo_fw_power_preseason' },
        center_forward: { comboId: 'combo_fw_power_preseason', confidence: 0.35, bookSource: '缺专项灵敏套餐' },
        winger:         { comboId: 'combo_fw_power_preseason', confidence: 0.35, bookSource: '缺专项灵敏套餐' },
        wingback:       { comboId: 'combo_wb_agility_competition', confidence: 1.0, bookSource: 'NSCA赛季灵敏维持' },
      },
      preseason: {
        goalkeeper:     { comboId: 'combo_gk_agility_competition', confidence: 0.8, bookSource: 'NSCA季前灵敏引入' },
        defender:       { comboId: 'combo_df_power_preseason', confidence: 0.5, bookSource: '力量替代灵敏' },
        midfielder:     { comboId: 'combo_mf_agility_competition', confidence: 0.8, bookSource: 'NSCA季前灵敏引入' },
        forward:        { comboId: 'combo_fw_power_preseason', confidence: 0.5, bookSource: '力量替代灵敏' },
        center_forward: { comboId: 'combo_fw_power_preseason', confidence: 0.45, bookSource: '力量替代灵敏' },
        winger:         { comboId: 'combo_fw_power_preseason', confidence: 0.45, bookSource: '力量替代灵敏' },
        wingback:       { comboId: 'combo_wb_agility_competition', confidence: 0.8, bookSource: 'NSCA季前灵敏引入' },
      },
      offseason: {
        goalkeeper:     { comboId: 'combo_gk_agility_competition', confidence: 0.5, bookSource: 'NSCA休赛期灵敏基础' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书: 后卫休赛期灵敏' },
        midfielder:     { comboId: 'combo_mf_agility_competition', confidence: 0.5, bookSource: 'NSCA休赛期灵敏基础' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书: 前锋休赛期灵敏' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书: 中锋休赛期灵敏' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书: 边锋休赛期灵敏' },
        wingback:       { comboId: 'combo_wb_agility_competition', confidence: 0.5, bookSource: 'NSCA休赛期灵敏基础' },
      },
      recovery: {
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书' },
      },
    },
    mas_endurance: {
      preseason: {
        midfielder:     { comboId: 'combo_mf_mas_endurance_preseason', confidence: 1.0, bookSource: 'NSCA有氧基础季前' },
        wingback:       { comboId: 'combo_wb_mas_endurance_preseason', confidence: 1.0, bookSource: 'NSCA有氧基础季前' },
        defender:       { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.6, bookSource: '中场耐力替代后卫' },
        forward:        { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.5, bookSource: '中场耐力替代前锋' },
        center_forward: { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.5, bookSource: '中场耐力替代中锋' },
        winger:         { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.7, bookSource: '翼卫耐力替代边锋' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书: GK专项耐力' },
      },
      competition: {
        midfielder:     { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.7, bookSource: 'NSCA赛季耐力维持' },
        wingback:       { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.7, bookSource: 'NSCA赛季耐力维持' },
        defender:       { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.5, bookSource: '中场耐力替代' },
        forward:        { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.45, bookSource: '中场耐力替代' },
        winger:         { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.6, bookSource: '翼卫耐力替代' },
        center_forward: { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.45, bookSource: '中场耐力替代' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书: GK耐力维持' },
      },
      recovery: {
        midfielder:     { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.4, bookSource: '轻量恢复耐力' },
        wingback:       { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.4, bookSource: '轻量恢复耐力' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      offseason: {
        midfielder:     { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.6, bookSource: 'NSCA休赛期有氧基础' },
        wingback:       { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.6, bookSource: 'NSCA休赛期有氧基础' },
        defender:       { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.5, bookSource: '中场耐力替代' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书: 前锋休赛期耐力' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.55, bookSource: '翼卫耐力替代' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书: GK休赛期耐力' },
      },
    },
  },
  pitch: {
    strength: {
      preseason: {
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书: GK外场自重力量' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书: 外场力量套餐(仅有力量房combo)', fallbackComboId: 'combo_df_strength_offseason' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书: 外场力量套餐', fallbackComboId: 'combo_mf_strength_offseason' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书: 外场力量套餐', fallbackComboId: 'combo_fw_strength_offseason' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书: 外场力量套餐' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书: 外场力量套餐' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书: 外场力量套餐', fallbackComboId: 'combo_df_strength_offseason' },
      },
      competition: {
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      recovery: {
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      offseason: {
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书' },
      },
    },
    speed: {
      competition: {
        defender:       { comboId: 'combo_df_speed_competition', confidence: 1.0, bookSource: 'NSCA速度指南 + Ian Jeffreys Gamespeed' },
        forward:        { comboId: 'combo_fw_speed_competition', confidence: 1.0, bookSource: 'NSCA速度指南 + Ian Jeffreys Gamespeed' },
        winger:         { comboId: 'combo_fw_speed_competition', confidence: 0.9, bookSource: 'NSCA速度指南' },
        wingback:       { comboId: 'combo_wb_speed_competition', confidence: 1.0, bookSource: 'NSCA速度指南 + Ian Jeffreys Gamespeed' },
        midfielder:     { comboId: 'combo_df_speed_competition', confidence: 0.6, bookSource: '后卫速度替代中场' },
        center_forward: { comboId: 'combo_fw_speed_competition', confidence: 0.85, bookSource: 'NSCA速度指南' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书: GK速度专项' },
      },
      preseason: {
        defender:       { comboId: 'combo_df_speed_competition', confidence: 0.8, bookSource: 'NSCA速度指南季前' },
        forward:        { comboId: 'combo_fw_speed_competition', confidence: 0.8, bookSource: 'NSCA速度指南季前' },
        winger:         { comboId: 'combo_fw_speed_competition', confidence: 0.75, bookSource: 'NSCA速度指南' },
        wingback:       { comboId: 'combo_wb_speed_competition', confidence: 0.8, bookSource: 'NSCA速度指南季前' },
        midfielder:     { comboId: 'combo_df_speed_competition', confidence: 0.5, bookSource: '后卫速度替代' },
        center_forward: { comboId: 'combo_fw_speed_competition', confidence: 0.75, bookSource: 'NSCA速度指南' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      recovery: {
        defender:       { comboId: null, confidence: 0, bookSource: '缺书: 恢复期速度' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      offseason: {
        defender:       { comboId: 'combo_df_speed_competition', confidence: 0.6, bookSource: 'NSCA休赛期速度基础' },
        forward:        { comboId: 'combo_fw_speed_competition', confidence: 0.6, bookSource: 'NSCA休赛期速度基础' },
        winger:         { comboId: 'combo_fw_speed_competition', confidence: 0.55, bookSource: 'NSCA休赛期速度基础' },
        wingback:       { comboId: 'combo_wb_speed_competition', confidence: 0.6, bookSource: 'NSCA休赛期速度基础' },
        midfielder:     { comboId: 'combo_df_speed_competition', confidence: 0.45, bookSource: '后卫速度替代' },
        center_forward: { comboId: 'combo_fw_speed_competition', confidence: 0.55, bookSource: 'NSCA休赛期速度基础' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
    },
    power: {
      preseason: {
        defender:       { comboId: null, confidence: 0, bookSource: '缺书: 外场爆发力套餐(仅有力量房combo)', fallbackComboId: 'combo_df_power_preseason' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书: 外场爆发力套餐', fallbackComboId: 'combo_fw_power_preseason' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书', fallbackComboId: 'combo_wb_power_preseason' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书', fallbackComboId: 'combo_mf_power_preseason' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      competition: {
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      recovery: {
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      offseason: {
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        wingback:       { comboId: null, confidence: 0, bookSource: '缺书' },
        midfielder:     { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
    },
    mas_endurance: {
      preseason: {
        midfielder:     { comboId: 'combo_mf_mas_endurance_preseason', confidence: 1.0, bookSource: 'NSCA有氧基础季前 + Ian Jeffreys Gamespeed' },
        wingback:       { comboId: 'combo_wb_mas_endurance_preseason', confidence: 1.0, bookSource: 'NSCA有氧基础季前 + Ian Jeffreys Gamespeed' },
        defender:       { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.6, bookSource: '中场耐力替代后卫' },
        forward:        { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.5, bookSource: '中场耐力替代前锋' },
        winger:         { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.7, bookSource: '翼卫耐力替代边锋' },
        center_forward: { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.5, bookSource: '中场耐力替代' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书: GK外场耐力' },
      },
      competition: {
        midfielder:     { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.7, bookSource: 'NSCA赛季耐力维持' },
        wingback:       { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.7, bookSource: 'NSCA赛季耐力维持' },
        defender:       { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.5, bookSource: '中场耐力替代' },
        forward:        { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.45, bookSource: '中场耐力替代' },
        winger:         { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.6, bookSource: '翼卫耐力替代' },
        center_forward: { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.45, bookSource: '中场耐力替代' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      recovery: {
        midfielder:     { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.4, bookSource: '轻量恢复' },
        wingback:       { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.4, bookSource: '轻量恢复' },
        defender:       { comboId: null, confidence: 0, bookSource: '缺书' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: null, confidence: 0, bookSource: '缺书' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
      offseason: {
        midfielder:     { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.6, bookSource: 'NSCA休赛期有氧基础' },
        wingback:       { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.6, bookSource: 'NSCA休赛期有氧基础' },
        defender:       { comboId: 'combo_mf_mas_endurance_preseason', confidence: 0.5, bookSource: '中场耐力替代' },
        forward:        { comboId: null, confidence: 0, bookSource: '缺书' },
        winger:         { comboId: 'combo_wb_mas_endurance_preseason', confidence: 0.55, bookSource: '翼卫耐力替代' },
        center_forward: { comboId: null, confidence: 0, bookSource: '缺书' },
        goalkeeper:     { comboId: null, confidence: 0, bookSource: '缺书' },
      },
    },
  },
};

// ═══════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════

/** Default position for team/multi-player context */
const DEFAULT_POSITION = 'midfielder';

/**
 * 确定性查找: scene × goal × phase × position → 最优 combo_id
 * 这是 AI 输出校验的"真理源"——AI 选型与映射表不一致时，以映射表为准。
 */
export function getComboTarget(
  scene: string,
  goal: string,
  phase: SeasonPhase,
  position?: Position | null
): ComboTarget {
  const pos = position || DEFAULT_POSITION;

  // Navigate the map with fallbacks
  const sceneMap = MAP[scene as SceneKey];
  if (!sceneMap) return notFound('未知场景');

  const goalMap = sceneMap[goal];
  if (!goalMap) return notFound('未知目标');

  const phaseMap = goalMap[phase];
  if (!phaseMap) return notFound('未知周期阶段');

  const target = phaseMap[pos];
  if (target) return target;

  // Fallback to default position
  const fallback = phaseMap[DEFAULT_POSITION];
  if (fallback) return { ...fallback, confidence: fallback.confidence * 0.8 };

  return notFound('无匹配');
}

function notFound(reason: string): ComboTarget {
  return { comboId: null, confidence: 0, bookSource: `缺书: ${reason}` };
}

/**
 * AI 输出校验: 比较 AI 选的 combo_id 与映射表推荐
 * 返回: { valid, recommended, score, shouldOverride }
 */
export function validateAICombo(
  aiComboId: string | null,
  scene: string,
  goal: string,
  phase: SeasonPhase,
  position?: Position | null
): {
  valid: boolean;
  recommended: string | null;
  score: number;
  shouldOverride: boolean;
  reason: string;
} {
  const target = getComboTarget(scene, goal, phase, position);

  // AI returned null - use map's recommendation
  if (!aiComboId) {
    return {
      valid: false,
      recommended: target.comboId || target.fallbackComboId || null,
      score: target.confidence * 100,
      shouldOverride: true,
      reason: `AI未返回combo_id，使用映射表推荐 (置信度${Math.round(target.confidence * 100)}%)`,
    };
  }

  // AI matches map exactly
  if (target.comboId && aiComboId === target.comboId) {
    return {
      valid: true,
      recommended: aiComboId,
      score: target.confidence * 100,
      shouldOverride: false,
      reason: `AI选型与映射表一致 (${target.bookSource})`,
    };
  }

  // AI chose something different - score comparison
  if (target.comboId && aiComboId !== target.comboId) {
    // If map confidence is high and AI disagrees, override
    if (target.confidence >= 0.7) {
      return {
        valid: false,
        recommended: target.comboId,
        score: target.confidence * 100,
        shouldOverride: true,
        reason: `AI选了${aiComboId}，映射表推荐${target.comboId} (置信度${Math.round(target.confidence * 100)}%，${target.bookSource})`,
      };
    }
    // Low map confidence - accept AI's choice
    return {
      valid: true,
      recommended: aiComboId,
      score: Math.max(target.confidence * 100, 60),
      shouldOverride: false,
      reason: `AI选型${aiComboId}采纳 (映射表置信度仅${Math.round(target.confidence * 100)}%)`,
    };
  }

  // Map has no recommendation - accept AI
  if (!target.comboId && aiComboId) {
    return {
      valid: true,
      recommended: aiComboId,
      score: 50,
      shouldOverride: false,
      reason: '映射表无此场景推荐，采纳AI选型 (标记为低置信度)',
    };
  }

  return {
    valid: false,
    recommended: target.fallbackComboId || null,
    score: 0,
    shouldOverride: true,
    reason: '无匹配，触发离线引擎',
  };
}

/**
 * 汇总全部缺书场景
 */
export function getMissingBooks(): { scene: string; goal: string; phase: string; position: string; reason: string }[] {
  const missing: { scene: string; goal: string; phase: string; position: string; reason: string }[] = [];
  for (const [scene, goalMap] of Object.entries(MAP)) {
    for (const [goal, phaseMap] of Object.entries(goalMap)) {
      for (const [phase, posMap] of Object.entries(phaseMap)) {
        for (const [position, target] of Object.entries(posMap)) {
          if (!target.comboId && !target.fallbackComboId) {
            missing.push({ scene, goal, phase, position, reason: target.bookSource });
          }
        }
      }
    }
  }
  return missing;
}
