import ICAL from "ical.js";
import { inferCategory, type Entry } from "./model";
export type ImportResult = {
  entries: Entry[];
  skipped: number;
  from: Date;
  to: Date;
  warnings: string[];
};
export function parseCalendar(text: string, now = new Date()): ImportResult {
  ICAL.TimezoneService.reset();
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== "vcalendar")
    throw new Error("请选择有效的 .ics 日历文件。");
  const from = new Date(now.getFullYear(), now.getMonth() - 6, 1),
    to = new Date(now.getFullYear(), now.getMonth() + 7, 1);
  const warnings = new Set<string>();
  for (const zone of root.getAllSubcomponents("vtimezone")) {
    const tzid = zone.getFirstPropertyValue("tzid");
    if (tzid)
      ICAL.TimezoneService.register(
        new ICAL.Timezone({ component: zone, tzid: String(tzid) }),
      );
  }
  let skipped = 0,
    iterations = 0;
  const entries: Entry[] = [],
    components = root.getAllSubcomponents("vevent");
  const exceptions = components.filter((c) => c.hasProperty("recurrence-id"));
  const unknownZones = new Map<string, Set<string>>();
  for (const component of components) {
    for (const property of component.getAllProperties()) {
      const tzid = property.getParameter("tzid");
      if (tzid && !ICAL.TimezoneService.has(String(tzid))) {
        const uid = String(component.getFirstPropertyValue("uid"));
        const zones = unknownZones.get(uid) || new Set<string>();
        zones.add(String(tzid));
        unknownZones.set(uid, zones);
      }
    }
  }
  function add(
    event: InstanceType<typeof ICAL.Event>,
    start: InstanceType<typeof ICAL.Time>,
    end: InstanceType<typeof ICAL.Time>,
    occurrence: string,
  ) {
    if (
      String(event.component.getFirstPropertyValue("status")).toUpperCase() ===
      "CANCELLED"
    ) {
      skipped++;
      return;
    }
    const a = start.toJSDate(),
      b = end.toJSDate();
    if (b <= from || a >= to) return;
    if (!Number.isFinite(+a) || !Number.isFinite(+b) || b <= a) {
      skipped++;
      return;
    }
    if (entries.length >= 10000)
      throw new Error("日历内容过多，请按月份分批导出后再导入。");
    entries.push({
      id: `ics:${event.uid}:${occurrence}`,
      title: String(event.summary || "未命名日程").slice(0, 200),
      start: a.toISOString(),
      end: b.toISOString(),
      allDay: start.isDate,
      category: inferCategory(event.summary || ""),
      source: "calendar",
    });
  }
  for (const comp of components) {
    if (comp.hasProperty("recurrence-id")) continue;
    const startProp = comp.getFirstProperty("dtstart");
    if (!startProp) {
      skipped++;
      continue;
    }
    const unknown = unknownZones.get(String(comp.getFirstPropertyValue("uid")));
    if (unknown) {
      skipped++;
      warnings.add(
        `时区 ${[...unknown].join("、")} 缺少定义，对应日程未导入。请导出包含时区定义的文件。`,
      );
      continue;
    }
    const event = new ICAL.Event(comp);
    if (!event.uid) {
      skipped++;
      warnings.add("缺少唯一编号的日程未导入。");
      continue;
    }
    if (
      String(comp.getFirstPropertyValue("status")).toUpperCase() === "CANCELLED"
    ) {
      skipped++;
      continue;
    }
    for (const exception of exceptions.filter(
      (c) => c.getFirstPropertyValue("uid") === event.uid,
    ))
      event.relateException(new ICAL.Event(exception));
    if (event.isRecurring()) {
      const iterator = event.iterator();
      let next;
      while ((next = iterator.next())) {
        if (++iterations > 60000)
          throw new Error("重复日程的展开范围太大，请导出较短日期范围后重试。");
        if (next.toJSDate() >= to) break;
        const occurrence = event.getOccurrenceDetails(next);
        add(
          occurrence.item,
          occurrence.startDate,
          occurrence.endDate,
          next.toString(),
        );
      }
    } else add(event, event.startDate, event.endDate, "single");
  }
  return {
    entries: [...new Map(entries.map((e) => [e.id, e])).values()],
    skipped,
    from,
    to,
    warnings: [...warnings],
  };
}
