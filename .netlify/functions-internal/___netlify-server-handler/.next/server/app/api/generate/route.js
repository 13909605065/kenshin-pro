"use strict";(()=>{var o={};o.id=8290,o.ids=[8290],o.modules={2934:o=>{o.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:o=>{o.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:o=>{o.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:o=>{o.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:o=>{o.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2048:o=>{o.exports=require("fs")},5822:o=>{o.exports=require("path")},2022:(o,e,n)=>{n.r(e),n.d(e,{originalPathname:()=>ot,patchFetch:()=>os,requestAsyncStorage:()=>or,routeModule:()=>oc,serverHooks:()=>oi,staticGenerationAsyncStorage:()=>oa});var c={};n.r(c),n.d(c,{POST:()=>on});var r=n(9303),a=n(8716),i=n(670),t=n(5784);let s={goalkeeper:"守门员",defender:"中后卫",midfielder:"中场",center_forward:"中锋",winger:"边锋",forward:"前锋",wingback:"边后卫"},d={strength:"纯力量",power:"爆发力",speed:"速度",agility:"协调灵敏",mas_endurance:"耐力",combat:"对抗能力",hypertrophy:"肌肥大",fat_loss:"减脂",body_shaping:"塑形",general_fitness:"锻炼身体",strength_fitness:"增力",endurance_fitness:"耐力体能"},m={preseason:"准备期",competition:"赛季期",recovery:"赛后恢复",offseason:"休赛期"},l={knee:"膝关节",ankle:"踝关节",achilles:"跟腱",waist:"腰部",thigh:"大腿",hip:"髋关节",finger:"手指",wrist:"腕关节",shoulder:"肩关节"},b={pro:"PRO 职业级",a:"A 级",b:"B 级",c:"C 级",d:"D 级",none:"无证"},_={campus:"校园教练",youth:"青训教练",amateur:"业余教练",semi_pro:"半职业教练",pro:"职业教练"},f={youth_u12:"青训 U12",youth_u15:"青训 U15",youth_u18:"青训 U18",youth_u20:"青训 U20",youth_u21:"青训 U21",campus_u6_u12:"校园 U6-U12",china_league_two:"中乙",china_league_one:"中甲",chinese_super_league:"中超",amateur_team:"业余队"},p={zh:"请用中文输出所有内容。",en:"Please output ALL content in English. All exercise names, descriptions, and module titles must be in English.",ja:"すべての内容を日本語で出力してください。"},u={preseason:{phase:"preseason",label:"Preseason",labelCn:"季前准备期",weeks:4,intensityPercent:[65,75],repsRange:[8,12],setsRange:[3,4],restBetweenSets:[90,120],variationStrategy:"优先变式动作，打磨技术，纠正体态",weeklyFrequency:3,volumeTrend:"increasing"},competition:{phase:"competition",label:"Competition",labelCn:"赛季比赛期",weeks:0,intensityPercent:[75,85],repsRange:[5,8],setsRange:[3,4],restBetweenSets:[120,180],variationStrategy:"标准主项，维持力量，不追求极限",weeklyFrequency:2,volumeTrend:"maintaining"},recovery:{phase:"recovery",label:"Recovery",labelCn:"赛后恢复期",weeks:2,intensityPercent:[50,65],repsRange:[10,15],setsRange:[2,3],restBetweenSets:[60,90],variationStrategy:"回归变式，低强度恢复，关节保护",weeklyFrequency:2,volumeTrend:"tapering"},offseason:{phase:"offseason",label:"Offseason",labelCn:"休赛储备期",weeks:12,intensityPercent:[80,95],repsRange:[3,6],setsRange:[4,5],restBetweenSets:[180,240],variationStrategy:"极限负重主项，全力爆发，可冲PR",weeklyFrequency:4,volumeTrend:"increasing"}},g=(u.offseason,u.preseason,u.competition,u.recovery,u.competition,u.preseason,[{goal:"strength",labelCn:"最大力量",percent1RM:[85,100],setsReps:"3-5\xd71-5",rest:"3-5min",tempo:"1:0:1"},{goal:"power",labelCn:"爆发力",percent1RM:[30,60],setsReps:"3-5\xd71-5",rest:"3-5min",tempo:"explosive"},{goal:"speed",labelCn:"速度",percent1RM:[0,10],setsReps:"3-4\xd73-6",rest:"3-5min",tempo:"explosive"},{goal:"agility",labelCn:"灵敏",percent1RM:[0,10],setsReps:"3-5\xd73-8",rest:"1-2min",tempo:"explosive"},{goal:"mas_endurance",labelCn:"专项耐力",percent1RM:[0,67],setsReps:"2-3\xd712-20",rest:"30-60s",tempo:"2:0:1"},{goal:"combat",labelCn:"对抗力量",percent1RM:[67,85],setsReps:"3-5\xd75-10",rest:"2-3min",tempo:"2:1:1"}]);function w(o){return g.find(e=>e.goal===o)}let S=`### RAMP热身（Ian Jeffreys）
- 禁止热身中静态拉伸；放冷身阶段
- R→A→M→P 四阶段，总15-20min，每节含FIFA 11+核心`,k=`### 周期化（NSCA-CSCS — TS自动计算组/次/负荷/间歇）
| 目标 | %1RM | 组\xd7次 | 间歇 |
|------|------|-------|------|
| 肌耐力 | <67% | 2-3\xd712-20 | 30-60s |
| 肌肥大 | 67-85% | 3-6\xd76-12 | 1-2min |
| 最大力量 | 85-100% | 3-5\xd71-5 | 3-5min |
| 爆发力 | 30-60%或80-90% | 3-5\xd71-5 | 3-5min |
季前：爆发力优先，赛季：维持，休赛期：冲力量。负荷基于1RM/GPS/RPE/CMJ实测，禁止用训练年限决定。`,h=`### 训练排序（神经需求降序）
力量房：爆发力→下肢大复合→上肢推拉→核心/预康复。禁上肢先于下肢。
外场：速度/加速→爆发力/跳跃→自重力量→间歇耐力。`,I=`### 伤病排除（TS自动过滤禁忌动作）
四大伤病：腘绳肌≫踝≫膝≫腹股沟。北欧弯举必练。伤病史是最大预测因子。
排除规则：腰→禁硬拉/RDL/深蹲；膝→禁深蹲/弓步/跳箱；踝→禁跳箱/折返跑；跟腱→禁冲刺。`,C=`### 营养（TS自动填充）
蛋白1.6-2.0g/kg，碳水5-8g/kg训练日，赛后30min快碳+蛋白。`,y=`### 场景边界
**力量房**：杠铃/哑铃/跳箱/药球。禁跑类有氧/冲刺/SSG/有球热身。
**外场**：自重/弹力带/药球/跑跳。禁杠铃/哑铃/绳索/绳梯灵敏。
**康复**：≤50%1RM，禁爆发力/冲刺/跳跃，仅自重+弹力带+等长。`;var x=n(7420);let $="NSCA-CSCS第4版",A="ATHLETE_COMBOS (training-library.ts)",R="midfielder",v=[/^ex-back-squat/,/^ex-front-squat/,/^ex-deadlift/,/^ex-trap-bar-deadlift/,/^ex-romanian-dl/,/^ex-bench-press/,/^ex-standing-press/,/^ex-barbell-row/,/^ex-power-clean/,/^ex-hang-clean/,/^ex-dumbbell-/,/^ex-cable-/,/^ex-sus-/,/^ex-leg-press/,/^ex-hanging-leg-raise/,/^ex-face-pull/,/^ex-hip-thrust/,/^ex-hamstring-curl/,/^ex-lat-pulldown/,/^ex-chest-fly/,/^ex-tricep-/,/^ex-bicep-/,/^ex-skull-crusher/],N={upper:["ex-pushup","ex-band-row","ex-mb-chest-pass"],lower:["ex-bulgarian-split-squat","ex-nordic-hamstring","ex-single-leg-rdl","ex-glute-bridge","ex-box-jump"],core:["ex-plank","ex-dead-bug","ex-bird-dog","ex-side-plank"],ability:["ex-sprint-start","ex-pro-agility","ex-hurdle-jump","ex-sled-sprint"]};function M(o,e,n){if("pitch"!==e)return o;let c=[];for(let e of o)if(function(o){return v.some(e=>e.test(o))}(e)){let o=function(o,e,n){return(N[e]||[]).filter(o=>x.TX[o]&&!n.has(o))[0]||null}(0,N.upper.includes(e)?"upper":N.lower.includes(e)?"lower":N.core.includes(e)?"core":"ability",n);o&&!n.has(o)&&(c.push(o),n.add(o))}else c.push(e),n.add(e);return c}function T(o,e,n){let c=u[e],r=w(n),a=Math.round((c.setsRange[0]+c.setsRange[1])/2);if(r){let o=r.setsReps.match(/^(\d+)-(\d+)/);if(o){let e=Math.round((+o[1]+ +o[2])/2);a=Math.max(c.setsRange[0],Math.min(c.setsRange[1],e))}}return Math.max(o.sets[0],Math.min(o.sets[1],a))}function j(o,e,n){let c=u[e],r=w(n),a=Math.round((c.repsRange[0]+c.repsRange[1])/2);if(r){let o=r.setsReps.match(/×(\d+)-(\d+)$/);if(o){let e=Math.round((+o[1]+ +o[2])/2);a=Math.max(c.repsRange[0],Math.min(c.repsRange[1],e))}}return Math.max(o.reps[0],Math.min(o.reps[1],a))}function G(o,e,n){let c=u[e],r=w(n),a=Math.round((c.restBetweenSets[0]+c.restBetweenSets[1])/2);if(r){let o=r.rest.split("-").map(o=>parseInt(o,10));2!==o.length||isNaN(o[0])||isNaN(o[1])?1!==o.length||isNaN(o[0])||(a=60*o[0]):a=Math.round((60*o[0]+60*o[1])/2),a=Math.max(30,Math.min(300,a))}return a}function q(o,e,n,c){var r;let a,i;let t=u[e],s=w(n);s&&s.percent1RM[1]>0?(a=s.percent1RM[0],i=s.percent1RM[1]):(a=t.intensityPercent[0],i=t.intensityPercent[1]);let d=Math.round((a+i)/2),m=(r=o.id,/squat|split|lunge|bulgarian|pistol|thruster|goblet|sumo/.test(r)?c.squat1RM||null:/bench|press|push|tricep|dip|skull/.test(r)?c.bench1RM||null:/deadlift|rdl|romanian|hinge|pull/i.test(r)?c.deadlift1RM||null:/clean|snatch|jerk/.test(r)?c.powerClean1RM||null:/thrust|bridge|hip/.test(r)&&c.squat1RM||null);return m&&d>0?`${Math.round(m*d/100)}kg (${d}% 1RM)`:o.load_default&&o.load_default.includes("%")?`${a}-${i}% 1RM`:o.load_default||`${a}-${i}% 1RM`}function D(o,e,n,c){let r=x.TX[o];if(!r)return null;let a=T(r,e,n),i=j(r,e,n),t=q(r,e,n,c),s=G(r,e,n),d=`${$} → ${r.name}`;return r.periodization&&r.periodization[e]&&(d=`${$} (exercise periodization) → ${r.name}`),{name:r.name,sets:a,reps:i,load:t,rest:s,rpe:r.rpe,heart_rate_zone:r.heart_rate_zone,image_url:r.image_url,cue_points:r.cue_points,bookSource:d}}function P(o){let e=x.rs[o];return e?{name:e.name,duration:e.duration,description:e.description,category:e.category,bookSource:`${A} → warmup: ${e.name}`}:null}function K(o){let e=x.IQ[o];return e?{name:e.name,duration:e.duration,description:e.description,category:"no_ball",bookSource:`${A} → cooldown: ${e.name}`}:null}let O={gym:{strength:{offseason:{goalkeeper:{comboId:"combo_gk_strength_offseason",confidence:1,bookSource:"NSCA-CSCS第4版 + Routledge Ch.5"},defender:{comboId:"combo_df_strength_offseason",confidence:1,bookSource:"NSCA-CSCS第4版"},midfielder:{comboId:"combo_mf_strength_offseason",confidence:1,bookSource:"NSCA-CSCS第4版"},forward:{comboId:"combo_fw_strength_offseason",confidence:1,bookSource:"NSCA-CSCS第4版"},center_forward:{comboId:"combo_fw_strength_offseason",confidence:.9,bookSource:"NSCA-CSCS第4版",fallbackComboId:"combo_fw_strength_offseason"},winger:{comboId:"combo_fw_strength_offseason",confidence:.85,bookSource:"NSCA-CSCS第4版"},wingback:{comboId:"combo_df_strength_offseason",confidence:.85,bookSource:"NSCA-CSCS第4版"}},preseason:{goalkeeper:{comboId:"combo_gk_power_preseason",confidence:.7,bookSource:"Routledge Ch.5 GPT阶段",fallbackComboId:"combo_gk_strength_offseason"},defender:{comboId:"combo_df_power_preseason",confidence:.8,bookSource:"Routledge Ch.5 GPT→SST",fallbackComboId:"combo_df_strength_offseason"},midfielder:{comboId:"combo_mf_power_preseason",confidence:.8,bookSource:"Routledge Ch.5 GPT→SST",fallbackComboId:"combo_mf_strength_offseason"},forward:{comboId:"combo_fw_power_preseason",confidence:.8,bookSource:"Routledge Ch.5 GPT→SST",fallbackComboId:"combo_fw_strength_offseason"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.75,bookSource:"Routledge Ch.5 GPT→SST"},winger:{comboId:"combo_fw_power_preseason",confidence:.75,bookSource:"Routledge Ch.5 GPT→SST"},wingback:{comboId:"combo_wb_power_preseason",confidence:.85,bookSource:"Routledge Ch.5 GPT→SST"}},competition:{goalkeeper:{comboId:"combo_gk_agility_competition",confidence:.8,bookSource:"NSCA赛季维持模型",fallbackComboId:"combo_gk_power_preseason"},defender:{comboId:"combo_df_power_preseason",confidence:.6,bookSource:"Routledge Ch.5 SST",fallbackComboId:"combo_df_strength_offseason"},midfielder:{comboId:"combo_mf_agility_competition",confidence:.75,bookSource:"NSCA赛季维持模型"},forward:{comboId:"combo_fw_power_preseason",confidence:.6,bookSource:"Routledge Ch.5 SST",fallbackComboId:"combo_fw_strength_offseason"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.6,bookSource:"Routledge Ch.5 SST"},winger:{comboId:"combo_fw_power_preseason",confidence:.55,bookSource:"Routledge Ch.5 SST"},wingback:{comboId:"combo_wb_agility_competition",confidence:.75,bookSource:"NSCA赛季维持模型"}},recovery:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书: GK恢复期套餐",fallbackComboId:"combo_gk_agility_competition"},defender:{comboId:null,confidence:0,bookSource:"缺书: 恢复期力量套餐",fallbackComboId:"combo_df_power_preseason"},midfielder:{comboId:null,confidence:0,bookSource:"缺书: 恢复期力量套餐",fallbackComboId:"combo_mf_agility_competition"},forward:{comboId:null,confidence:0,bookSource:"缺书: 恢复期力量套餐",fallbackComboId:"combo_fw_power_preseason"},center_forward:{comboId:null,confidence:0,bookSource:"缺书: 恢复期力量套餐"},winger:{comboId:null,confidence:0,bookSource:"缺书: 恢复期力量套餐"},wingback:{comboId:null,confidence:0,bookSource:"缺书: 恢复期力量套餐"}}},power:{preseason:{goalkeeper:{comboId:"combo_gk_power_preseason",confidence:1,bookSource:"NSCA爆发力优先季前模型"},defender:{comboId:"combo_df_power_preseason",confidence:1,bookSource:"NSCA爆发力优先季前模型"},midfielder:{comboId:"combo_mf_power_preseason",confidence:1,bookSource:"NSCA爆发力优先季前模型"},forward:{comboId:"combo_fw_power_preseason",confidence:1,bookSource:"NSCA爆发力优先季前模型"},center_forward:{comboId:"combo_fw_power_preseason",confidence:1,bookSource:"NSCA爆发力优先季前模型"},winger:{comboId:"combo_fw_power_preseason",confidence:.9,bookSource:"NSCA爆发力优先季前模型"},wingback:{comboId:"combo_wb_power_preseason",confidence:1,bookSource:"NSCA爆发力优先季前模型"}},competition:{goalkeeper:{comboId:"combo_gk_power_preseason",confidence:.7,bookSource:"NSCA赛季爆发力维持"},defender:{comboId:"combo_df_power_preseason",confidence:.7,bookSource:"NSCA赛季爆发力维持"},midfielder:{comboId:"combo_mf_power_preseason",confidence:.7,bookSource:"NSCA赛季爆发力维持"},forward:{comboId:"combo_fw_power_preseason",confidence:.7,bookSource:"NSCA赛季爆发力维持"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.7,bookSource:"NSCA赛季爆发力维持"},winger:{comboId:"combo_fw_power_preseason",confidence:.65,bookSource:"NSCA赛季爆发力维持"},wingback:{comboId:"combo_wb_power_preseason",confidence:.7,bookSource:"NSCA赛季爆发力维持"}},offseason:{goalkeeper:{comboId:"combo_gk_power_preseason",confidence:.6,bookSource:"NSCA休赛期爆发力引入"},defender:{comboId:"combo_df_power_preseason",confidence:.6,bookSource:"NSCA休赛期爆发力引入"},midfielder:{comboId:"combo_mf_power_preseason",confidence:.6,bookSource:"NSCA休赛期爆发力引入"},forward:{comboId:"combo_fw_power_preseason",confidence:.6,bookSource:"NSCA休赛期爆发力引入"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.6,bookSource:"NSCA休赛期爆发力引入"},winger:{comboId:"combo_fw_power_preseason",confidence:.55,bookSource:"NSCA休赛期爆发力引入"},wingback:{comboId:"combo_wb_power_preseason",confidence:.6,bookSource:"NSCA休赛期爆发力引入"}},recovery:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书: GK爆发力恢复期"},defender:{comboId:null,confidence:0,bookSource:"缺书: 恢复期爆发力套餐"},midfielder:{comboId:null,confidence:0,bookSource:"缺书: 恢复期爆发力套餐"},forward:{comboId:null,confidence:0,bookSource:"缺书: 恢复期爆发力套餐"},center_forward:{comboId:null,confidence:0,bookSource:"缺书: 恢复期爆发力套餐"},winger:{comboId:null,confidence:0,bookSource:"缺书: 恢复期爆发力套餐"},wingback:{comboId:null,confidence:0,bookSource:"缺书: 恢复期爆发力套餐"}}},agility:{competition:{goalkeeper:{comboId:"combo_gk_agility_competition",confidence:1,bookSource:"NSCA赛季灵敏维持"},defender:{comboId:"combo_df_power_preseason",confidence:.4,bookSource:"缺专项灵敏套餐，力量替代",fallbackComboId:"combo_df_power_preseason"},midfielder:{comboId:"combo_mf_agility_competition",confidence:1,bookSource:"NSCA赛季灵敏维持"},forward:{comboId:"combo_fw_power_preseason",confidence:.4,bookSource:"缺专项灵敏套餐",fallbackComboId:"combo_fw_power_preseason"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.35,bookSource:"缺专项灵敏套餐"},winger:{comboId:"combo_fw_power_preseason",confidence:.35,bookSource:"缺专项灵敏套餐"},wingback:{comboId:"combo_wb_agility_competition",confidence:1,bookSource:"NSCA赛季灵敏维持"}},preseason:{goalkeeper:{comboId:"combo_gk_agility_competition",confidence:.8,bookSource:"NSCA季前灵敏引入"},defender:{comboId:"combo_df_power_preseason",confidence:.5,bookSource:"力量替代灵敏"},midfielder:{comboId:"combo_mf_agility_competition",confidence:.8,bookSource:"NSCA季前灵敏引入"},forward:{comboId:"combo_fw_power_preseason",confidence:.5,bookSource:"力量替代灵敏"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.45,bookSource:"力量替代灵敏"},winger:{comboId:"combo_fw_power_preseason",confidence:.45,bookSource:"力量替代灵敏"},wingback:{comboId:"combo_wb_agility_competition",confidence:.8,bookSource:"NSCA季前灵敏引入"}},offseason:{goalkeeper:{comboId:"combo_gk_agility_competition",confidence:.5,bookSource:"NSCA休赛期灵敏基础"},defender:{comboId:null,confidence:0,bookSource:"缺书: 后卫休赛期灵敏"},midfielder:{comboId:"combo_mf_agility_competition",confidence:.5,bookSource:"NSCA休赛期灵敏基础"},forward:{comboId:null,confidence:0,bookSource:"缺书: 前锋休赛期灵敏"},center_forward:{comboId:null,confidence:0,bookSource:"缺书: 中锋休赛期灵敏"},winger:{comboId:null,confidence:0,bookSource:"缺书: 边锋休赛期灵敏"},wingback:{comboId:"combo_wb_agility_competition",confidence:.5,bookSource:"NSCA休赛期灵敏基础"}},recovery:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书"},defender:{comboId:null,confidence:0,bookSource:"缺书"},midfielder:{comboId:null,confidence:0,bookSource:"缺书"},forward:{comboId:null,confidence:0,bookSource:"缺书"},center_forward:{comboId:null,confidence:0,bookSource:"缺书"},winger:{comboId:null,confidence:0,bookSource:"缺书"},wingback:{comboId:null,confidence:0,bookSource:"缺书"}}},mas_endurance:{preseason:{midfielder:{comboId:"combo_mf_mas_endurance_preseason",confidence:1,bookSource:"NSCA有氧基础季前"},wingback:{comboId:"combo_wb_mas_endurance_preseason",confidence:1,bookSource:"NSCA有氧基础季前"},defender:{comboId:"combo_mf_mas_endurance_preseason",confidence:.6,bookSource:"中场耐力替代后卫"},forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"中场耐力替代前锋"},center_forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"中场耐力替代中锋"},winger:{comboId:"combo_wb_mas_endurance_preseason",confidence:.7,bookSource:"翼卫耐力替代边锋"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书: GK专项耐力"}},competition:{midfielder:{comboId:"combo_mf_mas_endurance_preseason",confidence:.7,bookSource:"NSCA赛季耐力维持"},wingback:{comboId:"combo_wb_mas_endurance_preseason",confidence:.7,bookSource:"NSCA赛季耐力维持"},defender:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"中场耐力替代"},forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.45,bookSource:"中场耐力替代"},winger:{comboId:"combo_wb_mas_endurance_preseason",confidence:.6,bookSource:"翼卫耐力替代"},center_forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.45,bookSource:"中场耐力替代"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书: GK耐力维持"}},recovery:{midfielder:{comboId:"combo_mf_mas_endurance_preseason",confidence:.4,bookSource:"轻量恢复耐力"},wingback:{comboId:"combo_wb_mas_endurance_preseason",confidence:.4,bookSource:"轻量恢复耐力"},defender:{comboId:null,confidence:0,bookSource:"缺书"},forward:{comboId:null,confidence:0,bookSource:"缺书"},center_forward:{comboId:null,confidence:0,bookSource:"缺书"},winger:{comboId:null,confidence:0,bookSource:"缺书"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书"}},offseason:{midfielder:{comboId:"combo_mf_mas_endurance_preseason",confidence:.6,bookSource:"NSCA休赛期有氧基础"},wingback:{comboId:"combo_wb_mas_endurance_preseason",confidence:.6,bookSource:"NSCA休赛期有氧基础"},defender:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"中场耐力替代"},forward:{comboId:null,confidence:0,bookSource:"缺书: 前锋休赛期耐力"},center_forward:{comboId:null,confidence:0,bookSource:"缺书"},winger:{comboId:"combo_wb_mas_endurance_preseason",confidence:.55,bookSource:"翼卫耐力替代"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书: GK休赛期耐力"}}}},pitch:{strength:{preseason:{goalkeeper:{comboId:"combo_gk_strength_offseason",confidence:.5,bookSource:"CSCS休赛期力量→外场自重化(杠铃→自重变式)",fallbackComboId:"combo_gk_strength_offseason"},defender:{comboId:"combo_df_strength_offseason",confidence:.6,bookSource:"CSCS外场自重力量\xb7后卫(杠铃动作由assembler过滤为自重变式)",fallbackComboId:"combo_df_strength_offseason"},midfielder:{comboId:"combo_mf_strength_offseason",confidence:.6,bookSource:"CSCS外场自重力量\xb7中场(杠铃→自重/弹力带)",fallbackComboId:"combo_mf_strength_offseason"},forward:{comboId:"combo_fw_strength_offseason",confidence:.6,bookSource:"CSCS外场自重力量\xb7前锋(杠铃→自重/药球)",fallbackComboId:"combo_fw_strength_offseason"},center_forward:{comboId:"combo_fw_strength_offseason",confidence:.55,bookSource:"CSCS外场自重力量\xb7中锋"},winger:{comboId:"combo_fw_strength_offseason",confidence:.55,bookSource:"CSCS外场自重力量\xb7边锋"},wingback:{comboId:"combo_df_strength_offseason",confidence:.6,bookSource:"CSCS外场自重力量\xb7翼卫",fallbackComboId:"combo_df_strength_offseason"}},competition:{goalkeeper:{comboId:"combo_gk_agility_competition",confidence:.5,bookSource:"CSCS赛季力量维持\xb7GK(外场自重化)",fallbackComboId:"combo_gk_agility_competition"},defender:{comboId:"combo_df_strength_offseason",confidence:.55,bookSource:"CSCS赛季外场力量\xb7后卫(降量保强度)",fallbackComboId:"combo_df_strength_offseason"},midfielder:{comboId:"combo_mf_strength_offseason",confidence:.55,bookSource:"CSCS赛季外场力量\xb7中场(降量)",fallbackComboId:"combo_mf_strength_offseason"},forward:{comboId:"combo_fw_strength_offseason",confidence:.55,bookSource:"CSCS赛季外场力量\xb7前锋",fallbackComboId:"combo_fw_strength_offseason"},center_forward:{comboId:"combo_fw_strength_offseason",confidence:.5,bookSource:"CSCS赛季外场力量\xb7中锋"},winger:{comboId:"combo_fw_strength_offseason",confidence:.5,bookSource:"CSCS赛季外场力量\xb7边锋"},wingback:{comboId:"combo_df_strength_offseason",confidence:.55,bookSource:"CSCS赛季外场力量\xb7翼卫",fallbackComboId:"combo_df_strength_offseason"}},recovery:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK外场力量恢复",fallbackComboId:"combo_gk_agility_competition"},defender:{comboId:null,confidence:0,bookSource:"缺书:后卫外场力量恢复",fallbackComboId:"combo_df_strength_offseason"},midfielder:{comboId:null,confidence:0,bookSource:"缺书:中场外场力量恢复",fallbackComboId:"combo_mf_strength_offseason"},forward:{comboId:null,confidence:0,bookSource:"缺书:前锋外场力量恢复",fallbackComboId:"combo_fw_strength_offseason"},center_forward:{comboId:null,confidence:0,bookSource:"缺书"},winger:{comboId:null,confidence:0,bookSource:"缺书"},wingback:{comboId:null,confidence:0,bookSource:"缺书:翼卫外场力量恢复",fallbackComboId:"combo_df_strength_offseason"}},offseason:{goalkeeper:{comboId:"combo_gk_strength_offseason",confidence:.55,bookSource:"CSCS休赛期外场力量基础\xb7GK",fallbackComboId:"combo_gk_strength_offseason"},defender:{comboId:"combo_df_strength_offseason",confidence:.65,bookSource:"CSCS休赛期外场力量基础\xb7后卫",fallbackComboId:"combo_df_strength_offseason"},midfielder:{comboId:"combo_mf_strength_offseason",confidence:.65,bookSource:"CSCS休赛期外场力量基础\xb7中场",fallbackComboId:"combo_mf_strength_offseason"},forward:{comboId:"combo_fw_strength_offseason",confidence:.65,bookSource:"CSCS休赛期外场力量基础\xb7前锋",fallbackComboId:"combo_fw_strength_offseason"},center_forward:{comboId:"combo_fw_strength_offseason",confidence:.6,bookSource:"CSCS休赛期外场力量基础\xb7中锋"},winger:{comboId:"combo_fw_strength_offseason",confidence:.6,bookSource:"CSCS休赛期外场力量基础\xb7边锋"},wingback:{comboId:"combo_df_strength_offseason",confidence:.65,bookSource:"CSCS休赛期外场力量基础\xb7翼卫",fallbackComboId:"combo_df_strength_offseason"}}},speed:{competition:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK速度专项",fallbackComboId:"combo_gk_agility_competition"},defender:{comboId:"combo_df_speed_competition",confidence:1,bookSource:"NSCA速度指南 + Ian Jeffreys Gamespeed"},forward:{comboId:"combo_fw_speed_competition",confidence:1,bookSource:"NSCA速度指南 + Ian Jeffreys Gamespeed"},winger:{comboId:"combo_fw_speed_competition",confidence:.9,bookSource:"NSCA速度指南"},wingback:{comboId:"combo_wb_speed_competition",confidence:1,bookSource:"NSCA速度指南 + Ian Jeffreys Gamespeed"},midfielder:{comboId:"combo_df_speed_competition",confidence:.65,bookSource:"CSCS速度\xb7中场(后卫速度替代)"},center_forward:{comboId:"combo_fw_speed_competition",confidence:.85,bookSource:"NSCA速度指南"}},preseason:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK速度季前",fallbackComboId:"combo_gk_agility_competition"},defender:{comboId:"combo_df_speed_competition",confidence:.8,bookSource:"NSCA速度指南季前"},forward:{comboId:"combo_fw_speed_competition",confidence:.8,bookSource:"NSCA速度指南季前"},winger:{comboId:"combo_fw_speed_competition",confidence:.75,bookSource:"NSCA速度指南季前"},wingback:{comboId:"combo_wb_speed_competition",confidence:.8,bookSource:"NSCA速度指南季前"},midfielder:{comboId:"combo_df_speed_competition",confidence:.55,bookSource:"CSCS速度季前\xb7中场(后卫速度替代)"},center_forward:{comboId:"combo_fw_speed_competition",confidence:.75,bookSource:"NSCA速度指南季前"}},recovery:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK速度恢复"},defender:{comboId:null,confidence:0,bookSource:"缺书:后卫速度恢复",fallbackComboId:"combo_df_speed_competition"},forward:{comboId:null,confidence:0,bookSource:"缺书:前锋速度恢复",fallbackComboId:"combo_fw_speed_competition"},winger:{comboId:null,confidence:0,bookSource:"缺书:边锋速度恢复",fallbackComboId:"combo_fw_speed_competition"},wingback:{comboId:null,confidence:0,bookSource:"缺书:翼卫速度恢复",fallbackComboId:"combo_wb_speed_competition"},midfielder:{comboId:null,confidence:0,bookSource:"缺书:中场速度恢复",fallbackComboId:"combo_df_speed_competition"},center_forward:{comboId:null,confidence:0,bookSource:"缺书:中锋速度恢复",fallbackComboId:"combo_fw_speed_competition"}},offseason:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK速度休赛期",fallbackComboId:"combo_gk_agility_competition"},defender:{comboId:"combo_df_speed_competition",confidence:.6,bookSource:"NSCA休赛期速度基础"},forward:{comboId:"combo_fw_speed_competition",confidence:.6,bookSource:"NSCA休赛期速度基础"},winger:{comboId:"combo_fw_speed_competition",confidence:.55,bookSource:"NSCA休赛期速度基础"},wingback:{comboId:"combo_wb_speed_competition",confidence:.6,bookSource:"NSCA休赛期速度基础"},midfielder:{comboId:"combo_df_speed_competition",confidence:.5,bookSource:"CSCS休赛期速度基础\xb7中场(后卫速度替代)"},center_forward:{comboId:"combo_fw_speed_competition",confidence:.55,bookSource:"NSCA休赛期速度基础"}}},power:{preseason:{goalkeeper:{comboId:"combo_gk_power_preseason",confidence:.5,bookSource:"CSCS外场爆发力\xb7GK(杠铃→自重/药球)",fallbackComboId:"combo_gk_power_preseason"},defender:{comboId:"combo_df_power_preseason",confidence:.6,bookSource:"CSCS外场爆发力\xb7后卫(杠铃→跳箱/药球/冲刺)",fallbackComboId:"combo_df_power_preseason"},forward:{comboId:"combo_fw_power_preseason",confidence:.6,bookSource:"CSCS外场爆发力\xb7前锋(杠铃→跳箱/药球)",fallbackComboId:"combo_fw_power_preseason"},winger:{comboId:"combo_fw_power_preseason",confidence:.55,bookSource:"CSCS外场爆发力\xb7边锋",fallbackComboId:"combo_fw_power_preseason"},wingback:{comboId:"combo_wb_power_preseason",confidence:.6,bookSource:"CSCS外场爆发力\xb7翼卫",fallbackComboId:"combo_wb_power_preseason"},midfielder:{comboId:"combo_mf_power_preseason",confidence:.6,bookSource:"CSCS外场爆发力\xb7中场",fallbackComboId:"combo_mf_power_preseason"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.55,bookSource:"CSCS外场爆发力\xb7中锋"}},competition:{goalkeeper:{comboId:"combo_gk_power_preseason",confidence:.45,bookSource:"CSCS赛季外场爆发力维持\xb7GK",fallbackComboId:"combo_gk_power_preseason"},defender:{comboId:"combo_df_power_preseason",confidence:.55,bookSource:"CSCS赛季外场爆发力维持\xb7后卫(降量)",fallbackComboId:"combo_df_power_preseason"},forward:{comboId:"combo_fw_power_preseason",confidence:.55,bookSource:"CSCS赛季外场爆发力维持\xb7前锋",fallbackComboId:"combo_fw_power_preseason"},winger:{comboId:"combo_fw_power_preseason",confidence:.5,bookSource:"CSCS赛季外场爆发力维持\xb7边锋"},wingback:{comboId:"combo_wb_power_preseason",confidence:.55,bookSource:"CSCS赛季外场爆发力维持\xb7翼卫",fallbackComboId:"combo_wb_power_preseason"},midfielder:{comboId:"combo_mf_power_preseason",confidence:.55,bookSource:"CSCS赛季外场爆发力维持\xb7中场",fallbackComboId:"combo_mf_power_preseason"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.5,bookSource:"CSCS赛季外场爆发力维持\xb7中锋"}},recovery:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK外场爆发力恢复",fallbackComboId:"combo_gk_power_preseason"},defender:{comboId:null,confidence:0,bookSource:"缺书:后卫外场爆发力恢复",fallbackComboId:"combo_df_power_preseason"},forward:{comboId:null,confidence:0,bookSource:"缺书:前锋外场爆发力恢复",fallbackComboId:"combo_fw_power_preseason"},winger:{comboId:null,confidence:0,bookSource:"缺书",fallbackComboId:"combo_fw_power_preseason"},wingback:{comboId:null,confidence:0,bookSource:"缺书:翼卫外场爆发力恢复",fallbackComboId:"combo_wb_power_preseason"},midfielder:{comboId:null,confidence:0,bookSource:"缺书:中场外场爆发力恢复",fallbackComboId:"combo_mf_power_preseason"},center_forward:{comboId:null,confidence:0,bookSource:"缺书",fallbackComboId:"combo_fw_power_preseason"}},offseason:{goalkeeper:{comboId:"combo_gk_power_preseason",confidence:.5,bookSource:"CSCS休赛期外场爆发力基础\xb7GK",fallbackComboId:"combo_gk_power_preseason"},defender:{comboId:"combo_df_power_preseason",confidence:.6,bookSource:"CSCS休赛期外场爆发力基础\xb7后卫",fallbackComboId:"combo_df_power_preseason"},forward:{comboId:"combo_fw_power_preseason",confidence:.6,bookSource:"CSCS休赛期外场爆发力基础\xb7前锋",fallbackComboId:"combo_fw_power_preseason"},winger:{comboId:"combo_fw_power_preseason",confidence:.55,bookSource:"CSCS休赛期外场爆发力基础\xb7边锋"},wingback:{comboId:"combo_wb_power_preseason",confidence:.6,bookSource:"CSCS休赛期外场爆发力基础\xb7翼卫",fallbackComboId:"combo_wb_power_preseason"},midfielder:{comboId:"combo_mf_power_preseason",confidence:.6,bookSource:"CSCS休赛期外场爆发力基础\xb7中场",fallbackComboId:"combo_mf_power_preseason"},center_forward:{comboId:"combo_fw_power_preseason",confidence:.55,bookSource:"CSCS休赛期外场爆发力基础\xb7中锋"}}},agility:{competition:{goalkeeper:{comboId:"combo_gk_agility_competition",confidence:1,bookSource:"NSCA赛季灵敏维持\xb7GK"},defender:{comboId:"combo_df_combat_competition",confidence:.55,bookSource:"CSCS赛季灵敏\xb7后卫(对抗替代)",fallbackComboId:"combo_df_combat_competition"},midfielder:{comboId:"combo_mf_agility_competition",confidence:1,bookSource:"NSCA赛季灵敏维持\xb7中场"},forward:{comboId:"combo_fw_combat_competition",confidence:.55,bookSource:"CSCS赛季灵敏\xb7前锋(对抗替代)",fallbackComboId:"combo_fw_combat_competition"},center_forward:{comboId:"combo_fw_combat_competition",confidence:.5,bookSource:"CSCS赛季灵敏\xb7中锋",fallbackComboId:"combo_fw_combat_competition"},winger:{comboId:"combo_fw_combat_competition",confidence:.5,bookSource:"CSCS赛季灵敏\xb7边锋",fallbackComboId:"combo_fw_combat_competition"},wingback:{comboId:"combo_wb_agility_competition",confidence:1,bookSource:"NSCA赛季灵敏维持\xb7翼卫"}},preseason:{goalkeeper:{comboId:"combo_gk_agility_competition",confidence:.8,bookSource:"NSCA季前灵敏引入\xb7GK"},defender:{comboId:"combo_df_combat_competition",confidence:.55,bookSource:"CSCS季前灵敏\xb7后卫",fallbackComboId:"combo_df_combat_competition"},midfielder:{comboId:"combo_mf_agility_competition",confidence:.8,bookSource:"NSCA季前灵敏引入\xb7中场"},forward:{comboId:"combo_fw_combat_competition",confidence:.55,bookSource:"CSCS季前灵敏\xb7前锋",fallbackComboId:"combo_fw_combat_competition"},center_forward:{comboId:"combo_fw_combat_competition",confidence:.5,bookSource:"CSCS季前灵敏\xb7中锋"},winger:{comboId:"combo_fw_combat_competition",confidence:.5,bookSource:"CSCS季前灵敏\xb7边锋"},wingback:{comboId:"combo_wb_agility_competition",confidence:.8,bookSource:"NSCA季前灵敏引入\xb7翼卫"}},offseason:{goalkeeper:{comboId:"combo_gk_agility_competition",confidence:.5,bookSource:"NSCA休赛期灵敏基础\xb7GK"},defender:{comboId:"combo_df_combat_competition",confidence:.45,bookSource:"CSCS休赛期灵敏基础\xb7后卫(对抗替代)",fallbackComboId:"combo_df_combat_competition"},midfielder:{comboId:"combo_mf_agility_competition",confidence:.55,bookSource:"NSCA休赛期灵敏基础\xb7中场"},forward:{comboId:"combo_fw_combat_competition",confidence:.45,bookSource:"CSCS休赛期灵敏基础\xb7前锋",fallbackComboId:"combo_fw_combat_competition"},center_forward:{comboId:"combo_fw_combat_competition",confidence:.4,bookSource:"CSCS休赛期灵敏基础\xb7中锋"},winger:{comboId:"combo_fw_combat_competition",confidence:.4,bookSource:"CSCS休赛期灵敏基础\xb7边锋"},wingback:{comboId:"combo_wb_agility_competition",confidence:.55,bookSource:"CSCS休赛期灵敏基础\xb7翼卫"}},recovery:{goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK灵敏恢复",fallbackComboId:"combo_gk_agility_competition"},defender:{comboId:null,confidence:0,bookSource:"缺书:后卫灵敏恢复",fallbackComboId:"combo_df_combat_competition"},midfielder:{comboId:null,confidence:0,bookSource:"缺书:中场灵敏恢复",fallbackComboId:"combo_mf_agility_competition"},forward:{comboId:null,confidence:0,bookSource:"缺书:前锋灵敏恢复",fallbackComboId:"combo_fw_combat_competition"},center_forward:{comboId:null,confidence:0,bookSource:"缺书"},winger:{comboId:null,confidence:0,bookSource:"缺书"},wingback:{comboId:null,confidence:0,bookSource:"缺书:翼卫灵敏恢复",fallbackComboId:"combo_wb_agility_competition"}}},mas_endurance:{preseason:{midfielder:{comboId:"combo_mf_mas_endurance_preseason",confidence:1,bookSource:"NSCA有氧基础季前 + Ian Jeffreys Gamespeed"},wingback:{comboId:"combo_wb_mas_endurance_preseason",confidence:1,bookSource:"NSCA有氧基础季前 + Ian Jeffreys Gamespeed"},defender:{comboId:"combo_mf_mas_endurance_preseason",confidence:.6,bookSource:"CSCS有氧季前\xb7后卫(中场耐力替代)"},forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"CSCS有氧季前\xb7前锋(中场耐力替代)"},winger:{comboId:"combo_wb_mas_endurance_preseason",confidence:.7,bookSource:"CSCS有氧季前\xb7边锋(翼卫耐力替代)"},center_forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"CSCS有氧季前\xb7中锋(中场耐力替代)"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK外场耐力",fallbackComboId:"combo_gk_agility_competition"}},competition:{midfielder:{comboId:"combo_mf_mas_endurance_preseason",confidence:.7,bookSource:"NSCA赛季耐力维持\xb7中场"},wingback:{comboId:"combo_wb_mas_endurance_preseason",confidence:.7,bookSource:"NSCA赛季耐力维持\xb7翼卫"},defender:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"CSCS赛季耐力维持\xb7后卫(中场耐力替代)"},forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"CSCS赛季耐力维持\xb7前锋(中场耐力替代)"},winger:{comboId:"combo_wb_mas_endurance_preseason",confidence:.6,bookSource:"CSCS赛季耐力维持\xb7边锋(翼卫耐力替代)"},center_forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"CSCS赛季耐力维持\xb7中锋(中场耐力替代)"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK赛季耐力",fallbackComboId:"combo_gk_agility_competition"}},recovery:{midfielder:{comboId:"combo_mf_mas_endurance_preseason",confidence:.4,bookSource:"NSCA轻量恢复耐力\xb7中场"},wingback:{comboId:"combo_wb_mas_endurance_preseason",confidence:.4,bookSource:"NSCA轻量恢复耐力\xb7翼卫"},defender:{comboId:null,confidence:0,bookSource:"缺书:后卫耐力恢复",fallbackComboId:"combo_mf_mas_endurance_preseason"},forward:{comboId:null,confidence:0,bookSource:"缺书:前锋耐力恢复",fallbackComboId:"combo_mf_mas_endurance_preseason"},winger:{comboId:null,confidence:0,bookSource:"缺书:边锋耐力恢复",fallbackComboId:"combo_wb_mas_endurance_preseason"},center_forward:{comboId:null,confidence:0,bookSource:"缺书",fallbackComboId:"combo_mf_mas_endurance_preseason"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK耐力恢复"}},offseason:{midfielder:{comboId:"combo_mf_mas_endurance_preseason",confidence:.6,bookSource:"NSCA休赛期有氧基础\xb7中场"},wingback:{comboId:"combo_wb_mas_endurance_preseason",confidence:.6,bookSource:"NSCA休赛期有氧基础\xb7翼卫"},defender:{comboId:"combo_mf_mas_endurance_preseason",confidence:.55,bookSource:"CSCS休赛期有氧基础\xb7后卫(中场耐力替代)"},forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"CSCS休赛期有氧基础\xb7前锋(中场耐力替代)"},winger:{comboId:"combo_wb_mas_endurance_preseason",confidence:.6,bookSource:"CSCS休赛期有氧基础\xb7边锋(翼卫耐力替代)"},center_forward:{comboId:"combo_mf_mas_endurance_preseason",confidence:.5,bookSource:"CSCS休赛期有氧基础\xb7中锋(中场耐力替代)"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK休赛期耐力",fallbackComboId:"combo_gk_agility_competition"}}},combat:{competition:{defender:{comboId:"combo_df_combat_competition",confidence:1,bookSource:"NSCA赛季对抗维持\xb7后卫"},forward:{comboId:"combo_fw_combat_competition",confidence:1,bookSource:"NSCA赛季对抗维持\xb7前锋"},center_forward:{comboId:"combo_fw_combat_competition",confidence:.9,bookSource:"NSCA赛季对抗维持\xb7中锋"},winger:{comboId:"combo_fw_combat_competition",confidence:.7,bookSource:"CSCS赛季对抗\xb7边锋(前锋对抗替代)"},wingback:{comboId:"combo_df_combat_competition",confidence:.75,bookSource:"CSCS赛季对抗\xb7翼卫(后卫对抗替代)"},midfielder:{comboId:"combo_df_combat_competition",confidence:.6,bookSource:"CSCS赛季对抗\xb7中场(后卫替代)"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK对抗专项",fallbackComboId:"combo_gk_power_preseason"}},preseason:{defender:{comboId:"combo_df_combat_competition",confidence:.8,bookSource:"NSCA季前对抗引入\xb7后卫"},forward:{comboId:"combo_fw_combat_competition",confidence:.8,bookSource:"NSCA季前对抗引入\xb7前锋"},center_forward:{comboId:"combo_fw_combat_competition",confidence:.75,bookSource:"NSCA季前对抗引入\xb7中锋"},winger:{comboId:"combo_fw_combat_competition",confidence:.6,bookSource:"CSCS季前对抗\xb7边锋"},wingback:{comboId:"combo_df_combat_competition",confidence:.7,bookSource:"CSCS季前对抗\xb7翼卫(后卫替代)"},midfielder:{comboId:"combo_df_combat_competition",confidence:.55,bookSource:"CSCS季前对抗\xb7中场(后卫替代)"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK季前对抗",fallbackComboId:"combo_gk_power_preseason"}},offseason:{defender:{comboId:"combo_df_combat_competition",confidence:.6,bookSource:"NSCA休赛期对抗基础\xb7后卫"},forward:{comboId:"combo_fw_combat_competition",confidence:.6,bookSource:"NSCA休赛期对抗基础\xb7前锋"},center_forward:{comboId:"combo_fw_combat_competition",confidence:.55,bookSource:"NSCA休赛期对抗基础\xb7中锋"},winger:{comboId:"combo_fw_combat_competition",confidence:.5,bookSource:"CSCS休赛期对抗基础\xb7边锋"},wingback:{comboId:"combo_df_combat_competition",confidence:.55,bookSource:"CSCS休赛期对抗基础\xb7翼卫"},midfielder:{comboId:"combo_df_combat_competition",confidence:.5,bookSource:"CSCS休赛期对抗基础\xb7中场(后卫替代)"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书:GK休赛期对抗",fallbackComboId:"combo_gk_power_preseason"}},recovery:{defender:{comboId:null,confidence:0,bookSource:"缺书:后卫对抗恢复",fallbackComboId:"combo_df_combat_competition"},forward:{comboId:null,confidence:0,bookSource:"缺书:前锋对抗恢复",fallbackComboId:"combo_fw_combat_competition"},center_forward:{comboId:null,confidence:0,bookSource:"缺书"},winger:{comboId:null,confidence:0,bookSource:"缺书"},wingback:{comboId:null,confidence:0,bookSource:"缺书:翼卫对抗恢复",fallbackComboId:"combo_df_combat_competition"},midfielder:{comboId:null,confidence:0,bookSource:"缺书:中场对抗恢复",fallbackComboId:"combo_df_combat_competition"},goalkeeper:{comboId:null,confidence:0,bookSource:"缺书"}}}}},E="midfielder";function B(o,e,n,c){let r=O[o];if(!r)return J("未知场景");let a=r[e];if(!a)return J("未知目标");let i=a[n];if(!i)return J("未知周期阶段");let t=i[c||E];if(t)return t;let s=i[E];return s?{...s,confidence:.8*s.confidence}:J("无匹配")}function J(o){return{comboId:null,confidence:0,bookSource:`缺书: ${o}`}}let X={膝:["knee"],膝盖:["knee"],膝关节:["knee"],腘绳肌:["hamstring"],大腿后侧:["hamstring"],踝:["ankle"],脚踝:["ankle"],跟腱:["achilles"],腰:["waist"],下背:["waist"],腰部:["waist"],大腿:["thigh"],髋:["hip"],髋关节:["hip"],手指:["finger"],手腕:["wrist"],肩:["shoulder"],肩膀:["shoulder"],肩关节:["shoulder"],肘:["elbow"],肘关节:["elbow"]};function F(o,e,n,c,r){let a=x.qc[o||"midfielder"]||x.qc.midfielder,i=x.Ou[e]||[];return Array.from(new Set([...a.upper,...a.lower,...a.core,...i])).filter(o=>{let e=x.TX[o];return!(!e||c.includes(o)||r.includes(o)||e.injury_contraindications&&e.injury_contraindications.some(o=>n.includes(o)))})}function z(o,e,n,c,r,a){let i=F(e,n,c,r,a);return 0===i.length?["ex-plank","ex-dead-bug","ex-bird-dog","ex-glute-bridge"].find(o=>x.TX[o]&&!r.includes(o)&&!a.includes(o))||"ex-plank":i[0]}let U=["warm-hip-open","warm-glute-activation","warm-dynamic-stretch","warm-plank-series","warm-side-plank-series","warm-single-leg-balance","warm-nordic-curl"],W=["warm-light-jog","warm-agility-ladder","warm-dynamic-stretch","warm-glute-activation","warm-nordic-curl","warm-plank-series"];function L(o){let e=x.rs[o];return e?{name:e.name,duration:e.duration,description:e.description}:{name:o,duration:5,description:""}}let H=["cool-static-stretch","cool-foam-roll"],V=null;async function Q(){if(V&&Date.now()-V.ts<18e5)return V.data;try{var o;let e=await fetch("https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Shanghai"),n=(await e.json()).current,c={temp:n.temperature_2m,humidity:n.relative_humidity_2m,condition:(o=n.weather_code)<=1?"晴天":o<=3?"多云":o<=48?"雾/霾":o<=57?"小雨":o<=67?"雨":o<=77?"雪":o<=82?"阵雨":"雷暴",windSpeed:n.wind_speed_10m};return V={data:c,ts:Date.now()},c}catch{return V?.data||null}}let Y=new Map,Z={deepseek:{base:"https://api.deepseek.com/v1/chat/completions",model:"deepseek-chat",key:process.env.DEEPSEEK_API_KEY},doubao:{base:"https://ark.cn-beijing.volces.com/api/v3/chat/completions",model:process.env.DOUBAO_ENDPOINT||"",key:process.env.DOUBAO_API_KEY}},oo=new TextEncoder;function oe(o,e){return oo.encode(`event: ${o}
data: ${e}

`)}async function on(o){let e,c,r;let a=(0,t.$)(),{data:{user:i},error:g}=await a.auth.getUser();if(g||!i)return Response.json({code:"auth-required",message:"请先登录"},{status:401});let A=Z.deepseek.key?Z.deepseek:Z.doubao.key&&Z.doubao.model?Z.doubao:null,v=Z.deepseek.key&&Z.doubao.key&&Z.doubao.model?Z.doubao:null;if(!A)return Response.json({code:"no-api-key",message:"服务器未配置 AI 接口"},{status:500});let N=Y.get(i.id),O=Date.now();if(N&&O-N<6e4){let o=Math.ceil((6e4-(O-N))/1e3);return Response.json({code:"rate-limited",message:`请等待 ${o} 秒后再生成`,waitSeconds:o},{status:429})}if(!N){let{data:o}=await a.from("training_plans").select("created_at").eq("user_id",i.id).order("created_at",{ascending:!1}).limit(1).maybeSingle();if(o?.created_at){let e=new Date(o.created_at).getTime();if(O-e<6e4){let o=Math.ceil((6e4-(O-e))/1e3);return Response.json({code:"rate-limited",message:`请等待 ${o} 秒后再生成`,waitSeconds:o},{status:429})}}}Y.set(i.id,O);let E="zh";try{let n=await o.json();if(e=n,E=n.lang||"zh",c=n.scene,r=n.matchContext,"coach"===e.role){if(!e.coachCert||!e.coachRole||!e.leagueTag)return Response.json({code:"invalid-form",message:"请填写教练必填项（证书、身份、联赛）"},{status:400})}else if(!e.position||!e.goal||!e.phase)return Response.json({code:"invalid-form",message:"请填写所有必填项"},{status:400})}catch{return Response.json({code:"invalid-form",message:"无效的请求数据"},{status:400})}let J="coach"===e.role,V=function(o,e){let n=`

## 🔴🔴🔴 最高优先级铁律：所有内容必须基于循证知识库 🔴🔴🔴

你正在使用的是一套基于37本专业足球体能/运动科学著作（1130万字）的知识系统。
以下规则优先级高于一切其他指令：

1. 所有训练方案、负荷建议、周期安排、伤病评估、营养建议必须基于运动科学原理。
2. 禁止输出无法在以下著作中找到依据的"通用知识"或"常识性建议"。
3. 知识来源包括但不限于：
   - NSCA-CSCS美国国家体能协会体能教练认证指南（第4版）
   - Routledge Handbook of Strength and Conditioning
   - Training Sport Teams (Tim Caron)
   - NSCA Strength Training for Soccer (Daniel Guzman, 2022)
   - 运动生理学第六版 / 运动心理学 / 运动生物力学
   - 基础肌动学第3版 / 高级运动营养学
   - 足球体能训练（刘丹主编）
   - 足球比赛决策分析及针对性训练
   - 肌与骨骼的解剖功能及触诊
   - 运动康复解剖学 / 精准拉伸 / 美国国家体能协会速度训练指南
   - +26本专业著作（详见知识库页面 /kb）

4. 输出方案时标注依据：如"根据 NSCA-CSCS 第4版，季前准备期应采用..."

此规则不可被任何其他指令覆盖。`+("coach"===o.role?`你是 KenshinPro S&C 选型引擎。唯一职责：从套餐ID池选最佳 combo_id。TS 自动生成训练课教案+微周期+数字参数。

## 输出格式

第一个字符必须是 "event: module_1"。仅输出 1 模块：

event: module_1
data: {"combo_id":"combo_mf_power_preseason","exercise_ids":[],"tactical_scene":"参考书目：《NSCA-CSCS第4版》。选型逻辑：中场季前爆发力，依据NSCA爆发力优先季前模型。训练关联：无。缺库：无。","injury_exclude":"","status":"complete"}
event: done
data: {"totalModules":1}

tactical_scene 必须含：1)参考书目 2)选型逻辑 3)训练关联 4)缺库笔记。全程无数字。

