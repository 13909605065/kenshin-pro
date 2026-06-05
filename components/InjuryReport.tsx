/**
 * 运动员主动报伤 — 人体图点选部位
 */

'use client';

import { useState } from 'react';

// ═══════════════════════════════════════════

export interface InjuryReport {
  id: string;
  athleteId: string;
  date: string;
  bodyPart: string;
  side: 'left' | 'right' | 'bilateral' | 'central';
  injuryType: 'strain' | 'sprain' | 'contusion' | 'fracture' | 'tendinopathy' | 'other';
  severity: 1 | 2 | 3 | 4;
  mechanism: 'acute_contact' | 'acute_non_contact' | 'overuse' | 'unknown';
  occurredDuring: 'training' | 'match' | 'other';
  canContinue: boolean;
  notes: string;
  coachNotified: boolean;
}

const STORAGE_KEY = 'kenshin_injury_reports';

const BODY_PARTS_ANTERIOR = [
  { id: 'head', label: '头部', x: 50, y: 5, r: 6 },
  { id: 'neck', label: '颈部', x: 50, y: 12, r: 4 },
  { id: 'shoulder_l', label: '左肩', x: 35, y: 17, r: 5 },
  { id: 'shoulder_r', label: '右肩', x: 65, y: 17, r: 5 },
  { id: 'chest', label: '胸部', x: 50, y: 22, r: 7 },
  { id: 'elbow_l', label: '左肘', x: 28, y: 30, r: 3 },
  { id: 'elbow_r', label: '右肘', x: 72, y: 30, r: 3 },
  { id: 'abdomen', label: '腹部', x: 50, y: 32, r: 6 },
  { id: 'wrist_l', label: '左腕', x: 23, y: 37, r: 3 },
  { id: 'wrist_r', label: '右腕', x: 77, y: 37, r: 3 },
  { id: 'hip_l', label: '左髋', x: 42, y: 40, r: 5 },
  { id: 'hip_r', label: '右髋', x: 58, y: 40, r: 5 },
  { id: 'thigh_l', label: '左大腿', x: 40, y: 50, r: 6 },
  { id: 'thigh_r', label: '右大腿', x: 60, y: 50, r: 6 },
  { id: 'knee_l', label: '左膝', x: 38, y: 58, r: 5 },
  { id: 'knee_r', label: '右膝', x: 62, y: 58, r: 5 },
  { id: 'shin_l', label: '左小腿', x: 40, y: 67, r: 5 },
  { id: 'shin_r', label: '右小腿', x: 60, y: 67, r: 5 },
  { id: 'ankle_l', label: '左踝', x: 40, y: 76, r: 4 },
  { id: 'ankle_r', label: '右踝', x: 60, y: 76, r: 4 },
  { id: 'foot_l', label: '左足', x: 40, y: 82, r: 4 },
  { id: 'foot_r', label: '右足', x: 60, y: 82, r: 4 },
];

const INJURY_TYPES = [
  { value: 'strain' as const, label: '肌肉拉伤' },
  { value: 'sprain' as const, label: '韧带扭伤' },
  { value: 'contusion' as const, label: '撞伤/挫伤' },
  { value: 'tendinopathy' as const, label: '肌腱病' },
  { value: 'fracture' as const, label: '骨折' },
  { value: 'other' as const, label: '其他' },
];

interface InjuryReportProps {
  athleteId?: string;
  onReport?: (report: InjuryReport) => void;
}

