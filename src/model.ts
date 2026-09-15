export const CATEGORIES = {
  work: {
    label: "工作",
    color: "#8aaddd",
    pale: "#edf2fa",
    icon: "briefcase-business",
  },
  life: { label: "生活", color: "#e6ba61", pale: "#faf3e4", icon: "coffee" },
  rest: { label: "休息", color: "#8cbea9", pale: "#ecf5f0", icon: "moon" },
  move: {
    label: "运动",
    color: "#c2b4d9",
    pale: "#f1edf7",
    icon: "footprints",
  },
  people: { label: "相聚", color: "#dc9e91", pale: "#faeeea", icon: "heart" },
  other: { label: "其他", color: "#b6bdc8", pale: "#f0f2f5", icon: "ellipsis" },
} as const;
export type Category = keyof typeof CATEGORIES;
export type Energy = "low" | "mid" | "high";
export const ENERGY = { low: "想歇一歇", mid: "还不错", high: "很有精神" };
export type Entry = {
  id: string;
  title: string;
  start: string;
  end: string;
  category: Category;
  allDay?: boolean;
  source: "manual" | "calendar";
};
export type Day = {
  energy?: Energy;
  sleep?: "less" | "okay" | "enough";
  meals?: string[];
  coffees?: string[];
  note?: string;
};
export type Data = { version: 1; entries: Entry[]; days: Record<string, Day> };
export const emptyData = (): Data => ({ version: 1, entries: [], days: {} });
export function key(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const parseDay = (value: string) => new Date(`${value}T00:00:00`);
export const shiftDay = (date: Date, delta: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
export const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
export const monthLabel = (date: Date) =>
  `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
export const timeLabel = (value: string) =>
  new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
export function hours(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  const h = Math.floor(minutes / 60),
    m = Math.round(minutes % 60);
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}
export function entriesForDay(data: Data, dayKey: string): Entry[] {
  const start = parseDay(dayKey).getTime(),
    end = shiftDay(parseDay(dayKey), 1).getTime();
  return data.entries
    .filter((e) => Date.parse(e.start) < end && Date.parse(e.end) > start)
    .sort((a, b) => a.start.localeCompare(b.start));
}
export function minutesOnDay(entry: Entry, dayKey: string): number {
  if (entry.allDay) return 0;
  const start = parseDay(dayKey).getTime(),
    end = shiftDay(parseDay(dayKey), 1).getTime();
  return (
    Math.max(
      0,
      Math.min(Date.parse(entry.end), end) -
        Math.max(Date.parse(entry.start), start),
    ) / 60000
  );
}
// Merge overlapping intervals so a double-booked calendar does not inflate a day.
export function recordedMinutes(entries: Entry[], dayKey: string): number {
  const dayStart = parseDay(dayKey).getTime(),
    dayEnd = shiftDay(parseDay(dayKey), 1).getTime();
  const ranges = entries
    .filter((e) => !e.allDay)
    .map((e) => [
      Math.max(dayStart, Date.parse(e.start)),
      Math.min(dayEnd, Date.parse(e.end)),
    ])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    end = dayStart;
  for (const [a, b] of ranges) {
    total += Math.max(0, b - Math.max(a, end));
    end = Math.max(end, b);
  }
  return Math.round(total / 60000);
}
export function monthDays(month: Date): Date[] {
  return Array.from(
    {
      length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    },
    (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1),
  );
}
export function hasDay(data: Data, dayKey: string): boolean {
  const day = data.days[dayKey];
  return !!(
    entriesForDay(data, dayKey).length ||
    day?.energy ||
    day?.sleep ||
    day?.note ||
    day?.meals?.length ||
    day?.coffees?.length
  );
}
export function monthStats(data: Data, month: Date) {
  const days = monthDays(month);
  const categories = Object.keys(CATEGORIES).map((c) => ({
    category: c as Category,
    minutes: 0,
  }));
  let minutes = 0,
    count = 0,
    low = 0;
  for (const date of days) {
    const k = key(date),
      entries = entriesForDay(data, k);
    minutes += recordedMinutes(entries, k);
    if (hasDay(data, k)) count++;
    if (data.days[k]?.energy === "low") low++;
    for (const entry of entries)
      categories.find((c) => c.category === entry.category)!.minutes +=
        minutesOnDay(entry, k);
  }
  return { minutes, count, low, categories };
}
export function inferCategory(title: string): Category {
  if (
    /吃|餐|饭|咖啡|早餐|午餐|晚餐|做菜|买菜|lunch|dinner|breakfast|coffee/i.test(
      title,
    )
  )
    return "life";
  if (/休息|睡|散步|放空|午睡|rest|sleep/i.test(title)) return "rest";
  if (/运动|跑步|健身|游泳|瑜伽|球|run|gym|workout/i.test(title)) return "move";
  if (/朋友|约会|家人|相聚|梁姐|聚餐|date|family/i.test(title)) return "people";
  if (/工作|会议|写|方案|项目|开发|复盘|设计|meeting|work|review/i.test(title))
    return "work";
  return "other";
}
export function demoData(today: Date): Data {
  const data = emptyData();
  for (let i = 1; i <= today.getDate(); i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), i),
      k = key(d);
    if (i % 9 === 0) continue;
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const items: [string, Category, number, number][] = weekend
      ? [
          ["睡个自然醒", "rest", 9, 90],
          ["和梁姐吃顿饭", "people", 12, 90],
          ["慢慢走一段", "move", 16, 45],
        ]
      : [
          ["给喜欢的项目一点时间", "work", 9, 90 + (i % 3) * 30],
          ["认真吃午饭", "life", 12, 45],
          ["下午的工作", "work", 14, 90],
          ["给自己留一点空白", "rest", 18, 45],
        ];
    data.entries.push(
      ...items.map(([title, category, hour, minutes], n) => ({
        id: `demo-${i}-${n}`,
        title,
        category,
        start: new Date(d.getFullYear(), d.getMonth(), i, hour).toISOString(),
        end: new Date(
          d.getFullYear(),
          d.getMonth(),
          i,
          hour,
          minutes,
        ).toISOString(),
        source: "manual" as const,
      })),
    );
    data.days[k] = {
      energy: i % 4 === 0 ? "low" : i % 3 === 0 ? "high" : "mid",
      sleep: i % 4 === 0 ? "less" : "enough",
      meals: ["午餐"],
      note:
        i === today.getDate()
          ? "事情很多，但傍晚留给了自己。慢一点，也有好好生活。"
          : i % 3 === 0
            ? "有好好吃饭，也有好好生活。"
            : "",
    };
  }
  return data;
}