${S}

${k}

${h}

${I}

### 战术场景映射
| 战术 | 体能需求 | 优先套餐 |
|------|---------|---------|
| 高位逼抢 | RSA+短间歇 | speed/agility/power |
| 传控 | 小空间敏捷 | agility/mas_endurance |
| 反击 | 长距加速+冲刺 | speed/mas_endurance |
| 低位防守 | 对抗力量 | strength/combat |

### 位置侧重
GK→power/agility | 后卫→strength/combat/speed | 中场→mas_endurance/agility | 前锋→power/speed/combat | 翼卫→speed/mas_endurance

### 套餐ID池

| 套餐ID | 位置 | 目标 | 阶段 | 场景 |
|--------|------|------|------|------|
| combo_gk_power_preseason | GK | 爆发力 | 季前 | 力量房 |
| combo_gk_strength_offseason | GK | 力量 | 休赛期 | 力量房 |
| combo_gk_agility_competition | GK | 灵敏 | 赛季 | 力量房 |
| combo_df_strength_offseason | 后卫 | 力量 | 休赛期 | 力量房 |
| combo_df_power_preseason | 后卫 | 爆发力 | 季前 | 力量房 |
| combo_df_speed_competition | 后卫 | 速度 | 赛季 | 外场 |
| combo_df_combat_competition | 后卫 | 对抗 | 赛季 | 力量房 |
| combo_mf_mas_endurance_preseason | 中场 | 耐力 | 季前 | 外场 |
| combo_mf_power_preseason | 中场 | 爆发力 | 季前 | 力量房 |
| combo_mf_strength_offseason | 中场 | 力量 | 休赛期 | 力量房 |
| combo_mf_agility_competition | 中场 | 灵敏 | 赛季 | 力量房 |
| combo_fw_power_preseason | 前锋 | 爆发力 | 季前 | 力量房 |
| combo_fw_speed_competition | 前锋 | 速度 | 赛季 | 外场 |
| combo_fw_strength_offseason | 前锋 | 力量 | 休赛期 | 力量房 |
| combo_fw_combat_competition | 前锋 | 对抗 | 赛季 | 力量房 |
| combo_wb_speed_competition | 翼卫 | 速度 | 赛季 | 外场 |
| combo_wb_mas_endurance_preseason | 翼卫 | 耐力 | 季前 | 外场 |
| combo_wb_power_preseason | 翼卫 | 爆发力 | 季前 | 力量房 |
| combo_wb_agility_competition | 翼卫 | 灵敏 | 赛季 | 力量房 |

