"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, User, Flag, Grid3X3 } from "lucide-react";

interface Item {
  name: string; filename: string;
}

interface Props { onFieldSelect?: (filename: string) => void; }

const TABS = [
  { id: "markers", icon: <User className="w-3.5 h-3.5" />, label: "标记" },
  { id: "equipment", icon: <Flag className="w-3.5 h-3.5" />, label: "器材" },
  { id: "fields", icon: <Grid3X3 className="w-3.5 h-3.5" />, label: "场地" },
] as const;

const MARKERS: Item[] = [
  { name: "实线", filename: "虚线" },
  { name: "圆环", filename: "圆形环" },
  { name: "人墙", filename: "人墙" },
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
];

const FIELD_LIST = ["场地","场地2","场地3","场地4","场地5","场地6","场地7","场地8","场地9","场地10","场地11"];

export function EquipmentPalette({ onFieldSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<string>("markers");

  const w = collapsed ? "w-[52px]" : "w-[112px]";

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

        {/* Tab: Equipment */}
        {tab === "equipment" && (
          <div className="p-1.5">
            {!collapsed && <p className="text-[10px] text-gray-500 mb-1 px-0.5">教具</p>}
            <div className={`${collapsed ? "flex flex-col gap-1" : "grid grid-cols-2 gap-1"}`}>
              {EQUIPMENT.map(mkItem)}
            </div>
          </div>
        )}

        {/* Tab: Fields */}
        {tab === "fields" && (
          <div className="p-1.5">
            {!collapsed && <p className="text-[10px] text-gray-500 mb-1 px-0.5">场地底图</p>}
            <div className={`${collapsed ? "flex flex-col gap-1" : "grid grid-cols-3 gap-1"}`}>
              {FIELD_LIST.map((field) => (
                <button key={field} onClick={() => onFieldSelect?.(field)}
                  className="relative group" title={collapsed ? field : undefined}>
                  <img src={`/equipment/${field}.png`} alt={field}
                    className="w-full aspect-[4/3] object-cover rounded border border-pitch-600 group-hover:border-neon-pink transition" />
                  {!collapsed && (
                    <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white px-0.5 rounded whitespace-nowrap">{field}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
