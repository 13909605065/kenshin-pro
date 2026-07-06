"use strict";(()=>{var e={};e.id=8105,e.ids=[8105,257],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2048:e=>{e.exports=require("fs")},5822:e=>{e.exports=require("path")},3742:(e,s,t)=>{t.r(s),t.d(s,{originalPathname:()=>k,patchFetch:()=>x,requestAsyncStorage:()=>m,routeModule:()=>b,serverHooks:()=>h,staticGenerationAsyncStorage:()=>f});var a={};t.r(a),t.d(a,{POST:()=>g});var n=t(9303),o=t(8716),r=t(670),i=t(5784),l=t(5562),p=t(257),u=t(5281);let c=new Map,d={deepseek:{base:"https://api.deepseek.com/v1/chat/completions",model:"deepseek-chat",key:process.env.DEEPSEEK_API_KEY},doubao:{base:"https://ark.cn-beijing.volces.com/api/v3/chat/completions",model:process.env.DOUBAO_ENDPOINT||"",key:process.env.DOUBAO_API_KEY}};async function g(e){let s;let t=(0,i.$)(),{data:{user:a},error:n}=await t.auth.getUser();if(n||!a)return Response.json({code:"auth-required",message:"请先登录"},{status:401});let o=Date.now(),r=c.get(a.id);if(r&&o-r<15e3)return Response.json({code:"rate-limited",message:"请稍后再试"},{status:429});c.set(a.id,o);try{s=await e.json()}catch{return Response.json({code:"invalid",message:"无效请求"},{status:400})}let{exerciseIds:g,exerciseParams:b,phase:m,goal:f,injuries:h}=s;if(!g||g.length<2)return Response.json({results:[{status:"skip",label:"数据不足",reason:"至少需要2个动作才能校验"}]});let k=g.map((e,s)=>{let t=l.ls.find(s=>s.id===e),a=b[e]||{sets:3,reps:8,rest:90};return`#${s+1} ${t?.name||e} | 部位:${t?.body_part||"未知"} | 器械:${t?.equipment||"未知"} | ${a.sets}组\xd7${a.reps}次 间歇${a.rest}s`}).join("\n"),x={preseason:"季前准备",competition:"赛季中",recovery:"恢复期",offseason:"休赛期"},M={strength:"最大力量",power:"爆发力",agility:"协调灵敏",mas_endurance:"专项耐力"},y=["力量训练 动作顺序 编排 原则","组数 次数 间歇 负荷 设计",`${x[m]||m} 力量训练 周期`,`${M[f]||f} 训练 方案`,"拮抗肌群 超级组 交替训练","复合动作 孤立动作 顺序","关节压力 伤病预防 力量训练","足球 力量训练 体能"];h.length>0&&y.push(`伤病 ${h.join(" ")} 训练 禁忌 动作`);let P="",$=new Set;for(let e of y){let s=(0,p.getKnowledgeContext)(e);s&&!$.has(s.slice(0,50))&&($.add(s.slice(0,50)),P+=s)}let w=(0,u.TN)(m,f),j=`你是一名职业足球体能教练。你需要按照以下教练审定的规则审核一份力量训练方案。

${w}

## 审核维度（8项，基于上述规则）

1. **编排顺序**：是否按「爆发力→单侧下肢→双侧复合→上肢推拉→抗旋核心→孤立」顺序排列？违反编排红线？（如大重量在末尾、下肢连续高强度蹲+跳）
2. **单侧占比**：单侧下肢动作是否≥40%？两侧是否均衡？
3. **三平面配比**：矢状面≈50%、冠状面≈30%、水平面≈20%？是否严重偏向单一平面？
4. **复合/孤立配比**：复合≈80%、孤立≤20%？孤立动作是否仅限腘绳肌/小腿/肩袖？
5. **肌力平衡**：股四头肌:腘绳肌≈1:0.7~0.8？拉的训练量>推？是否有肩袖训练？
6. **负荷匹配**：当前阶段（${x[m]||m}）和目标（${M[f]||f}）的负荷/组数/次数/间歇是否在合理区间？
7. **技术安全**：有没有使用禁用动作（大重量腿屈伸、颈后推举/下拉、超大重量手臂弯举）？
8. **伤病规避**：${h.length>0?`伤病「${h.join("、")}」是否会因当前方案加重？`:"无伤病标记"}

${P}

## 输出格式
必须输出严格JSON，一行，无markdown包裹：
{"results":[
  {"label":"编排顺序","status":"pass|warn|fail","reason":"具体原因","suggestion":"改进建议"},
  {"label":"单侧占比","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"三平面配比","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"复合/孤立配比","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"肌力平衡","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"负荷匹配","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"技术安全","status":"pass|warn|fail","reason":"...","suggestion":"..."},
  {"label":"伤病规避","status":"pass|warn|fail","reason":"...","suggestion":"..."}
]}

status: pass=合规 warn=偏离建议 fail=违反红线
reason必须引用上述足球专项规则，给出具体动作编号。
suggestion必须是可操作的改进建议（重排顺序/替换动作/调整负荷）。`,v=`请审核以下力量训练方案：

${k}

伤病：${h.length>0?h.join("、"):"无"}
阶段：${x[m]||m}
目标：${M[f]||f}

请输出JSON校验结果。`,A=d.deepseek.key?d.deepseek:d.doubao.key&&d.doubao.model?d.doubao:null,I=d.deepseek.key&&d.doubao.key&&d.doubao.model?d.doubao:null;if(!A)return Response.json({results:[{status:"skip",label:"拮抗交替",reason:"AI 服务未配置"},{status:"skip",label:"大肌群优先",reason:"AI 服务未配置"},{status:"skip",label:"复合优先",reason:"AI 服务未配置"},{status:"skip",label:"强度递减",reason:"AI 服务未配置"},{status:"skip",label:"关节分散",reason:"AI 服务未配置"},{status:"skip",label:"伤病规避",reason:"AI 服务未配置"}]});let S=async e=>{let s=new AbortController,t=setTimeout(()=>s.abort(),2e4);try{return await fetch(e.base,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e.key}`},body:JSON.stringify({model:e.model,messages:[{role:"system",content:j},{role:"user",content:v}],max_tokens:2e3,stream:!1,temperature:.3}),signal:s.signal})}finally{clearTimeout(t)}};try{let e=await S(A).catch(()=>null);if(e&&e.ok||!I||(e=await S(I).catch(()=>null)),!e||!e.ok)throw Error("AI 接口不可用");let s=await e.json(),t=s.choices?.[0]?.message?.content||"",a=t.match(/\{[\s\S]*"results"[\s\S]*\}/);if(a){let e=JSON.parse(a[0]);return Response.json({results:e.results})}return Response.json({results:[{status:"skip",label:"AI 分析",reason:t.slice(0,500)||"AI 返回格式异常"}]})}catch(e){return console.error("Gym validation error:",e.message||e),Response.json({results:[{status:"skip",label:"编排顺序",reason:"AI 服务暂不可用，请稍后重试"},{status:"skip",label:"单侧占比",reason:"AI 服务暂不可用"},{status:"skip",label:"三平面配比",reason:"AI 服务暂不可用"},{status:"skip",label:"复合/孤立配比",reason:"AI 服务暂不可用"},{status:"skip",label:"肌力平衡",reason:"AI 服务暂不可用"},{status:"skip",label:"负荷匹配",reason:"AI 服务暂不可用"},{status:"skip",label:"技术安全",reason:"AI 服务暂不可用"},{status:"skip",label:"伤病规避",reason:"AI 服务暂不可用"}]})}}let b=new n.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/validate-gym/route",pathname:"/api/validate-gym",filename:"route",bundlePath:"app/api/validate-gym/route"},resolvedPagePath:"/Users/kenshin/Desktop/Kenshin体能/app/api/validate-gym/route.ts",nextConfigOutput:"standalone",userland:a}),{requestAsyncStorage:m,staticGenerationAsyncStorage:f,serverHooks:h}=b,k="/api/validate-gym/route";function x(){return(0,r.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:f})}},5562:(e,s,t)=>{t.d(s,{ls:()=>o});var a=t(7420);let n={杠铃:"barbell",哑铃:"dumbbell",壶铃:"kettlebell",悬吊:"cable",自重:"bodyweight",弹力带:"band",药球:"med_ball",波速球:"bosu",跳箱:"跳箱"},o=Object.entries(a.TX).map(([e,s])=>({id:e,name:s.name,body_part:s.bodyPart||"全身",equipment:n[s.equipment||""]||"bodyweight",type:s.exerciseType||"力量",description:"",cue_points:s.cue_points||[],progression:s.progression||"",regression:s.regression||""}))},257:(e,s,t)=>{t.d(s,{S:()=>u,getKnowledgeContext:()=>c});var a=t(2048),n=t.n(a),o=t(5822),r=t.n(o);let i=r().join(process.cwd(),"kb/ocr-output"),l=null,p=new Map;function u(e,s=5){let t=function(){if(l)return l;try{return l=JSON.parse(n().readFileSync(r().join(i,"_index.json"),"utf8"))}catch{return{books:{},totalChars:0,totalFiles:0,topBooks:[]}}}(),a=e.toLowerCase().split(/\s+/).filter(e=>e.length>1);if(0===a.length)return[];let o=[];for(let[e,s]of Object.entries(t.books))if(!s.scanned&&!(s.chars<500))try{let t=p.get(e);for(let l of(t||(t=n().readFileSync(r().join(i,s.file),"utf8"),p.set(e,t)),t.split(/\n\n+/).filter(e=>e.length>80))){let s=0,t=l.toLowerCase();for(let e of a)s+=(t.match(RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"))||[]).length;s>0&&o.push({book:e,passage:l.slice(0,600).replace(/\n/g," "),relevance:s})}}catch{}return o.sort((e,s)=>s.relevance-e.relevance).slice(0,s)}function c(e,s,t){let a=[e];s&&a.push(s),t&&a.push(t);let n=[],o=new Set;for(let e of a)for(let s of u(e,3)){let e=s.passage.slice(0,40);o.has(e)||(o.add(e),n.push(s))}return 0===n.length?"":"\n\n【参考知识库 — 基于以下专业书籍】\n"+n.map(e=>`📖 ${e.book.slice(0,60)}: ${e.passage.slice(0,300)}`).join("\n")+"\n【以上知识仅供参考】\n"}},5281:(e,s,t)=>{t.d(s,{TN:()=>o});let a={power:{loadPctMin:30,loadPctMax:60,repsMin:2,repsMax:6,setsMin:3,setsMax:5,restMin:120,restMax:180,tempo:"向心极速爆发，离心慢速控制",note:"足球核心目标，备赛期主力，赛季中减量保留"},strength:{loadPctMin:60,loadPctMax:75,repsMin:6,repsMax:10,setsMin:3,setsMax:4,restMin:90,restMax:120,tempo:"中等速度，全程躯干刚性",note:"主流负荷区间，支撑/卡位/对抗"},agility:{loadPctMin:40,loadPctMax:60,repsMin:12,repsMax:20,setsMin:3,setsMax:4,restMin:45,restMax:60,tempo:"流畅持续，抗疲劳",note:"赛季中适用，90分钟不掉速"},mas_endurance:{loadPctMin:0,loadPctMax:40,repsMin:15,repsMax:20,setsMin:2,setsMax:3,restMin:30,restMax:60,tempo:"慢速精准，感受目标肌肉",note:"腘绳肌/肩袖/臀中肌防伤"}},n={offseason:{sessionsPerWeek:4,capacityPct:1,loadMaxPct:80,focus:"基础力量搭建",forbidden:[]},preseason:{sessionsPerWeek:3,capacityPct:.85,loadMaxPct:75,focus:"爆发力+动作速度",forbidden:["极限大重量(>85%1RM)"]},competition:{sessionsPerWeek:2,capacityPct:.6,loadMaxPct:65,focus:"维持+激活+防伤",forbidden:["大重量深蹲","大重量硬拉","极限组","连续下肢高强度"]},recovery:{sessionsPerWeek:1,capacityPct:.3,loadMaxPct:50,focus:"轻力量+每日激活放松",forbidden:["所有高强度组","爆发力动作","大重量"]}};function o(e,s){let t=n[e],o=a[s];return`
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
- 阶段：${t?.focus||"维持"}，每周${t?.sessionsPerWeek||2}次
- 最大负荷：${t?.loadMaxPct||65}%1RM
- 禁止：${t?.forbidden?.join("、")||"无"}
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
`.trim()}}};var s=require("../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),a=s.X(0,[8948,7647,6400,7038],()=>t(3742));module.exports=a})();