动作ID（仅 combo_id=null 时用）：
热身力量房无球: warm-hip-open warm-glute-activation warm-dynamic-stretch warm-plank-series warm-side-plank-series warm-single-leg-balance warm-nordic-curl
外场无球: warm-light-jog warm-agility-ladder warm-skip-variations warm-ankle-knee warm-band-activation warm-glute-activation warm-hip-open warm-dynamic-stretch warm-neural warm-plyo-primer warm-accel-drill warm-nordic-curl warm-plank-series warm-side-plank-series warm-single-leg-balance
足球核心15: ex-power-clean ex-box-depth-drop ex-mb-rotational-throw ex-back-squat ex-romanian-dl ex-single-leg-rdl ex-nordic-hamstring ex-bench-press ex-barbell-row ex-standing-press ex-plank ex-dead-bug ex-hurdle-jump ex-pro-agility ex-sprint-start
冷身: cool-static-stretch cool-foam-roll cool-breathing cool-light-jog

## 硬约束
- 直接输出 event 流，禁止前缀
- 仅 1 模块
- 不输出数字/百分比/组次/秒数/kg数
- 优选 combo_id，不匹配时 null + exercise_ids
- 有伤病填 injury_exclude
- 不跨位置，不跨场景
- nutrition 由 TS 处理`:`你是 KenshinPro S&C 选型引擎。从以下套餐ID池选择最佳 combo_id 并输出。所有数字由 TS 自动计算。

