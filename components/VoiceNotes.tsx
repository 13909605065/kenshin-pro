'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, X, ChevronUp, ChevronDown } from 'lucide-react';

// ── types ──

interface VoiceNote {
  id: string;
  raw: string;
  player: string;
  exercise: string;
  note: string;
  timestamp: string;
}

interface Props {
  players: { name: string }[];   // from roster
  activeModules?: any[];         // current plan modules (optional)
  planId?: string | null;
}

const STORAGE_KEY = 'kenshin_voice_notes';
const MAX_NOTES = 50;

// ── voice note storage ──

function loadNotes(): VoiceNote[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveNotes(notes: VoiceNote[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.slice(0, MAX_NOTES))); } catch {}
}

function addNote(note: VoiceNote) {
  const notes = [note, ...loadNotes()].slice(0, MAX_NOTES);
  saveNotes(notes);
}

// ── parsing helpers ──

/**
 * Parse Chinese voice transcript into structured note.
 * Expected patterns:
 *   "王XX 跳箱第五组高度降到60" → player="王XX", exercise="跳箱", note="第5组高度降到60cm"
 *   "李X 深蹲第三组吃力" → player="李X", exercise="深蹲", note="第3组吃力"
 *   "张XX 卧推加重到80公斤" → player="张XX", exercise="卧推", note="加重到80公斤"
 *   "全部人休息两分钟" → player="全员", exercise="休息", note="两分钟"
 */
function parseTranscript(
  transcript: string,
  knownPlayers: { name: string }[],
): Omit<VoiceNote, 'id' | 'timestamp' | 'raw'> {
  const trimmed = transcript.trim();
  const names = knownPlayers.map(p => p.name).sort((a, b) => b.length - a.length);

  let player = '';
  let rest = trimmed;

  // Match known player name at the start
  for (const n of names) {
    if (trimmed.startsWith(n)) {
      player = n;
      rest = trimmed.slice(n.length);
      break;
    }
  }

  // Fallback: try to match a 2-3 char name pattern (like "王XX", "李X")
  if (!player && trimmed.length >= 2) {
    const nameMatch = trimmed.match(/^([一-龥]{2,4})\s/);
    if (nameMatch) {
      player = nameMatch[1];
      rest = trimmed.slice(nameMatch[1].length).trim();
    }
  }

  // If still no match, handle "全员" / "全部人" patterns
  if (!player) {
    if (/^全[部员]/ .test(trimmed)) {
      player = '全员';
      rest = trimmed.replace(/^全[部员]人?/, '').trim();
    }
  }

  // No player identified — use raw as note
  if (!player) {
    return { player: '', exercise: '', note: trimmed };
  }

  // Try to extract exercise name from rest
  // Common exercises and their aliases
  const exercisePatterns = [
    '跳箱', '深蹲', '卧推', '硬拉', '高翻', '抓举', '挺举',
    '引体向上', '俯卧撑', '划船', '推举', '弯举', '臂屈伸',
    '臀桥', '北欧弯举', '平板支撑', '侧桥', '单腿平衡',
    '弓步', '保加利亚分腿蹲', '罗马尼亚硬拉', '臀推',
    '冲刺', '折返跑', '有氧', '间歇跑', '变向',
    '核心', '拉伸', '泡沫轴', '热身', '放松',
    '农夫行走', '壶铃摆荡', '药球', '战绳',
  ];

  let exercise = '';
  let note = rest;

  for (const ex of exercisePatterns) {
    const idx = rest.indexOf(ex);
    if (idx !== -1) {
      // Grab text before exercise as possible prefix (like "继续" in "继续深蹲")
      const before = rest.slice(0, idx);
      exercise = ex;
      note = (before + rest.slice(idx + ex.length)).trim();
      if (!note) note = '—';
      break;
    }
  }

  // Normalize note: replace bare numbers with formatted ones
  // e.g. "第五组高度降到60" → normalize spacing/format
  note = note
    .replace(/第(\d+)组/g, '第$1组')
    .replace(/降到(\d+)/g, '降到$1')
    .replace(/(\d+)公斤?/g, '$1kg')
    .replace(/(\d+)cm/g, '$1cm');

  return { player, exercise, note };
}

// ── component ──