export function InjuryReportComponent({ athleteId = 'default', onReport }: InjuryReportProps) {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [injuryType, setInjuryType] = useState<InjuryReport['injuryType']>('strain');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4>(2);
  const [mechanism, setMechanism] = useState<InjuryReport['mechanism']>('unknown');
  const [occurredDuring, setOccurredDuring] = useState<InjuryReport['occurredDuring']>('training');
  const [canContinue, setCanContinue] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handlePartClick = (partId: string) => {
    setSelectedPart(partId);
    setShowForm(true);
  };

  const determineSide = (partId: string): InjuryReport['side'] => {
    if (partId.endsWith('_l')) return 'left';
    if (partId.endsWith('_r')) return 'right';
    return 'central';
  };

  const handleSubmit = () => {
    if (!selectedPart) return;
    const report: InjuryReport = {
      id: `inj_${Date.now()}`,
      athleteId,
      date: new Date().toISOString().slice(0, 10),
      bodyPart: selectedPart,
      side: determineSide(selectedPart),
      injuryType,
      severity,
      mechanism,
      occurredDuring,
      canContinue,
      notes,
      coachNotified: false,
    };

    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      existing.unshift(report);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 100)));
    } catch { /* ignore */ }

    setSubmitted(true);
    onReport?.(report);
  };

  if (submitted) {
    return (
      <div className="bg-[#0d0d0d] border border-[#d92525]/30 rounded-xl p-4 text-center">
        <div className="text-2xl mb-1">📋</div>
        <div className="text-sm text-[#d92525] font-bold">伤病报告已记录</div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          {selectedPart && BODY_PARTS_ANTERIOR.find(p => p.id === selectedPart)?.label} · 严重度 {severity}/4
        </div>
        <button onClick={() => { setSubmitted(false); setShowForm(false); setSelectedPart(null); }}
          className="mt-2 text-[10px] text-gray-400 hover:text-white underline">
          再次报伤
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">🩺 伤病自报</h3>

      {!showForm ? (
        <>
          <p className="text-[10px] text-gray-500">点击人体图上受伤的部位</p>
          {/* 简易人体图 SVG */}
          <div className="relative mx-auto" style={{ width: 150, height: 280 }}>
            <svg viewBox="0 0 100 90" className="w-full h-full">
              {/* 身体轮廓 */}
              <ellipse cx="50" cy="8" rx="8" ry="9" fill="none" stroke="#444" strokeWidth="1" />
              <line x1="50" y1="17" x2="50" y2="40" stroke="#444" strokeWidth="1" />
              <line x1="50" y1="20" x2="32" y2="34" stroke="#444" strokeWidth="1" />
              <line x1="50" y1="20" x2="68" y2="34" stroke="#444" strokeWidth="1" />
              <line x1="32" y1="34" x2="23" y2="45" stroke="#444" strokeWidth="1" />
              <line x1="68" y1="34" x2="77" y2="45" stroke="#444" strokeWidth="1" />
              <line x1="50" y1="40" x2="42" y2="63" stroke="#444" strokeWidth="1" />
              <line x1="50" y1="40" x2="58" y2="63" stroke="#444" strokeWidth="1" />
              <line x1="42" y1="63" x2="40" y2="78" stroke="#444" strokeWidth="1" />
              <line x1="58" y1="63" x2="60" y2="78" stroke="#444" strokeWidth="1" />
              <line x1="40" y1="78" x2="38" y2="88" stroke="#444" strokeWidth="1" />
              <line x1="60" y1="78" x2="62" y2="88" stroke="#444" strokeWidth="1" />

              {/* 可点击区域 */}
              {BODY_PARTS_ANTERIOR.map(part => (
                <circle key={part.id}
                  cx={part.x} cy={part.y} r={part.r}
                  fill={selectedPart === part.id ? '#d92525' : 'transparent'}
                  stroke={selectedPart === part.id ? '#d92525' : '#333'}
                  strokeWidth="0.5"
                  className="cursor-pointer hover:fill-red-900/30 transition"
                  onClick={() => handlePartClick(part.id)} />
              ))}
            </svg>
          </div>
        </>
      ) : (
        <>
          <div className="text-xs text-[#d92525] font-semibold">
            已选: {BODY_PARTS_ANTERIOR.find(p => p.id === selectedPart)?.label}
            <button onClick={() => setShowForm(false)} className="ml-2 text-gray-400 text-[10px]">重选</button>
          </div>

          {/* 伤病类型 */}
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">伤病类型</label>
            <div className="flex flex-wrap gap-1.5">
              {INJURY_TYPES.map(t => (
                <button key={t.value}
                  onClick={() => setInjuryType(t.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] ${
                    injuryType === t.value ? 'bg-[#d92525]/20 text-[#d92525] border border-[#d92525]/30' : 'bg-[#1a1a1a] text-gray-400'
                  }`}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* 严重程度 */}
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">严重程度</label>
            <div className="flex gap-1.5">
              {[
                { v: 1, l: '轻度\n可继续' },
                { v: 2, l: '中度\n可调整' },
                { v: 3, l: '较重\n部分受限' },
                { v: 4, l: '严重\n不能训练' },
              ].map(s => (
                <button key={s.v}
                  onClick={() => setSeverity(s.v as 1|2|3|4)}
                  className={`flex-1 py-2 rounded-lg text-[9px] whitespace-pre-line text-center leading-tight ${
                    severity === s.v ? 'bg-[#d92525]/20 text-[#d92525] border border-[#d92525]/30' : 'bg-[#1a1a1a] text-gray-400'
                  }`}>{s.l}</button>
              ))}
            </div>
          </div>

          {/* 发生场景 */}
          <div className="flex gap-2">
            <select value={occurredDuring} onChange={e => setOccurredDuring(e.target.value as any)}
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
              <option value="training">训练中发生</option>
              <option value="match">比赛中发生</option>
              <option value="other">其他</option>
            </select>
            <select value={mechanism} onChange={e => setMechanism(e.target.value as any)}
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white">
              <option value="unknown">机制不明</option>
              <option value="acute_contact">接触性(对抗)</option>
              <option value="acute_non_contact">非接触性(自伤)</option>
              <option value="overuse">过度使用</option>
            </select>
          </div>

          {/* 能否继续 */}
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">能否继续训练？</label>
            <div className="flex gap-1.5">
              <button onClick={() => setCanContinue(true)}
                className={`flex-1 py-2 rounded-lg text-[10px] ${canContinue ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#1a1a1a] text-gray-400'}`}>
                ✅ 可以继续
              </button>
              <button onClick={() => setCanContinue(false)}
                className={`flex-1 py-2 rounded-lg text-[10px] ${!canContinue ? 'bg-[#d92525]/20 text-[#d92525] border border-[#d92525]/30' : 'bg-[#1a1a1a] text-gray-400'}`}>
                ❌ 需要休息
              </button>
            </div>
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="补充说明…"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 resize-none"
            rows={2} />

          <button onClick={handleSubmit}
            className="w-full py-3 bg-[#d92525] hover:bg-[#b71d1d] text-white rounded-xl text-sm font-bold transition">
            提交伤情报备
          </button>
        </>
      )}
    </div>
  );
}
