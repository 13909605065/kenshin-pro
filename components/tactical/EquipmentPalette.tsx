"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, User, Flag, Grid3X3, X, Check } from "lucide-react";

interface Item {
  name: string; filename: string;
}

interface Props { onFieldSelect?: (filename: string) => void; }

const TABS = [
  { id: "equipment", icon: <Flag className="w-3.5 h-3.5" />, label: "器材" },
  { id: "markers", icon: <User className="w-3.5 h-3.5" />, label: "标记" },
  { id: "fields", icon: <Grid3X3 className="w-3.5 h-3.5" />, label: "场地" },
] as const;

const MARKERS: Item[] = [
  { name: "实线", filename: "虚线" },
];

const EQUIPMENT: Item[] = [
  { name: "足球", filename: "足球" },
  { name: "橙色标志盘", filename: "橙色标志盘" },
  { name: "红色标志盘", filename: "红色标志盘" },
  { name: "黄色标志盘", filename: "黄色标志盘" },
  { name: "蓝色标志盘", filename: "蓝色标志盘" },
  { name: "绿色标志盘", filename: "绿色标志盘" },
  { name: "标志杆", filename: "标志杆" },
  { name: "标志桶", filename: "标志桶" },
  { name: "角旗杆", filename: "角旗杆" },
  { name: "球门", filename: "球门" },
  { name: "高栏架", filename: "高栏架" },
  { name: "小栏架", filename: "小栏架" },
  { name: "绳梯", filename: "绳梯" },
  { name: "长绳梯", filename: "长绳梯" },
  { name: "敏捷环", filename: "圆形环" },
  { name: "人墙", filename: "人墙" },
];

const FIELD_LIST = ["default", "场地", "场地2", "场地3", "场地4", "场地5", "场地6", "场地7", "场地8", "场地9", "场地10", "场地11"];

export function EquipmentPalette({ onFieldSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<string>("equipment");
  const [previewField, setPreviewField] = useState<string | null>(null);

  const w = collapsed ? "w-[52px]" : "w-[112px]";

  const handleFieldClick = (field: string) => {
    setPreviewField(field);
  };

  const handleUseField = () => {
    if (previewField) {
      onFieldSelect?.(previewField);
    }
    setPreviewField(null);
  };

  const handleDragStart = (e: React.DragEvent, item: Item) => {
    e.dataTransfer.setData("application/equipment", JSON.stringify({
      src: `/equipment/${item.filename}.png`,
      name: item.name,
    }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const mkItem = (item: Item) => (
    <div
      key={item.filename}
      draggable
      onDragStart={(e) => handleDragStart(e, item)}
      className="flex flex-col items-center p-1 rounded hover:bg-pitch-700 cursor-grab transition group"
      title={collapsed ? item.name : undefined}
    >
      <img src={`/equipment/${item.filename}.png`} alt={item.name}
        className={`object-contain group-hover:scale-110 transition ${collapsed ? "w-8 h-8" : "w-10 h-10"}`}
        draggable={false} />
      {!collapsed && (
        <span className="text-[9px] text-gray-400 mt-0.5 text-center whitespace-nowrap overflow-hidden text-ellipsis w-full">{item.name}</span>
      )}
    </div>
  );

  return (
    <div className={`${w} bg-pitch-800 border-r border-pitch-600 flex flex-col flex-shrink-0 transition-all duration-200`}>
      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-7 text-gray-500 hover:text-white hover:bg-pitch-700 transition border-b border-pitch-600"
        title={collapsed ? "展开" : "折叠"}>
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Tabs */}
      {!collapsed && (
        <div className="flex border-b border-pitch-600">
          {TABS.map((t) => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] transition border-b-2 ${
                tab === t.id ? "border-neon-pink text-neon-pink" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Tab: Equipment (default first tab) */}
        {tab === "equipment" && (
          <div className="p-1.5 space-y-2">
            <div>
              {!collapsed && <p className="text-[10px] text-gray-500 mb-1 px-0.5">教具</p>}
              <div className={`${collapsed ? "flex flex-col gap-1" : "grid grid-cols-2 gap-1"}`}>
                {EQUIPMENT.map(mkItem)}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Markers */}
        {tab === "markers" && (
          <div className="p-1.5 space-y-2">
            {/* Player markers */}
            <div>
              {!collapsed && <p className="text-[10px] text-gray-500 mb-1 px-0.5">球员</p>}
              <div className={`${collapsed ? "flex flex-col gap-1.5" : "flex gap-2"}`}>
                {[
                  { c: "bg-neon-pink", t: "主队" },
                  { c: "bg-blue-500", t: "客队" },
                ].map((p) => (
                  <div key={p.t} draggable
                    className={`flex items-center justify-center rounded-full ${p.c} border-2 border-white cursor-grab hover:scale-110 transition ${collapsed ? "w-8 h-8 mx-auto" : "w-11 h-11"}`}
                    title={p.t}>
                    <span className={`text-white font-bold ${collapsed ? "text-xs" : "text-sm"}`}>{p.t[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Drawing markers */}
            <div>
              {!collapsed && <p className="text-[10px] text-gray-500 mb-1 px-0.5">绘图</p>}
              <div className={`${collapsed ? "flex flex-col gap-1" : "grid grid-cols-2 gap-1"}`}>
                {MARKERS.map(mkItem)}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Fields */}
        {tab === "fields" && (
          <div className="p-1.5">
            {!collapsed && <p className="text-[10px] text-gray-500 mb-1 px-0.5">场地底图</p>}
            <div className={`${collapsed ? "flex flex-col gap-1" : "grid grid-cols-2 gap-2"}`}>
              {FIELD_LIST.map((field) => (
                <button key={field} onClick={() => handleFieldClick(field)}
                  className="relative group" title={collapsed ? field : "点击放大预览"}>
                  {field === "default" ? (
                    <div className="w-full aspect-[4/3] rounded-lg border border-pitch-600 group-hover:border-neon-pink transition bg-green-700 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">标准全场</span>
                    </div>
                  ) : (
                    <img src={`/equipment/${field}.png`} alt={field}
                      className="w-full aspect-[4/3] object-cover rounded-lg border border-pitch-600 group-hover:border-neon-pink transition" />
                  )}
                  {!collapsed && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1 py-0.5 rounded">
                      {field === "default" ? "标准" : field.replace("场地", "")}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded">点击放大</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Field Preview Modal */}
        {previewField && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewField(null)}>
            <div className="bg-pitch-800 rounded-xl overflow-hidden max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-pitch-600">
                <h3 className="text-white text-sm font-bold">
                  {previewField === "default" ? "标准全场" : previewField}
                </h3>
                <button onClick={() => setPreviewField(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              {previewField === "default" ? (
                <div className="w-full aspect-[1050/680] bg-green-700 flex items-center justify-center" style={{ maxHeight: "60vh" }}>
                  <div className="text-white/60 text-sm">标准11人制足球场（矢量绘制，无边框）</div>
                </div>
              ) : (
                <img src={`/equipment/${previewField}.png`} alt={previewField}
                  className="w-full object-contain" style={{ maxHeight: "60vh" }} />
              )}
              <div className="flex gap-2 p-3 border-t border-pitch-600">
                <button onClick={handleUseField}
                  className="flex-1 py-2 bg-neon-pink text-black font-bold rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-neon-pink/90 transition">
                  <Check className="w-4 h-4" />使用此场地
                </button>
                <button onClick={() => setPreviewField(null)}
                  className="px-4 py-2 bg-pitch-700 text-gray-300 rounded-lg text-sm hover:bg-pitch-600 transition">
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