export default function VoiceNotes({ players, activeModules, planId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState<VoiceNote[]>(() => loadNotes().slice(0, 3));
  const [error, setError] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState('');
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const speechSupported = useRef<boolean>(false);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    speechSupported.current = !!SpeechRecognition;
  }, []);

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 2500);
  };

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setShowFallbackInput(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setRecording(false);

      // Parse and save
      const parsed = parseTranscript(text, players);
      const note: VoiceNote = {
        id: `vn_${Date.now()}`,
        raw: text,
        player: parsed.player || '',
        exercise: parsed.exercise || '',
        note: parsed.note || text,
        timestamp: new Date().toISOString(),
      };

      addNote(note);
      setNotes(loadNotes().slice(0, 3));
      showToast(parsed.player
        ? `${parsed.player} · ${parsed.exercise || '备注'} 已记录`
        : '语音备注已记录');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setRecording(false);
      if (event.error === 'not-allowed') {
        setError('麦克风权限被拒绝，请在浏览器设置中开启');
      } else if (event.error === 'network') {
        setShowFallbackInput(true);
      } else {
        setShowFallbackInput(true);
      }
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setError(null);
  }, [players]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  }, []);

  const handleFallbackSubmit = useCallback(() => {
    if (!fallbackText.trim()) return;
    const parsed = parseTranscript(fallbackText.trim(), players);
    const note: VoiceNote = {
      id: `vn_${Date.now()}`,
      raw: fallbackText.trim(),
      player: parsed.player || '',
      exercise: parsed.exercise || '',
      note: parsed.note || fallbackText.trim(),
      timestamp: new Date().toISOString(),
    };

    addNote(note);
    setNotes(loadNotes().slice(0, 3));
    setFallbackText('');
    setShowFallbackInput(false);
    showToast(parsed.player
      ? `${parsed.player} · ${parsed.exercise || '备注'} 已记录`
      : '快速备注已记录');
  }, [fallbackText, players]);

  const recentNotes = loadNotes().slice(0, 3);

  return (
    <>
      {/* Floating mic button */}
      <div className="fixed bottom-24 left-4 z-30 flex flex-col items-start gap-2">
        {/* Saved toast */}
        {savedToast && (
          <div className="bg-green-500/90 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg animate-in slide-in-from-left-2">
            ✓ {savedToast}
          </div>
        )}

        {/* Expanded panel */}
        {expanded && (
          <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 w-64 shadow-2xl space-y-2 max-h-[320px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-semibold">🎤 语音备注</span>
              <button onClick={() => setExpanded(false)} className="text-gray-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Recording status */}
            {recording && (
              <div className="flex items-center gap-2 p-2 bg-[#992828]/10 border border-[#992828]/30 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-[#992828] animate-pulse" />
                <span className="text-[10px] text-[#992828] font-medium">录音中…</span>
                <button onClick={stopRecording} className="ml-auto text-[9px] text-gray-400 hover:text-white">
                  停止
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400">
                {error}
              </div>
            )}

            {/* Fallback text input */}
            {showFallbackInput && !speechSupported.current && (
              <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2">
                <p className="text-[10px] text-gray-500 mb-1">语音暂不可用（需要 Chrome），输入快捷备注：</p>
                <textarea
                  value={fallbackText}
                  onChange={e => setFallbackText(e.target.value)}
                  placeholder="如：王XX 跳箱第五组高度降到60"
                  className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 resize-none"
                  rows={2}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFallbackSubmit(); }
                  }}
                />
                <div className="flex gap-1 mt-1">
                  <button onClick={handleFallbackSubmit}
                    className="flex-1 py-1 bg-[#992828] text-white rounded text-[10px] font-bold">
                    保存
                  </button>
                  <button onClick={() => setShowFallbackInput(false)}
                    className="px-2 py-1 bg-[#1a1a1a] text-gray-400 rounded text-[10px]">
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* Show fallback input toggle when speech is not supported but was dismissed */}
            {!speechSupported.current && !showFallbackInput && !recording && (
              <button onClick={() => setShowFallbackInput(true)}
                className="w-full py-1.5 text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] border border-dashed border-[#333] rounded-lg transition">
                ✏️ 快捷文本输入
              </button>
            )}

            {/* Quick templates */}
            {!recording && !showFallbackInput && (
              <div className="space-y-1">
                <p className="text-[9px] text-gray-600">快捷模板（点击填入）</p>
                <div className="flex flex-wrap gap-1">
                  {['全员休息两分钟', '全员补水', '下一组开始', '最后一组'].map(t => (
                    <button key={t} onClick={() => {
                      setFallbackText(t);
                      setShowFallbackInput(true);
                    }}
                      className="text-[9px] px-1.5 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-gray-400 hover:text-white transition">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent notes */}
            {recentNotes.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-600">最近备注</span>
                </div>
                {recentNotes.map(n => (
                  <div key={n.id} className="bg-[#1a1a1a] rounded-lg p-1.5 text-[10px]">
                    <div className="flex items-center gap-1">
                      {n.player && (
                        <span className="text-[#992828] font-medium">{n.player}</span>
                      )}
                      {n.exercise && (
                        <span className="text-gray-400">· {n.exercise}</span>
                      )}
                    </div>
                    <p className="text-gray-500 truncate mt-0.5">{n.note}</p>
                    <p className="text-[8px] text-gray-600 mt-0.5">
                      {new Date(n.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main mic button */}
        <button
          onClick={() => {
            if (recording) {
              stopRecording();
            } else if (expanded) {
              startRecording();
            } else {
              setExpanded(true);
            }
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
            recording
              ? 'bg-[#992828] scale-110 animate-pulse ring-2 ring-[#992828]/50'
              : 'bg-[#992828] hover:bg-[#7a1e1e] hover:scale-105 active:scale-95'
          }`}
          title="语音备注"
        >
          {recording ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
    </>
  );
}