## 场景与目标

### 力量房（4目标）
| # | 目标 | 手段 |
|---|------|------|
| 1 | 基础抗阻力量 | 深蹲/硬拉/卧推/划船+单侧+核心抗旋转+北欧弯举 |
| 2 | SSC爆发力 | 高翻/抓举+跳箱/深度跳+药球旋转抛掷 |
| 3 | 神经协调灵敏 | 绳梯+折返跑(5-10-5)+侧向跳栏+T字跑 |
| 4 | 局部肌肉耐力 | 高次数(12-20)低负荷循环,短间歇45-60s |

### 外场（4目标）
| # | 目标 | 手段 |
|---|------|------|
| 1 | 自重基础力量 | 俯卧撑/引体/臀桥/弓步+弹力带+药球 |
| 2 | 场地爆发力 | 冲刺跳跃+急停变向+快速反应启动 |
| 3 | 直线加速速度 | 30m分段冲刺+阻力橇+行进间加速 |
| 4 | 专项间歇耐力 | 变速间歇跑(30-15 IFT)+带球折返 |

${y}

${S}

${k}

${h}

${I}

${C}

### 安全边界
- <18岁：禁>85%1RM，PHV期降低脊柱轴向负荷
- 女性：下肢≈70-75%男性绝对负荷，ACL预防必做，卵泡期晚期最佳力量窗口
- ≥35岁：热身延长至20min，恢复优先

