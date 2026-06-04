"use client";

import { useLocalStorage } from "./useLocalStorage";

export interface EquipmentItem {
  name: string;
  count: number;
}

const DEFAULT_COUNTS: Record<string, number> = {
  "标志盘": 20,
  "标志桶": 10,
  "标志杆": 8,
  "号坎": 12,
  "足球": 15,
  "小球门": 4,
  "标准门": 2,
  "小栏架": 10,
  "高栏架": 6,
  "绳梯": 4,
  "敏捷圈": 8,
  "弹力带": 10,
  "药球": 4,
  "瑜伽球": 2,
  "泡沫轴": 4,
};

export function useEquipmentInventory() {
  const [items, setItems] = useLocalStorage<EquipmentItem[]>(
    "kenshin_equipment_inventory",
    []
  );

  const setCount = (name: string, count: number) => {
    setItems((prev: EquipmentItem[]) => {
      const existing = prev.find((i) => i.name === name);
      if (existing) {
        if (count <= 0) {
          return prev.filter((i) => i.name !== name);
        }
        return prev.map((i) => (i.name === name ? { ...i, count } : i));
      }
      if (count <= 0) return prev;
      return [...prev, { name, count }];
    });
  };

  const getCount = (name: string): number => {
    return items.find((i) => i.name === name)?.count ?? 0;
  };

  const ensureDefault = (name: string) => {
    if (!items.find((i) => i.name === name)) {
      const defaultCount = DEFAULT_COUNTS[name] || 10;
      setItems((prev: EquipmentItem[]) => [...prev, { name, count: defaultCount }]);
    }
  };

  const remove = (name: string) => {
    setItems((prev: EquipmentItem[]) => prev.filter((i) => i.name !== name));
  };

  /** Get a summary string of all items for AI prompt, e.g. "标志盘20个、足球15个" */
  const getSummary = (): string => {
    return items
      .filter((i) => i.count > 0)
      .map((i) => `${i.name}${i.count}个`)
      .join("、");
  };

  /** Get summary only for selected equipment names, with defaults for unset items */
  const getSummaryForSelected = (selected: string[]): string => {
    return selected
      .map((name) => {
        const item = items.find((i) => i.name === name);
        const count = item?.count ?? DEFAULT_COUNTS[name] ?? 10;
        return `${name}${count}个`;
      })
      .join("、");
  };

  return {
    items,
    setCount,
    getCount,
    ensureDefault,
    remove,
    getSummary,
    getSummaryForSelected,
  };
}
