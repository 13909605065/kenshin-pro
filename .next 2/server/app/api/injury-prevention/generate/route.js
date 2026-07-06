"use strict";(()=>{var e={};e.id=2847,e.ids=[2847,257],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2048:e=>{e.exports=require("fs")},5822:e=>{e.exports=require("path")},3941:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>M,patchFetch:()=>x,requestAsyncStorage:()=>y,routeModule:()=>h,serverHooks:()=>$,staticGenerationAsyncStorage:()=>f});var n={};s.r(n),s.d(n,{POST:()=>g});var r=s(9303),o=s(8716),a=s(670),i=s(5784),l=s(257),c=s(5562),p=s(5281);let d=new Map,u={deepseek:{base:"https://api.deepseek.com/v1/chat/completions",model:"deepseek-chat",key:process.env.DEEPSEEK_API_KEY},doubao:{base:"https://ark.cn-beijing.volces.com/api/v3/chat/completions",model:process.env.DOUBAO_ENDPOINT||"",key:process.env.DOUBAO_API_KEY}},m={GK:"守门员",DF:"后卫",MF:"中场",FW:"前锋",WB:"翼卫",CB:"中后卫",FB:"边后卫",DM:"后腰",CM:"中前卫",AM:"前腰",WF:"边锋",CF:"中锋"};async function g(e){let t;let s=(0,i.$)(),{data:{user:n},error:r}=await s.auth.getUser();if(r||!n)return Response.json({code:"auth-required",message:"请先登录"},{status:401});let o=Date.now(),a=d.get(n.id);if(a&&o-a<15e3)return Response.json({code:"rate-limited",message:"请稍后再试"},{status:429});d.set(n.id,o);try{t=await e.json()}catch{return Response.json({code:"invalid",message:"无效请求"},{status:400})}let{playerName:g,position:h,injuryStatus:y,injuryNote:f,injuryHistory:$,disabledExercises:M,injuries:x,healthScores:b}=t,j=c.ls.map(e=>`${e.name}(id:${e.id}|部位:${e.body_part}|器械:${e.equipment}|禁忌:${e.injury_contraindications?.join?.("、")||"无"})`).join("\n"),_=[f,$,...x.map(e=>e.body_part+e.injury_type)].join(" ").toLowerCase(),k=c.ls.filter(e=>{let t=e.injury_contraindications;return!t||0===t.length||!t.some(e=>_.includes(e.toLowerCase()))}).map(e=>e.name),P=m[h]||h||"足球运动员",v=[`${P} 伤病预防 训练`,`足球 ${"healthy"===y?"伤病预防 prehab":"伤病康复 rehab"} ${f}`,"FIFA 11+ 损伤预防 北欧弯举 平板支撑","ACL 腘绳肌 踝关节 损伤 预防 训练","足球 离心训练 肌力平衡 预防","组织愈合 阶段 康复 RTP 重返赛场","足球 负荷管理 ACWR 损伤风险"];x.length>0&&v.push(`${x.map(e=>e.body_part).join(" ")} 康复 训练 阶段`);let w="",R=new Set;for(let e of v){let t=(0,l.getKnowledgeContext)(e);t&&!R.has(t.slice(0,50))&&(R.add(t.slice(0,50)),w+=t)}let A=(0,p.TN)("healthy"===y?"preseason":"recovery","strength"),C=`你是一名职业足球体能教练和运动康复专家。你需要为一名球员制定循证的伤病预防/康复训练计划。

## 球员档案
- 姓名：${g}
- 位置：${P}
- 伤病状态：${"healthy"===y?"健康":"minor"===y?"轻伤":"缺阵"}
${"healthy"!==y?`- 当前伤病：${f}
- 伤病史：${$}`:""}
${b?`- 近期健康评分：睡眠${b.sleep}/5 疲劳${b.fatigue}/5 酸痛${b.soreness}/5 压力${b.stress}/5 情绪${b.mood}/5`:""}

## 铁律（必须遵守）

1. **FIFA 11+ 每节必练**：北欧弯举 + 平板支撑三级 + 侧桥三级 + 单腿平衡三级
2. **禁忌动作排除**：${M.length>0?`禁用「${M.join("、")}」`:"无特殊禁用"}
3. **4阶段组织愈合框架**：
   - 急性期(0-72h)：RICE，无负荷，轻柔ROM
   - 增殖期(3d-6w)：渐进负荷，等长→等张，闭链优先
   - 重塑期(6w-6m)：离心训练，增强式，专项动作
   - 功能期(>6m)：比赛模拟，RTP测试
4. **腘绳肌再伤风险最高**（增加8倍），离心康复是关键
5. **<18岁禁用>85%1RM**，奥举仅高训练年龄(≥8年)可用

${A}

## 可用动作库（供选择）
${j}

${w}

## 输出格式
必须输出严格JSON，一行，无markdown包裹：
{"risk_assessment":"基于伤病史和位置的循证风险评估","exercises":[{"exercise_id":"动作ID(从可用动作库选)","name":"动作名称","sets":3,"reps":"8-12","load":"65-75%1RM","rest":"90s","rationale":"为何选此动作"}],"fifa_11_plus":{"nordic_curl":true,"plank":true,"side_bridge":true,"single_leg_balance":true,"nordic_level":"初级3-5次"|"中级7-10次"|"高级12-15次"},"tissue_stage":"acute"|"proliferation"|"remodeling"|"functional"|null,"load_guidelines":{"acwr_target":"1.0-1.3","progression":"每周增幅5-10%","weekly_sessions":3,"session_duration":"30-45min"},"recovery_recommendations":["建议1","建议2","建议3"]}

- risk_assessment必须引用KB具体出处
- exercises优先从安全动作中选择：${k.slice(0,15).join("、")}...
- tissue_stage仅当injuryStatus≠"healthy"时判断
- load_guidelines必须标注ACWR目标区间和渐进策略
- recovery_recommendations至少3条`,F=`请为${g}（${P}）生成伤病${"healthy"===y?"预防":"康复"}训练计划。

当前状态：${"healthy"===y?"健康，需要预防性训练":f}
伤病史：${$||"无记录"}
近期伤病记录：${x.length>0?x.map(e=>`${e.body_part}${e.injury_type}(${e.occurrence_date})`).join("、"):"无"}
${b?`健康问卷：睡眠${b.sleep}/5 疲劳${b.fatigue}/5 酸痛${b.soreness}/5 压力${b.stress}/5 情绪${b.mood}/5${b.fatigue+b.soreness>7?" [⚠️ 恢复不足，注意减载]":""}`:""}

请输出JSON格式的训练计划。`,O=u.deepseek.key?u.deepseek:u.doubao.key&&u.doubao.model?u.doubao:null,S=u.deepseek.key&&u.doubao.key&&u.doubao.model?u.doubao:null;if(!O)return Response.json({code:"no-provider",message:"AI 服务未配置，请检查环境变量"},{status:503});let q=async e=>{let t=new AbortController,s=setTimeout(()=>t.abort(),3e4);try{return await fetch(e.base,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e.key}`},body:JSON.stringify({model:e.model,messages:[{role:"system",content:C},{role:"user",content:F}],max_tokens:3e3,stream:!1,temperature:.4}),signal:t.signal})}finally{clearTimeout(s)}};try{let e=await q(O);if(!e.ok&&S&&(e=await q(S)),!e||!e.ok)throw Error("AI 接口不可用");let t=await e.json(),s=(t.choices?.[0]?.message?.content||"").match(/\{[\s\S]*\}/);if(s){let e=JSON.parse(s[0]);return Response.json({plan:e,kbReferences:w?"已检索知识库：足球体能训练、运动康复、FIFA 11+等相关著作":null})}return Response.json({code:"parse-error",message:"AI 返回格式异常，请重试"},{status:500})}catch(e){return console.error("Injury prevention generation error:",e.message||e),Response.json({code:"ai-error",message:"AI 服务暂不可用，请稍后重试"},{status:503})}}let h=new r.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/injury-prevention/generate/route",pathname:"/api/injury-prevention/generate",filename:"route",bundlePath:"app/api/injury-prevention/generate/route"},resolvedPagePath:"/Users/kenshin/Desktop/Kenshin体能/app/api/injury-prevention/generate/route.ts",nextConfigOutput:"standalone",userland:n}),{requestAsyncStorage:y,staticGenerationAsyncStorage:f,serverHooks:$}=h,M="/api/injury-prevention/generate/route";function x(){return(0,a.patchFetch)({serverHooks:$,staticGenerationAsyncStorage:f})}},5562:(e,t,s)=>{s.d(t,{ls:()=>o});var n=s(7420);let r={杠铃:"barbell",哑铃:"dumbbell",壶铃:"kettlebell",悬吊:"cable",自重:"bodyweight",弹力带:"band",药球:"med_ball",波速球:"bosu",跳箱:"跳箱"},o=Object.entries(n.TX).map(([e,t])=>({id:e,name:t.name,body_part:t.bodyPart||"全身",equipment:r[t.equipment||""]||"bodyweight",type:t.exerciseType||"力量",description:"",cue_points:t.cue_points||[],progression:t.progression||"",regression:t.regression||""}))},257:(e,t,s)=>{s.d(t,{S:()=>p,getKnowledgeContext:()=>d});var n=s(2048),r=s.n(n),o=s(5822),a=s.n(o);let i=a().join(process.cwd(),"kb/ocr-output"),l=null,c=new Map;function p(e,t=5){let s=function(){if(l)return l;try{return l=JSON.parse(r().readFileSync(a().join(i,"_index.json"),"utf8"))}catch{return{books:{},totalChars:0,totalFiles:0,topBooks:[]}}}(),n=e.toLowerCase().split(/\s+/).filter(e=>e.length>1);if(0===n.length)return[];let o=[];for(let[e,t]of Object.entries(s.books))if(!t.scanned&&!(t.chars<500))try{let s=c.get(e);for(let l of(s||(s=r().readFileSync(a().join(i,t.file),"utf8"),c.set(e,s)),s.split(/\n\n+/).filter(e=>e.length>80))){let t=0,s=l.toLowerCase();for(let e of n)t+=(s.match(RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"))||[]).length;t>0&&o.push({book:e,passage:l.slice(0,600).replace(/\n/g," "),relevance:t})}}catch{}return o.sort((e,t)=>t.relevance-e.relevance).slice(0,t)}function d(e,t,s){let n=[e];t&&n.push(t),s&&n.push(s);let r=[],o=new Set;for(let e of n)for(let t of p(e,3)){let e=t.passage.slice(0,40);o.has(e)||(o.add(e),r.push(t))}return 0===r.length?"":"\n\n【参考知识库 — 基于以下专业书籍】\n"+r.map(e=>`📖 ${e.book.slice(0,60)}: ${e.passage.slice(0,300)}`).join("\n")+"\n【以上知识仅供参考】\n"}},5281:(e,t,s)=>{s.d(t,{TN:()=>o});let n={power:{loadPctMin:30,loadPctMax:60,repsMin:2,repsMax:6,setsMin:3,setsMax:5,restMin:120,restMax:180,tempo:"向心极速爆发，离心慢速控制",note:"足球核心目标，备赛期主力，赛季中减量保留"},strength:{loadPctMin:60,loadPctMax:75,repsMin:6,repsMax:10,setsMin:3,setsMax:4,restMin:90,restMax:120,tempo:"中等速度，全程躯干刚性",note:"主流负荷区间，支撑/卡位/对抗"},agility:{loadPctMin:40,loadPctMax:60,repsMin:12,repsMax:20,setsMin:3,setsMax:4,restMin:45,restMax:60,tempo:"流畅持续，抗疲劳",note:"赛季中适用，90分钟不掉速"},mas_endurance:{loadPctMin:0,loadPctMax:40,repsMin:15,repsMax:20,setsMin:2,setsMax:3,restMin:30,restMax:60,tempo:"慢速精准，感受目标肌肉",note:"腘绳肌/肩袖/臀中肌防伤"}},r={offseason:{sessionsPerWeek:4,capacityPct:1,loadMaxPct:80,focus:"基础力量搭建",forbidden:[]},preseason:{sessionsPerWeek:3,capacityPct:.85,loadMaxPct:75,focus:"爆发力+动作速度",forbidden:["极限大重量(>85%1RM)"]},competition:{sessionsPerWeek:2,capacityPct:.6,loadMaxPct:65,focus:"维持+激活+防伤",forbidden:["大重量深蹲","大重量硬拉","极限组","连续下肢高强度"]},recovery:{sessionsPerWeek:1,capacityPct:.3,loadMaxPct:50,focus:"轻力量+每日激活放松",forbidden:["所有高强度组","爆发力动作","大重量"]}};function o(e,t){let s=r[e],o=n[t];return`
## 足球专项力量训练规则（教练审定）

### 核心逻辑
足球=间歇性高强度爆发。力量训练以功能性力量、快速力量、反应力量、关节稳定、肌力平衡为目标。
拒绝过度增肌，负荷偏中轻重量、快发力节奏，极少使用极限大重量。

### 五大动作模式优先级
1.髋铰链（最高）→ 2.蹲 → 3.单侧下肢（≥40%）→ 4.推/拉（拉>推）→ 5.旋转/抗旋
单侧动作占比必须≥40%，两侧必须均等。

### 三平面配比
矢状面50% / 冠状面30% / 水平面20%

### 复合/孤立配比
复合80% / 孤立20%。孤立仅限腘绳肌/小腿/肩袖。

### 肌力平衡硬指标
- 股四头肌:腘绳肌 = 1:0.7~0.8
- 肩袖肌群 > 胸肌/三角肌前束
- 下背伸肌 = 腹部屈肌
- 强化臀中肌（防膝内扣）

### 当前阶段参数
- 阶段：${s?.focus||"维持"}，每周${s?.sessionsPerWeek||2}次
- 最大负荷：${s?.loadMaxPct||65}%1RM
- 禁止：${s?.forbidden?.join("、")||"无"}
- 目标负荷：${o?.loadPctMin||40}-${o?.loadPctMax||75}%1RM
- 推荐次数：${o?.repsMin||6}-${o?.repsMax||10}次
- 组间间歇：${o?.restMin||60}-${o?.restMax||120}s

### 编排红线
1.大重量不放在训练末尾
2.下肢不连续高强度蹲+跳
3.旋转后不立刻大重量脊柱负重
4.左右腿单侧必须同组交替

### 技术红线
脊柱中立位/膝不内扣不锁死/优先髋铰链/落地屈膝缓冲/肩袖小幅度/弱侧加组不加重量

### 禁用动作
大重量腿屈伸、颈后推举/下拉、超大重量手臂弯举
`.trim()}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),n=t.X(0,[8948,7647,6400,7038],()=>s(3941));module.exports=n})();