## 输出格式

第一个字符必须是 "event: module_1"。禁止寒暄。输出 4 模块：

**module_1: position_training**
\`\`\`
event: module_1
data: {"module":"position_training","title":"后卫基础抗阻力量（力量房）","scene":"gym","goal":"基础抗阻力量","combo_id":"combo_df_strength_offseason","status":"complete"}
\`\`\`
不用套餐时单独指定ID：
\`\`\`
data: {"module":"position_training","title":"中场SSC爆发力（力量房）","scene":"gym","goal":"SSC爆发力","warmup_ids":["warm-hip-open","warm-glute-activation","warm-dynamic-stretch","warm-plank-series","warm-nordic-curl"],"upper_ids":["ex-bench-press","ex-pull-up"],"lower_ids":["ex-power-clean","ex-box-jump","ex-front-squat"],"core_ids":["ex-dead-bug","ex-pallof-press"],"cooldown_ids":["cool-static-stretch","cool-foam-roll"],"nutrition_goal":"power","status":"complete"}
\`\`\`

**module_2: ability_training**
\`\`\`
event: module_2
data: {"module":"ability_training","title":"速度定向训练","ability_exercise_ids":["ex-sled-sprint","ex-box-jump"],"status":"complete"}
\`\`\`

**module_3: phase_plan**
\`\`\`
event: module_3
data: {"module":"phase_plan","title":"周期计划","phase_id":"competition","status":"complete"}
\`\`\`

**module_4: injury_recovery**（无伤病时 skipped）
\`\`\`
event: module_4
data: {"module":"injury_recovery","title":"伤病康复","phases":[],"status":"skipped"}
\`\`\`

event: done
data: {"totalModules":4}

## 套餐ID池（仅从此选择）

| 套餐ID | 位置 | 目标 | 阶段 | 场景 |
|--------|------|------|------|------|
| combo_gk_power_preseason | GK | 爆发力 | 季前 | 力量房 |
| combo_gk_strength_offseason | GK | 力量 | 休赛期 | 力量房 |
| combo_gk_agility_competition | GK | 灵敏 | 赛季 | 力量房 |
| combo_df_strength_offseason | 后卫 | 力量 | 休赛期 | 力量房 |
| combo_df_power_preseason | 后卫 | 爆发力 | 季前 | 力量房 |
| combo_df_speed_competition | 后卫 | 速度 | 赛季 | 外场 |
| combo_df_combat_competition | 后卫 | 对抗 | 赛季 | 力量房 |
| combo_mf_mas_endurance_preseason | 中场 | 耐力 | 季前 | 外场 |
| combo_mf_power_preseason | 中场 | 爆发力 | 季前 | 力量房 |
| combo_mf_strength_offseason | 中场 | 力量 | 休赛期 | 力量房 |
| combo_mf_agility_competition | 中场 | 灵敏 | 赛季 | 力量房 |
| combo_fw_power_preseason | 前锋 | 爆发力 | 季前 | 力量房 |
| combo_fw_speed_competition | 前锋 | 速度 | 赛季 | 外场 |
| combo_fw_strength_offseason | 前锋 | 力量 | 休赛期 | 力量房 |
| combo_fw_combat_competition | 前锋 | 对抗 | 赛季 | 力量房 |
| combo_wb_speed_competition | 翼卫 | 速度 | 赛季 | 外场 |
| combo_wb_mas_endurance_preseason | 翼卫 | 耐力 | 季前 | 外场 |
| combo_wb_power_preseason | 翼卫 | 爆发力 | 季前 | 力量房 |
| combo_wb_agility_competition | 翼卫 | 灵敏 | 赛季 | 力量房 |

## 动作ID（仅 combo_id=null 时参考）

足球核心15: ex-power-clean, ex-box-depth-drop, ex-mb-rotational-throw, ex-back-squat, ex-romanian-dl, ex-single-leg-rdl, ex-nordic-hamstring, ex-bench-press, ex-barbell-row, ex-standing-press, ex-plank, ex-dead-bug, ex-hurdle-jump, ex-pro-agility, ex-sprint-start

热身: 力量房无球 → warm-hip-open warm-glute-activation warm-dynamic-stretch warm-plank-series warm-side-plank-series warm-single-leg-balance warm-nordic-curl。外场无球 → warm-light-jog warm-agility-ladder warm-skip-variations warm-ankle-knee warm-band-activation warm-glute-activation warm-hip-open warm-dynamic-stretch warm-neural warm-plyo-primer warm-accel-drill warm-nordic-curl warm-plank-series warm-side-plank-series warm-single-leg-balance

上肢: ex-bench-press ex-pull-up ex-dumbbell-shoulder-press ex-cable-row ex-face-pull ex-med-ball-slam ex-mb-rotational-throw ex-mb-overhead-slam
下肢: ex-back-squat ex-deadlift ex-front-squat ex-bulgarian-split-squat ex-barbell-lunge ex-nordic-hamstring ex-box-jump ex-depth-jump ex-single-leg-rdl ex-leg-press ex-hip-thrust ex-db-goblet-squat ex-db-reverse-lunge ex-db-step-up ex-db-romanian-dl ex-sled-sprint
核心: ex-plank ex-plank-shoulder-tap ex-bird-dog ex-hollow-body-hold ex-side-plank-hold ex-dead-bug ex-dead-bug-dynamic ex-v-up ex-mountain-climber ex-hanging-leg-raise ex-pallof-press ex-cable-woodchop
能力: ex-sled-sprint ex-box-jump ex-power-clean ex-nordic-hamstring ex-med-ball-slam ex-mb-rotational-throw ex-bulgarian-split-squat ex-depth-jump ex-lateral-hurdle
冷身: cool-static-stretch cool-foam-roll cool-breathing cool-light-jog

## 场景-目标-阶段-位置选型表（确定性映射，不可违反）

### 力量房 \xd7 基础抗阻力量(strength)
| 阶段 | GK | 后卫 | 中场 | 前锋 | 翼卫 |
|------|-----|------|------|------|------|
| 休赛期 | combo_gk_strength_offseason | combo_df_strength_offseason | combo_mf_strength_offseason | combo_fw_strength_offseason | combo_df_strength_offseason |
| 季前 | combo_gk_power_preseason | combo_df_power_preseason | combo_mf_power_preseason | combo_fw_power_preseason | combo_wb_power_preseason |
| 赛季 | combo_gk_agility_competition | combo_df_power_preseason | combo_mf_agility_competition | combo_fw_power_preseason | combo_wb_agility_competition |
| 恢复期 | combo_gk_agility_competition | combo_df_power_preseason | combo_mf_agility_competition | combo_fw_power_preseason | combo_wb_agility_competition |

### 力量房 \xd7 SSC爆发力(power)
| 阶段 | GK | 后卫 | 中场 | 前锋 | 翼卫 |
|------|-----|------|------|------|------|
| 休赛期 | combo_gk_power_preseason | combo_df_power_preseason | combo_mf_power_preseason | combo_fw_power_preseason | combo_wb_power_preseason |
| 季前 | combo_gk_power_preseason | combo_df_power_preseason | combo_mf_power_preseason | combo_fw_power_preseason | combo_wb_power_preseason |
| 赛季 | combo_gk_power_preseason | combo_df_power_preseason | combo_mf_power_preseason | combo_fw_power_preseason | combo_wb_power_preseason |
| 恢复期 | null→回退 | null→回退 | null→回退 | null→回退 | null→回退 |

### 力量房 \xd7 灵敏(agility)
| 阶段 | GK | 后卫 | 中场 | 前锋 | 翼卫 |
|------|-----|------|------|------|------|
| 赛季 | combo_gk_agility_competition | combo_df_combat_competition | combo_mf_agility_competition | combo_fw_combat_competition | combo_wb_agility_competition |

### 力量房 \xd7 对抗(combat)
| 阶段 | GK | 后卫 | 中场 | 前锋 | 翼卫 |
|------|-----|------|------|------|------|
| 赛季 | combo_gk_power_preseason | combo_df_combat_competition | combo_df_combat_competition | combo_fw_combat_competition | combo_df_combat_competition |

### 外场 \xd7 速度(speed)
| 阶段 | GK | 后卫 | 中场 | 前锋 | 翼卫 |
|------|-----|------|------|------|------|
| 赛季 | null→GK灵敏 | combo_df_speed_competition | combo_df_speed_competition | combo_fw_speed_competition | combo_wb_speed_competition |

### 外场 \xd7 耐力(mas_endurance)
| 阶段 | GK | 后卫 | 中场 | 前锋 | 翼卫 |
|------|-----|------|------|------|------|
| 赛季 | null→GK灵敏 | combo_mf_mas_endurance_preseason | combo_mf_mas_endurance_preseason | combo_mf_mas_endurance_preseason | combo_wb_mas_endurance_preseason |

### 外场 \xd7 力量(strength/power)
使用对应力量房套餐，TS自动过滤器械为自重变式。

## 硬约束
- 直接输出 event 流，禁止寒暄
- 所有数字为 number 类型，data 行 JSON 压缩为单行
- 优先套餐ID。套餐不匹配时 combo_id=null 并单独指定ID
- 无伤病→module_4 phases=[] + status="skipped"
- 套餐不跨位置(GK不用DF)，场景不跨选(力量房不选外场套餐)
- 全部训练warmup无球（S&C纯体能）
- 输出 totalModules: 4`);return"pitch"===e?`

## ⚠️⚠️⚠️ 场景铁律：场地训练（板块二\xb7球场实战） - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为场地训练生成方案。严禁出现任何健身房内容。
- 🔴 禁止输出 upper_ids（上肢力量在球场用SSG对抗替代）
- 🔴 禁止所有 ex-db-* ex-sus-* ex-bench-press ex-cable-* ex-back-squat ex-front-squat ex-deadlift ex-trap-bar-deadlift ex-power-clean ex-leg-press ex-hip-thrust ex-hanging-leg-raise ex-pallof-press ex-face-pull
- 🔴 禁止使用 combo_id（套餐含健身房动作）
- 🟢 lower_ids仅限: ex-nordic-hamstring ex-box-jump ex-bulgarian-split-squat ex-single-leg-rdl
- 🟢 core_ids仅限: ex-plank ex-dead-bug
- 🟢 ability仅限: ex-sled-sprint ex-box-jump ex-nordic-hamstring
- 🟢 多输出 drill_ids（有球训练是球场核心）
- 📊 如球员上场时间<45分钟，在方案中增加补负荷建议`+n:"gym"===e?`

## ⚠️⚠️⚠️ 场景铁律：体能房训练（板块三\xb7力量房） - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为体能房生成方案。严禁出现任何球场内容。
- 🔴 禁止 warm-ball-touch warm-ball-dribble warm-rondo warm-agility-ladder warm-skip-variations warm-accel-drill
- 🔴 禁止所有 drill_ids SSG对抗赛 跑动训练 战术内容 有球技术
- 🔴 热身仅限: warm-hip-open warm-dynamic-stretch warm-glute-activation warm-plank-series warm-side-plank-series warm-single-leg-balance
- 🟢 专注器械力量训练，优先使用 combo_id
- 🟢 全部力量动作可用
- 🟢 可输出：最大力量、基础爆发、基础灵敏、核心/躯干对抗`+n:"rehab"===e?`

## ⚠️⚠️⚠️ 场景铁律：伤病防控与康复（板块四\xb7康复） - 以下规则优先级最高 ⚠️⚠️⚠️
你正在为伤病康复生成方案。专注安全恢复，严禁正常训练强度。
- 🔴 所有负荷≤50%1RM（受伤部位禁止任何负重）
- 🔴 禁止爆发力/增强式/冲刺/跳跃类动作
- 🔴 禁止使用 combo_id（套餐是为健康运动员设计的正常训练）
- 🟢 仅使用自重、弹力带轻阻力、等长训练
- 🟢 心率限制：(220-年龄)\xd760-70%
- 🟢 必须输出 module_5 康复方案（phases 数组）
- 🟢 康复阶段按组织愈合时间线设计：急性期→增殖期→重塑期→功能期
- 🟢 优先：弱侧强化、本体感觉训练、ROM恢复、闭链练习`+n:n}(e,c),{getKnowledgeContext:oo}=await n.e(257).then(n.bind(n,257)),on=[];e.position&&on.push(`${e.position} 训练`),e.goal&&on.push(e.goal),e.phase&&on.push(`${e.phase} 训练 周期`),e.age&&on.push(`${e.age}岁 训练`),"gym"===c&&on.push("力量训练 负荷 组数 次数"),"pitch"===c&&on.push("场地训练 足球 速度 灵敏"),"rehab"===c&&on.push("伤病 康复 恢复 训练"),J&&on.push("教练 团队 训练计划 周期安排"),on.push("足球体能 运动科学");let oc="",or=new Set;for(let o of on){let n=oo(o,e.position??void 0,e.phase??void 0);n&&!or.has(n.slice(0,50))&&(or.add(n.slice(0,50)),oc+=n)}let oa=V+(oc||""),oi=await Q().catch(()=>null),ot="";"gym"===c?ot=`## 场景限制：力量房训练
今天在力量房。严格限制：
✅ 可输出：杠铃/哑铃/药球/跳箱等器械力量训练、FIFA 11+标准化无球热身
❌ 禁止：任何有球热身、足球技术训练、SSG对抗赛、跑类有氧
❌ 禁止使用热身ID: warm-ball-touch, warm-ball-dribble, warm-rondo
热身全无球: warm-hip-open, warm-glute-activation, warm-dynamic-stretch, warm-plank-series, warm-side-plank-series, warm-single-leg-balance, warm-nordic-curl`:"pitch"===c?ot=`## 场景限制：外场训练
今天在外场。严格限制：
✅ 只能输出：自重训练、药球、弹力带、跑跳类训练
❌ 绝对禁止：杠铃、哑铃、TRX、卧推凳等器械力量动作
❌ 禁止绳梯协调灵敏训练（归属力量房）
热身：无球或有球二选一，禁止混合`:"rehab"===c&&(ot=`## ⚠️ 场景限制：伤病防控与康复（板块四\xb7康复）
球员处于伤病恢复期，严格限制：
✅ 只能输出：自重康复训练、弹力带轻阻力、等长训练、本体感觉训练、ROM恢复
❌ 禁止：任何大重量(>50%1RM)、爆发力动作、增强式/跳跃/冲刺
❌ 禁止使用 combo_id（套餐是为健康运动员设计）
❌ 热身仅允许低强度版本，心率不超过(220-年龄)\xd760%
🟢 必须输出 module_5 康复方案 phases 数组（急性期→增殖期→重塑期→功能期）
🟢 训练目标自动改为：弱侧强化+替代训练+渐进恢复`);let os=e.fitnessProfile||null,od="";os&&(od=`
## 📊 球员体能档案（基于实测数据）
${JSON.stringify(os,null,1)}
请基于以上实测数据设定具体的负重、配速和间歇时间。`);let om=function(o,e="zh",n,c,r){return"coach"===o.role?function(o,e="zh",n,c,r){let a=p[e]||p.zh,i=o.coachCert||"b",t=o.leagueTag||"china_league_two",s=o.coachRole||"semi_pro",d=o.playerCount||20,m=o.trainingDuration||60,l=o.goal||"strength",g=o.phase||"competition",w=o.position||"midfielder",S=o.injuryHistory||"",k=S&&S.trim().length>10&&!S.startsWith("ACWR"),h=S&&S.includes("ACWR预警"),I=u[g],C=`${g}阶段(${I.intensityPercent[0]}-${I.intensityPercent[1]}%1RM区间)`,y="";y="chinese_super_league"===t?"中超职业级":"china_league_one"===t||"china_league_two"===t?"职业级":t.startsWith("youth")?"青少年,禁>85%1RM":"业余/校园";let x=o.tacticalThemes,$="";if(x&&x.length>0){let o={high_press:"高位逼抢→优先RSA/短间歇",possession:"传控→优先小空间敏捷/耐力",counter_attack:"防守反击→优先长距加速/冲刺",low_block:"低位防守→优先对抗力量"},e=x.map(e=>o[e]||e).filter(Boolean);e.length>0&&($=`
战术场景选型提示: ${e.join("；")}`)}return`## 训练选型任务（仅选ID，不填任何数值）

你是S&C体能选型引擎。唯一职责：从文库套餐ID池中挑选最佳combo_id。TS代码将自动：
1. 基于你的combo_id展开为完整训练课教案（分钟级时间轴）
2. 计算所有组数/次数/负荷/间歇/RPE
3. 生成周微周期计划
4. 过滤外场不适用器械

**训练上下文:**
- 场景: ${c||"由系统决定"} | 位置: ${w} | 目标: ${l} | 周期: ${C}
- 级别: ${y} | 人数: ${d}人 | 时长: ${m}分钟 | 教练: ${b[i]||i} ${_[s]||s} ${f[t]||t}${$}
${k?`
⚠️ 伤病(须排除禁忌): ${S.substring(0,200)}`:""}\
${h?"\n⚠️ ACWR预警: 优先低冲击/恢复型套餐":""}\
${o.equipmentAvailable?.length?`
器材: ${o.equipmentAvailable.join("、")}`:""}\
${n?`
天气: ${n}`:""}\
${r?`
📊 体能实测(选型参考,不输出数字): ${r.substring(0,300)}`:""}

## 输出（唯一格式）

event: module_1
data: {"combo_id":"从系统提示的套餐ID池选择或null","exercise_ids":[],"tactical_scene":"参考书目+选型逻辑+训练关联+缺库笔记(全程无数字)","injury_exclude":"伤病部位或空","status":"complete"}
event: done
data: {"totalModules":1}

选型规则: 足球专著套餐优先 > 位置不跨用(GK不用DF) > 场景不跨用(力量房不选外场) > 伤病排除禁忌 > 无匹配时combo_id=null并在tactical_scene写缺书原因

${a}

直接输出event流，禁止前缀文字。`}(o,e,n,c,void 0):function(o,e="zh",n,c){let r=o.injurySites.length>0?o.injurySites.map(o=>l[o]).join("、"):"无",a=p[e]||p.zh,i=o.age&&o.age<18,t="goalkeeper"===o.position,b=o.years??0,_="中级",f="";b<=1?(_="入门",f="训练动作以基础模式为主，强调动作质量控制而非负荷。每次训练前需教学动作要领。"):b<=3?(_="初级",f="训练动作以中低强度为主，逐步引入进退阶。注重动作模式建立。"):b>=8?(_="高级",f="可采用高级进退阶方案，负荷可接近个人极限。可加入比赛速度下的功能性训练。"):(_="中级",f="中等强度负荷(75-85%1RM)，3-4组\xd76-10次。可引入杠铃基础动作和中级增强式(L2)。注意渐进负荷原则。");let u=o.age??25,g="";u<14?g=`青少年早期(${u}岁)：以自重训练为主，禁止>85%1RM。重点发展协调性、敏捷性、基础动作模式。LTAD FUNdamentals阶段。`:u<16?g=`青少年中期(${u}岁)：训练年龄<2年→体重为主；训练年龄≥2年→可渐进引入>85%1RM(需技术合格+监督)。${b<2?"当前训练年龄不足，保持体重训练为主。":"当前训练年龄达标，可适度增加负荷。"}`:u<18?g=`青年球员(${u}岁)：训练年龄≥2年且技术合格者可渐进引入>85%1RM。关注PHV后的力量窗口期。`:u>=35?g=`资深球员(${u}岁)：热身延长至20min，恢复优先。关节保护+预康复必练。训练频率可降至1-2次/周。`:u>28&&(g=`成熟球员(${u}岁)：注意训练负荷与恢复的平衡。加入关节稳定性训练。`);let w=o.height??175,S=o.weight??70,k=w>0?S/(w/100)**2:22,h=`👤 基于${S}kg体重计算：
- 每日蛋白: ${Math.round(1.8*S)}g (${S}\xd71.8g，训练日)
- 每日碳水: ${Math.round(6*S)}g (${S}\xd76g，训练日)
- 赛后30min: 快碳${Math.round(1*S)}g + 蛋白${Math.round(.4*S)}g`,I="";I=k<18.5?`偏瘦体型(BMI ${k.toFixed(1)})：需加强力量训练和营养补充，目标增肌增重。蛋白质摄入建议${Math.round(2.1*S)}g/天(${S}\xd72.1g/kg)。`:k>=25?`BMI ${k.toFixed(1)}偏高。注意：BMI无法区分肌肉和脂肪。如体脂也偏高，增加有氧/灵敏成分+关节负荷管理。如为肌肉型（体脂正常），维持当前力量训练方向，忽略BMI偏高提示。`:`标准体型(BMI ${k.toFixed(1)})：维持当前体成分，力量与体能均衡发展。`;let C="female"===o.gender,y="";C&&(y=`女性运动员：ACL损伤风险为男性2-8倍，每节必含落地力学纠正（膝勿内扣）+北欧弯举。上肢初始负荷低15-20%。关注铁/钙摄入（月经周期铁流失），蛋白质建议1.8-2.0g/kg。警惕女性运动员三联征（进食紊乱→月经失调→骨密度降低）。`);let x=o.position||"midfielder",$=o.goal||"strength",A=o.phase||"competition",R=`combo_${x}_${$}_${A}`;return`${o.coachInput?`## 教练输入
${o.coachInput}
`:""}${o.name?`## 个性化方案：${o.name}`:""}
球员信息:
- 姓名: ${o.name||"运动员"}${o.position?` \xb7 ${s[o.position]}`:""}
- 身份: 运动员
- 场上位置: ${o.position?s[o.position]:"未设置"}${t?"（守门员专项：肩部力量+背部保护+下肢爆发力+扑救技术。热身含球感和手臂活动。体能通过比赛情境练，非孤立跑圈）":""}
- 年龄: ${u}岁${i?"（未成年，控制训练强度，禁止>85%1RM）":""}
- 身高: ${w}cm
- 体重: ${S}kg
- 训练年限: ${b}年
- 自述短板/想提升: ${o.weakness||"未填写"}

个性化分析:
- 训练经验等级: ${_}。${f}
- 年龄段调整: ${g}
- 体型评估: ${I}
- 性别特征: ${y||"男性，标准方案"}
- 伤病史: ${o.injuryHistory||"无"}
- 伤病部位: ${r}

目标能力: ${d[o.goal]}
赛季阶段: ${m[o.phase]}
推荐套餐: ${R}
${o.trainingDuration?`可用训练时间: ${o.trainingDuration}分钟，请按此时间调整训练量`:""}

## 营养精确计算（必须输出到 module_5 nutrition 中）
${h}
${C?"- 女性：额外补铁18mg/天（月经铁流失），补钙1000mg/天":""}
**营养输出格式（必须逐项展开，不可只给数字）：**
1. 训练前(2-4h): 列出具体食物+克数，如"150g鸡胸肉+200g红薯+蔬菜"
2. 训练后(30min内): 具体食物+克数+为什么(糖原窗口)
3. 全天饮食: 早/午/晚餐各列具体食物，每餐标注蛋白/碳水量
4. 补水: 每日总饮水ml数+训练中补水策略，解释脱水影响(>2%体重脱水表现下降)
5. 补剂建议(如有): 名称+剂量+作用原理+安全警告
6. 禁忌提示: 训练前禁什么、比赛日禁什么

## 个性化调整指令（必须执行）

套餐为基础模板，你必须根据以下个人因素做出调整：

**1. 训练年龄调整：**
${b<=1?"- 入门级(y≤1年)：所有动作降为 2-3组\xd712-15次，负荷≤65%1RM。杠铃动作替换为哑铃/自重变式。禁止奥举。":""}
${b>1&&b<=3?"- 初级(1-3年)：3组\xd78-12次为主，负荷65-75%1RM。可引入杠铃基础动作。不安排奥举。":""}
${b>3&&b<8?"- 中级(4-7年)：3-4组\xd76-10次，负荷75-85%1RM。杠铃基础动作适用。可引入L2增强式(不含深度跳)。注意渐进负荷。":""}
${b>=8?"- 高级(≥8年)：3-4组\xd72-5次可接近最大力量。可安排奥举+增强式训练。负荷可用80-95%1RM。":""}

**2. 年龄调整：**
${u<14?`- 青少年早期(${u}岁)：体重训练为主。禁止>85%1RM。squat→goblet-squat；deadlift→kettlebell。重点：协调性+动作模式>绝对力量。`:""}
${u>=14&&u<18?`- 青少年(${u}岁)：训练年龄≥2年→可渐进>85%1RM(需技术合格)。${b>=2?"可用杠铃基础动作。":"体重为主，暂不引入>85%1RM。"}`:""}
${u>=35?`- 资深球员(${u}岁)：热身延长至20min。每项力量训练前加轻重量热身组。关节保护必选（face-pull、band-activation）。恢复间隔≥48h。`:""}

**3. 体型调整：**
${k<18.5?`- 偏瘦(BMI ${k.toFixed(1)})：力量训练为主(70%)，有氧减少(15%)。每餐蛋白目标2.0-2.2g/kg。核心训练加抗旋转类(pallof-press)。`:""}
${k>=25?`- BMI ${k.toFixed(1)}偏高：如是体脂偏高→增加有氧/灵敏到30%，关节保护优先(闭链动作)。如是肌肉型→忽略此提示，维持力量训练方向。HIIT长间歇优先。`:""}

**4. 性别调整：**
${C?"- 女性：热身必须含落地力学(jump-landing纠正膝外翻)。北欧弯举必练。上肢负荷保守(女-15%)。营养加铁/钙建议。":""}

${a}

${c||""}
直接开始输出 event: module_1，不要任何开场白。

**module_1 必须包含 analysis 字段**，用2-3句话解释：「基于你的[训练年龄/体型/性别/年龄]情况，你应该[可以做什么]，你不应该[避免什么]，所以我给你的方案是[核心思路]」。例如：
"analysis": "基于你1年入门级训练经验+偏瘦体型(BMI 17)+女性ACL防护需求，你应以中低强度肌耐力为主(2-3\xd712-15)，避免>85%1RM大重量和奥举。杠铃动作替换为哑铃/自重变式，加强核心抗旋转和落地力学训练。"

依次生成以下5个模块：
1. ${s[o.position]}专项分位置训练（优先套餐: ${R}；必须含 analysis 字段）
2. ${d[o.goal]}定向能力训练
3. ${s[o.position]}位置专属技术练习与跑动特征
4. ${m[o.phase]}周期适配计划
5. 伤病康复方案${"无"===r?"（无伤病→输出 skipped）":""}

特殊规则:
${i?"- 该球员未成年，禁止使用>85%1RM负荷。用 db-goblet-squat/sus-squat 替代 back-squat。":""}
${t?"- 守门员专项：upper必须含 shoulder-press + face-pull；core必须含 cable-woodchop(旋转爆发) + pallof-press(抗旋转)；lower必须含 box-jump(爆发力)。":""}
${o.injurySites.includes("knee")||o.injurySites.includes("thigh")?"- 含膝/大腿伤病：禁止大重量深蹲和跳跃类。替代为 leg-press(闭链安全)+hip-thrust(臀肌)+nordic-hamstring(轻型离心)。":""}
${C?"- 女性运动员：热身必含落地力学训练(膝勿内扣)；营养方案加铁/钙建议；上肢初始负荷保守(-15%)。每节必练北欧弯举。":""}
${n?`
⚠️ 天气因素：${n}
根据天气调整：高温加强补水策略，低温延长热身，雨天减少户外冲刺/变向练习。`:""}`}(o,e,n,c)}(e,E,oi?function(o){if(!o)return"";let e=[];return e.push(`当前天气：${o.condition}，${o.temp}\xb0C，湿度${o.humidity}%`),o.temp>30&&e.push("⚠️ 高温：补水策略需加强，训练中每15min补水200ml。考虑降低训练强度或移至早晚凉爽时段。"),o.temp<5&&e.push("⚠️ 低温：热身延长至25min，穿着保暖层，避免静态拉伸引发寒颤。"),o.humidity>80&&e.push("\uD83D\uDCA7 高湿度：汗液蒸发慢，补水频率加倍，每10-15min补水。"),o.condition.includes("雨")&&e.push("\uD83C\uDF27️ 雨天：如场地湿滑，减少急停/变向练习，考虑室内替代方案。守门员扑救注意落地缓冲。"),o.windSpeed>20&&e.push("\uD83D\uDCA8 大风：影响长传和高球，降低对此类练习的依赖。"),e.join("\n")}(oi):void 0,ot)+(od?"\n"+od:"")+(r?"\n\n"+r:"");return new Response(new ReadableStream({async start(o){let r;try{var a;let i=null,t=null,s=async o=>{let e=new AbortController;r=setTimeout(()=>e.abort(),6e4);let n=await fetch(o.base,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o.key}`},body:JSON.stringify({model:o.model,messages:[{role:"system",content:oa},{role:"user",content:om}],max_tokens:8e3,stream:!0,temperature:.7,thinking:{type:"disabled"}}),signal:e.signal});return clearTimeout(r),n};try{i=await s(A)}catch(o){t=o}if((!i||!i.ok)&&v)try{i=await s(v)}catch(o){t=o}if(!i||!i.ok)throw t||Error("AI 接口不可用");let d=i.body?.getReader();if(!d)throw Error("No response body");let m=new TextDecoder,l="",b="";for(;;){let{done:o,value:e}=await d.read();if(o)break;let n=(l+=m.decode(e,{stream:!0})).split("\n");for(let o of(l=n.pop()||"",n)){if(!o.startsWith("data: "))continue;let e=o.slice(6).trim();if("[DONE]"!==e)try{let o=JSON.parse(e),n=o.choices?.[0]?.delta,c=n?.content||n?.reasoning_content||"";if(!c)continue;b+=c}catch{}}}if(l.trim())try{let o=l.trim();if(o.startsWith("data: ")){let e=o.slice(6).trim();if("[DONE]"!==e){let o=JSON.parse(e),n=o.choices?.[0]?.delta,c=n?.content||n?.reasoning_content||"";c&&(b+=c)}}}catch{}let _=function(o){let e=[],n=o.split("\n"),c="";for(let o of n){let n=o.trim();if(n){if(n.startsWith("event: "))c=n.slice(7).trim();else if(n.startsWith("data: ")&&c){let o=n.slice(6).trim();try{let n=JSON.parse(o);e.push({event:c,data:n,raw:o})}catch{e.push({event:c,data:o,raw:o})}c=""}}}return e}(b);if(0===_.length)throw Error("AI 返回空内容");let f=_.find(o=>"module_1"===o.event&&"object"==typeof o.data);if("rehab"!==c&&(a=c||"gym",e.goal,"rehab"!==a)&&f&&"object"==typeof f.data){let r=f.data,a=r.combo_id||null,i=Array.isArray(r.upper_ids)?r.upper_ids:[],t=Array.isArray(r.lower_ids)?r.lower_ids:[],s=Array.isArray(r.core_ids)?r.core_ids:[],d=Array.isArray(r.ability_exercise_ids)?r.ability_exercise_ids:[],m=[...i,...t,...s,...d],l=e.phase||"competition",b=e.goal||"strength",p=c||"gym",g=Array.isArray(e.injurySites)?e.injurySites.filter(o=>o&&"none"!==o):[],S={aiComboId:a,aiExerciseIds:m,scene:p,goal:b,phase:l,position:e.position,injuries:g,disabledExercises:[],playerCount:e.playerCount||1},k=function(o){let e;let n=[],c=[],r=[],a=[],i=o.phase,t=o.position,s=function(o,e,n,c,r){let a=B(e,n,c,r);return o?a.comboId&&o===a.comboId?{valid:!0,recommended:o,score:100*a.confidence,shouldOverride:!1,reason:`AI选型与映射表一致 (${a.bookSource})`}:a.comboId&&o!==a.comboId?a.confidence>=.7?{valid:!1,recommended:a.comboId,score:100*a.confidence,shouldOverride:!0,reason:`AI选了${o}，映射表推荐${a.comboId} (置信度${Math.round(100*a.confidence)}%，${a.bookSource})`}:{valid:!0,recommended:o,score:Math.max(100*a.confidence,60),shouldOverride:!1,reason:`AI选型${o}采纳 (映射表置信度仅${Math.round(100*a.confidence)}%)`}:!a.comboId&&o?{valid:!0,recommended:o,score:50,shouldOverride:!1,reason:"映射表无此场景推荐，采纳AI选型 (标记为低置信度)"}:{valid:!1,recommended:a.fallbackComboId||null,score:0,shouldOverride:!0,reason:"无匹配，触发离线引擎"}:{valid:!1,recommended:a.comboId||a.fallbackComboId||null,score:100*a.confidence,shouldOverride:!0,reason:`AI未返回combo_id，使用映射表推荐 (置信度${Math.round(100*a.confidence)}%)`}}(o.aiComboId,o.scene,o.goal,i,t),d=B(o.scene,o.goal,i,t);s.shouldOverride?(e=s.recommended,o.aiComboId&&o.aiComboId!==e?n.push({original:o.aiComboId,replaced:e||"(null)",reason:s.reason}):!o.aiComboId&&e&&c.push(`AI未返回combo_id，使用映射表推荐: ${e}`)):e=o.aiComboId,e&&!x.oy[e]&&(c.push(`combo_id "${e}" 不在ATHLETE_COMBOS中，将使用位置默认练习`),d.fallbackComboId&&x.oy[d.fallbackComboId]?(e=d.fallbackComboId,c.push(`已回退到备用combo: ${e}`)):(e=null,c.push("无可用的combo，将使用POSITION_EXERCISES默认值"))),d.bookSource&&!d.bookSource.startsWith("缺书")&&r.push(d.bookSource),d.bookSource&&d.bookSource.startsWith("缺书")&&a.push(d.bookSource);let m=function(o){let e=new Set;for(let n of o){let o=X[n];if(o)for(let n of o)e.add(n);else e.add(n.toLowerCase())}return Array.from(e)}(o.injuries),l=[],b=0,_=0,f=new Set([...Object.keys(x.TX),...Object.keys(x.rs)]);for(let e of o.aiExerciseIds){let r=e;if(o.disabledExercises.includes(e)){let a=z(e,t,o.goal,m,l,o.disabledExercises);if(a)n.push({original:e,replaced:a,reason:`动作"${e}"在禁用列表中`}),r=a;else{c.push(`禁用动作"${e}"无法找到替代，已跳过`);continue}}if(!f.has(r)){_++;let a=z(r,t,o.goal,m,l,o.disabledExercises);if(a)n.push({original:e,replaced:a,reason:`ID "${r}" 不在动作库中`}),r=a;else{c.push(`无效ID "${r}" 无法找到替代，已跳过`);continue}}if(function(o,e){let n=x.TX[o];return!!n&&!!n.injury_contraindications&&n.injury_contraindications.some(o=>e.includes(o))}(r,m)){b++;let a=function(o,e){let n=x.TX[o];if(!n||!n.injury_contraindications)return"";let c=n.injury_contraindications.filter(o=>e.includes(o));return`动作"${n.name}"禁忌部位: ${c.join(", ")}`}(r,m),i=z(r,t,o.goal,m,l,o.disabledExercises);i&&i!==r?(n.push({original:e,replaced:i,reason:a}),r=i):c.push(`动作"${r}"有伤病禁忌但无法找到安全替代，已保留（请教练确认）`)}l.includes(r)||l.push(r)}if(0===l.length&&o.aiExerciseIds.length>0){let e=F(t,o.goal,m,[],o.disabledExercises);for(let o of e.slice(0,Math.min(3,e.length)))n.push({original:"(none)",replaced:o,reason:"所有输入动作被过滤，使用安全默认值"}),l.push(o)}let p=function(o){let e;if(e=0+(o.comboValid?40:Math.round(40*o.comboConfidence)),o.originalExerciseCount>0?e+=Math.round(25*(1-o.injuryReplacementCount/o.originalExerciseCount)):e+=25,o.finalExerciseIds.length>0){let n=o.position||"midfielder",c=x.qc[n]||x.qc.midfielder,r=new Set([...c.upper,...c.lower,...c.core]);e+=Math.round(o.finalExerciseIds.filter(o=>r.has(o)).length/o.finalExerciseIds.length*20)}else e+=20;return o.finalExerciseIds.length>0?e+=Math.round(o.finalExerciseIds.filter(e=>{let n=x.TX[e];return n?.periodization&&n.periodization[o.phase]}).length/o.finalExerciseIds.length*15):e+=15,Math.min(100,Math.max(0,e))}({comboValid:s.valid,comboConfidence:s.score/100,originalExerciseCount:o.aiExerciseIds.length,injuryReplacementCount:b,finalExerciseIds:l,position:t,phase:i}),u=s.valid&&0===_;return e&&s.score<50&&c.push(`Combo匹配置信度较低 (${Math.round(s.score)}%)，建议复核`),_>0&&c.push(`${_}个AI动作ID不在动作库中，已自动替换`),m.length>0&&b>0&&c.push(`已过滤${b}个伤病禁忌动作`),{valid:u,finalComboId:e,finalExerciseIds:l,score:p,replacements:n,warnings:c,bookSources:r,missingBooks:a}}(S);console.log(`[B+C] Plan validated. Score: ${k.score}/100. Combo: ${k.finalComboId}. Exercises: ${k.finalExerciseIds.length}. Replacements: ${k.replacements.length}. Warnings: ${k.warnings.length}.`),k.warnings.length>0&&console.log("[B+C] Warnings:",k.warnings),k.replacements.length>0&&console.log("[B+C] Replacements:",k.replacements.map(o=>`${o.original}→${o.replaced}`));let h=function(o,e,n,c,r,a){let i=[],t=o.finalComboId?(0,x.resolveCombo)(o.finalComboId):null,s=function(o,e,n,c,r,a){let i=c||R,t=x.qc[i]||x.qc[R],s=new Set,d=(o?.warmup_ids?.length?o.warmup_ids:["warm-light-jog","warm-dynamic-stretch","warm-ball-touch"]).map(P).filter(o=>null!=o),m=M(o?.upper_ids?.length?o.upper_ids:t.upper.slice(0,3),a,s).map(o=>D(o,e,n,r)).filter(o=>null!=o),l=M(o?.lower_ids?.length?o.lower_ids:t.lower.slice(0,3),a,s).map(o=>D(o,e,n,r)).filter(o=>null!=o),b=M(o?.core_ids?.length?o.core_ids:t.core.slice(0,2),a,s).map(o=>D(o,e,n,r)).filter(o=>null!=o),_=(o?.cooldown_ids?.length?o.cooldown_ids:["cool-static-stretch","cool-foam-roll"]).map(K).filter(o=>null!=o),f=o?.nutrition_goal||n||"default",p=x.Sw[f]||x.Sw.default,g=u[e],S=o?.label||"",k=S?`${S} \xb7 ${g.labelCn} \xb7 ${n}`:`${i} \xb7 ${n} \xb7 ${g.labelCn}`,h=w(n),I=[];return g&&I.push(`${g.labelCn}: ${g.intensityPercent[0]}-${g.intensityPercent[1]}%1RM, ${g.setsRange[0]}-${g.setsRange[1]}组\xd7${g.repsRange[0]}-${g.repsRange[1]}次, 间歇${g.restBetweenSets[0]}-${g.restBetweenSets[1]}s`),h&&I.push(`目标: ${h.labelCn} (${h.percent1RM[0]}-${h.percent1RM[1]}%1RM, ${h.setsReps}, 间歇${h.rest})`),I.push(`策略: ${g.variationStrategy}`),{module:"position_training",title:k,analysis:I.join(" | "),warmup:d,upper_limb:m,lower_limb:l,core:b,cooldown:_,nutrition:p,status:"complete"}}(t,n,c,a,e,r);i.push(s);let d=new Set([...t?.upper_ids||[],...t?.lower_ids||[],...t?.core_ids||[]]),m=function(o,e,n,c,r){let a=o.filter(o=>!r.has(o));if(0===a.length)return null;let i=u[e],t=a.map(o=>{let r=x.TX[o];if(!r)return null;let a=T(r,e,n),i=j(r,e,n),t=G(r,e,n);return{name:r.name,sets:a,reps:i,load:q(r,e,n,c),rest:t,rpe:r.rpe,heart_rate_zone:r.heart_rate_zone,image_url:r.image_url,cue_points:r.cue_points,progression:r.progression||"根据RPE逐步进阶"}}).filter(o=>null!=o);return 0===t.length?null:{module:"ability_training",title:`补充能力训练 \xb7 ${i.labelCn}`,exercises:t,status:"complete"}}(Array.from(new Set([...t?.ability_ids||[],...o.finalExerciseIds])),n,c,e,d);return m&&i.push(m),i.push(function(o){let e=x.DF[o]||x.DF.competition;return{module:"phase_plan",title:e.title,weekly_frequency:e.weekly_frequency,session_duration:e.session_duration,intensity_distribution:e.intensity_distribution,recovery_strategy:`${e.recovery_strategy} | 来源: ${$}`,status:"complete"}}(n)),i}(k,os||{},l,b,p,e.position),I=0;for(let e of h){let n;I++,n="position_training"===e.module?"module_1":"ability_training"===e.module?"module_2":"phase_plan"===e.module?"module_3":`module_${I}`,o.enqueue(oe(n,JSON.stringify(e)))}let C=0,y=new Set(h.map(o=>o.module));for(let e of _)"module_1"!==e.event&&"done"!==e.event&&("object"==typeof e.data&&e.data.module&&y.has(e.data.module)||(C++,o.enqueue(oe(e.event,"string"==typeof e.data?e.data:JSON.stringify(e.data)))));if(J){let{resolveCombo:c}=await Promise.resolve().then(n.bind(n,7420)),r=k.finalComboId?c(k.finalComboId):null,a=function(o,e,n,c,r,a,i){let t=u[e],s=w(n),d="gym"===c?"力量房":"外场",m=s?.labelCn||n,l=0,b=new Set,_=(o?.warmup_ids?.slice(0,5)||["warm-hip-open","warm-glute-activation","warm-dynamic-stretch","warm-plank-series","warm-nordic-curl"]).map(o=>{let e=x.rs[o];return{name:e?.name||o,duration:e?.duration||3,description:e?.description||"",category:e?.category||"no_ball"}});l+=Math.min(20,Math.round(.18*i));let f=i-l-Math.round(.1*i),p=Math.round(.7*f),g=[],S=(o,e,n,r,i)=>({name:o,duration:e,area:"pitch"===c?"半场":"力量房",groups:`${a}人轮换`,description:n,coaching_points:r,progression:r[0]||"",regression:i[0]||""}),k=M(o?.lower_ids?.slice(0,3)||[],c,b);if(k.length>0){let o=k.map(o=>{let c=x.TX[o]?D(o,e,n,{}):null;return c?`${c.name} ${c.sets}\xd7${c.reps} @${c.load} 间歇${c.rest}s`:o}),c=k.map(o=>{let e=x.TX[o];return e?.cue_points?.[0]||""}).filter(Boolean);g.push(S("下肢力量",Math.round(.4*p),o.join(" | "),c.length>0?c:["控制离心3-5s","保持核心稳定"],["降负荷20%","减少组数1组"]))}let h=M(o?.upper_ids?.slice(0,2)||[],c,b);if(h.length>0){let o=h.map(o=>{let c=x.TX[o]?D(o,e,n,{}):null;return c?`${c.name} ${c.sets}\xd7${c.reps} @${c.load}`:o}),c=h.map(o=>{let e=x.TX[o];return e?.cue_points?.[0]||""}).filter(Boolean);g.push(S("上肢力量",Math.round(.25*p),o.join(" | "),c.length>0?c:["肩胛骨收紧","控制节奏"],["降负荷20%","减少组数1组"]))}let I=M(o?.core_ids?.slice(0,2)||[],c,b);if(I.length>0){let o=I.map(o=>{let c=x.TX[o]?D(o,e,n,{}):null;return c?`${c.name} ${c.sets}\xd7${c.reps}`:o}),c=I.map(o=>{let e=x.TX[o];return e?.cue_points?.[0]||""}).filter(Boolean);g.push(S("核心训练",Math.round(.2*p),o.join(" | "),c.length>0?c:["腹式呼吸","骨盆中立位"],["减少持续时间","退阶到静态保持"]))}let C=f-p;if(C>=5&&o?.ability_ids?.length){let r=M(o.ability_ids.slice(0,3),c,b);if(r.length>0){let o=r.map(o=>{let c=x.TX[o]?D(o,e,n,{}):null;return c?`${c.name} ${c.sets}\xd7${c.reps}`:o});g.push(S("专项能力",C,o.join(" | "),["全力执行","保持技术质量"],["降速10%","增加间歇"]))}}l+=p+C;let y="pitch"===c,$=Math.min(a,10),A={id:"ssg-session",name:y?`${$}v${$} 小场地`:"无SSG",focus:y?"攻防转换+体能维持":"力量房无SSG",duration:y?Math.min(15,Math.round(.12*i)):0,area:y?"30\xd720m":"",players:y?`${$}v${$}`:"",rules:y?"2脚触球限制，自由轮转，进球即换人":"",coaching_focus:y?["攻防转换速度","丢球后立即反抢","快速决策"]:[]},R=(o?.cooldown_ids?.slice(0,2)||["cool-static-stretch","cool-foam-roll"]).map(o=>{let e=x.IQ[o];return{name:e?.name||o,duration:e?.duration||5,description:e?.description||"",category:"no_ball"}}),v="gym"===c?["杠铃","哑铃","药球","跳箱","弹力带","泡沫轴"]:["标志盘","锥桶","分队背心","足球","弹力带","泡沫轴"];return{module:"session_plan",title:`${r||"midfielder"} \xb7 ${d} \xb7 ${m} \xb7 ${t.labelCn}`,duration:i,player_count:a,equipment:v,warmup:_,activities:g,ssg:A,cooldown:R,status:"complete"}}(r,l,b,p,e.position,e.playerCount||20,e.trainingDuration||75);I++,o.enqueue(oe(`module_${I}`,JSON.stringify(a)));let{MICROCYCLE_TEMPLATES:i}=await Promise.resolve().then(n.bind(n,7420)),t=i["microcycle-1game"];t&&(I++,o.enqueue(oe(`module_${I}`,JSON.stringify({module:"microcycle",...t,status:"complete"}))))}o.enqueue(oe("done",JSON.stringify({totalModules:I+C})))}else{let e=0;for(let n of _)"done"===n.event?o.enqueue(oe("done","object"==typeof n.data?JSON.stringify(n.data):n.data)):(e++,o.enqueue(oe(n.event,"string"==typeof n.data?n.data:JSON.stringify(n.data))));_.some(o=>"done"===o.event)||o.enqueue(oe("done",JSON.stringify({totalModules:e})))}o.close()}catch(n){clearTimeout(r),console.error("[B+C] AI failed, falling back to offline plan:",n.message);try{let n={scene:c||"gym",goal:e.goal||"strength",phase:e.phase||"competition",duration:e.trainingDuration||60,position:e.position,playerName:e.name||void 0},r=function(o){let{scene:e,goal:n,phase:c,duration:r,position:a,playerName:i}=o,t=u[c],s=w(n),d=("gym"===e?U:W).map(L),{upper:m,lower:l,core:b,ability:_}=function(o,e,n,c){let r=w(e),a=r&&r.setsReps.includes("-")?parseInt(r.setsReps.split("\xd7")[0].split("-")[0]):3,i=r&&r.setsReps.includes("-")?parseInt(r.setsReps.split("\xd7")[1].split("-")[1]||r.setsReps.split("\xd7")[1]):8,t=r?parseInt(r.rest):90,s=x.qc[c||"midfielder"]||x.qc.midfielder,d=x.Ou[e]||[],m=o=>({name:o.name,sets:a,reps:i,load:o.load_default||"BW",rest:t,rpe:(r?.percent1RM?.[1]??75)>85?8:(r?.percent1RM?.[1]??75)>70?7:6,heart_rate_zone:"Zone3",cue_points:o.cue_points||[],image_url:o.image_url}),l="pitch"===o,b=o=>!l||!(o.name.includes("杠铃")||o.name.includes("哑铃")||o.name.includes("绳索")||o.name.includes("悬吊")),_=[...s.lower,...d].filter((o,e,n)=>n.indexOf(o)===e),f=[...s.core],p=n<=30?4:n<=45?5:n<=60?6:7,u=_.map(o=>x.TX[o]).filter(o=>!!o&&b(o)).slice(0,Math.ceil(.5*p)).map(m),g=f.map(o=>x.TX[o]).filter(o=>!!o).slice(0,Math.ceil(.3*p)).map(m);return{upper:l?[]:s.upper.map(o=>x.TX[o]).filter(o=>!!o).slice(0,Math.ceil(.2*p)).map(m),lower:u,core:g,ability:d.slice(0,2).map(o=>x.TX[o]).filter(o=>!!o&&b(o)).map(o=>({...m(o),progression:"根据RPE调整"}))}}(e,n,r,a),f=H.map(o=>{let e=x.IQ[o];return e?{name:e.name,duration:e.duration,description:e.description}:{name:o,duration:5,description:""}}),p=s?.labelCn||n,g=t.labelCn,S="gym"===e?"力量房":"外场",k=`${S}\xb7${p}\xb7${g}`;return[{module:"position_training",title:i?`${i} \xb7 ${k}`:k,analysis:`离线模式生成 | 场景:${S} | 目标:${p} | 阶段:${g} | ${t.intensityPercent[0]}-${t.intensityPercent[1]}%1RM | ${t.setsRange[0]}-${t.setsRange[1]}组\xd7${t.repsRange[0]}-${t.repsRange[1]}次 | 间歇${t.restBetweenSets[0]}-${t.restBetweenSets[1]}s`,warmup:d,upper_limb:m,lower_limb:l,core:b,cooldown:f,nutrition:function(o){let e={pre_training:"香蕉1根+水500ml（训前30-60min）",post_training:"乳清蛋白25g+快碳50g（训后30min内）",daily_plan:"碳水5-8g/kg，蛋白1.6-2.0g/kg",hydration:"体重\xd735ml/天，训练额外+800ml",supplements:"肌酸5g/日，维生素D3 2000IU"};return"strength"===o||"power"===o?{...e,pre_training:"碳水50g+咖啡因3mg/kg（训前60min）",post_training:"乳清蛋白30g+快碳60g+肌酸5g（训后30min内）"}:"mas_endurance"===o?{...e,daily_plan:"碳水6-8g/kg，蛋白1.6-1.8g/kg",pre_training:"碳水60g+电解质饮料500ml",post_training:"乳清蛋白25g+快碳80g+电解质",supplements:"电解质片+维生素D3 2000IU"}:e}(n),status:"complete"}]}(n),a=0;for(let e of r)a++,o.enqueue(oe(`module_${a}`,JSON.stringify(e)));o.enqueue(oe("done",JSON.stringify({totalModules:a,offline:!0})))}catch(e){o.enqueue(oe("error",JSON.stringify({code:"offline-error",message:"离线引擎也失败了，请稍后重试"})))}o.close()}}}),{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache",Connection:"keep-alive"}})}let oc=new r.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/generate/route",pathname:"/api/generate",filename:"route",bundlePath:"app/api/generate/route"},resolvedPagePath:"/Users/kenshin/Desktop/Kenshin体能/app/api/generate/route.ts",nextConfigOutput:"standalone",userland:c}),{requestAsyncStorage:or,staticGenerationAsyncStorage:oa,serverHooks:oi}=oc,ot="/api/generate/route";function os(){return(0,i.patchFetch)({serverHooks:oi,staticGenerationAsyncStorage:oa})}}};var e=require("../../../webpack-runtime.js");e.C(o);var n=o=>e(e.s=o),c=e.X(0,[8948,7647,6400,7038],()=>n(2022));module.exports=c})();