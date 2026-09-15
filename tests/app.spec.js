import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("单次日程改期使用同一编号，未知时区不会沿用上次导入", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { parseCalendar } = await import("/src/calendar.ts");
    const date = new Date("2026-09-14T00:00:00Z");
    const calendar = (hour) =>
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:stable-event",
        `DTSTART:20260914T${hour}0000Z`,
        `DTEND:20260914T${hour}3000Z`,
        "SUMMARY:一次安排",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    const first = parseCalendar(calendar("09"), date).entries[0],
      changed = parseCalendar(calendar("11"), date).entries[0];
    const unknown = parseCalendar(
      calendar("09")
        .replace("DTSTART:", "DTSTART;TZID=Unknown/Zone:")
        .replace("090000Z", "090000"),
      date,
    );
    return {
      sameId: first.id === changed.id,
      changed: changed.start,
      unknownCount: unknown.entries.length,
      warnings: unknown.warnings.length,
    };
  });
  expect(result).toEqual({
    sameId: true,
    changed: "2026-09-14T11:00:00.000Z",
    unknownCount: 0,
    warnings: 1,
  });
});

test("记录持久化、修改、删除，示例数据隔离", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".empty-month")).toBeVisible();
  await page.getByRole("button", { name: "想歇一歇", exact: true }).click();
  await page
    .getByRole("textbox", { name: "这一天的感受" })
    .fill("累了，但晚饭很开心。");
  await page.getByRole("button", { name: "记一笔", exact: true }).click();
  await page.getByLabel("发生了什么").fill("和梁姐散步");
  await page.getByLabel("归在哪一页").selectOption("people");
  await page.getByRole("button", { name: "留下这一段" }).click();
  await expect(page.locator(".timeline")).toContainText("和梁姐散步");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "这一天的感受" })).toHaveValue(
    "累了，但晚饭很开心。",
  );
  await expect(
    page.getByRole("button", { name: "想歇一歇", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "看看示例", exact: true }).click();
  await expect(page.locator(".demo-banner")).toBeVisible();
  await page.getByRole("button", { name: "回到我的日历", exact: true }).click();
  await expect(page.locator(".timeline")).toContainText("和梁姐散步");
  await expect(page.locator(".timeline-entry")).toHaveCount(1);
  await page.locator(".timeline-entry").click();
  await page.getByLabel("发生了什么").fill("和梁姐聊了一个好点子");
  await page.getByRole("button", { name: "留下这一段" }).click();
  await expect(page.locator(".timeline")).toContainText("和梁姐聊了一个好点子");
  await page.locator(".timeline-entry").click();
  await page.getByRole("button", { name: "删除这一段", exact: true }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.locator(".timeline-empty")).toBeVisible();
});

const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Daytrace//Test//EN\r\nBEGIN:VEVENT\r\nUID:daytrace-meeting\r\nDTSTART:20260914T010000Z\r\nDTEND:20260914T020000Z\r\nSUMMARY:项目会议\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEXDATE:20260915T010000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
test("ICS 重复展开、排除日期、重复导入更新", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-14T12:00:00+08:00"));
  await page.goto("/");
  for (let n = 0; n < 2; n++) {
    await page
      .getByRole("button", { name: "导入日历", exact: true })
      .first()
      .click();
    await page.locator("#ics-file").setInputFiles({
      name: "test.ics",
      mimeType: "text/calendar",
      buffer: Buffer.from(ics),
    });
    await expect(page.locator(".import-preview>div")).toHaveCount(2);
    if (n === 1)
      await expect(page.locator("dialog")).toContainText(
        "0 段新日常 · 2 段更新",
      );
    await page.getByRole("button", { name: "确认归档 2 段" }).click();
  }
  const entries = await page.evaluate(
    () => JSON.parse(localStorage.getItem("daytrace.data.v1")).entries,
  );
  expect(entries).toHaveLength(2);
  expect(entries[0].category).toBe("work");
});

test("跨日与重叠时段去重，全天不虚增时长", async ({ page }) => {
  await page.goto("/");
  const results = await page.evaluate(async () => {
    const { recordedMinutes, minutesOnDay } = await import("/src/model.ts");
    const make = (start, end, allDay = false) => ({
      id: start,
      title: "test",
      start,
      end,
      allDay,
      category: "work",
      source: "manual",
    });
    const entries = [
      make("2026-09-13T23:00:00", "2026-09-14T02:00:00"),
      make("2026-09-14T01:00:00", "2026-09-14T03:00:00"),
      make("2026-09-14T00:00:00", "2026-09-15T00:00:00", true),
    ];
    return [
      recordedMinutes(entries, "2026-09-14"),
      minutesOnDay(entries[0], "2026-09-14"),
      recordedMinutes(entries, "2026-09-13"),
    ];
  });
  expect(results).toEqual([180, 120, 60]);
});

test("时区定义与重复例外保留准确时间", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { parseCalendar } = await import("/src/calendar.ts");
    const text = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VTIMEZONE",
      "TZID:Asia/Shanghai",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      "TZOFFSETFROM:+0800",
      "TZOFFSETTO:+0800",
      "END:STANDARD",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      "UID:tz-test",
      "DTSTART;TZID=Asia/Shanghai:20260914T090000",
      "DTEND;TZID=Asia/Shanghai:20260914T100000",
      "SUMMARY:工作",
      "RRULE:FREQ=DAILY;COUNT=2",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:tz-test",
      "RECURRENCE-ID;TZID=Asia/Shanghai:20260915T090000",
      "DTSTART;TZID=Asia/Shanghai:20260915T110000",
      "DTEND;TZID=Asia/Shanghai:20260915T120000",
      "SUMMARY:改期会议",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    return parseCalendar(text, new Date("2026-09-14T00:00:00Z")).entries;
  });
  expect(result).toHaveLength(2);
  expect(result[0].start).toBe("2026-09-14T01:00:00.000Z");
  expect(result[1].start).toBe("2026-09-15T03:00:00.000Z");
  expect(result[1].title).toBe("改期会议");
});

test("备份校验拒绝坏数据且不覆盖已有记录", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "还不错", exact: true }).click();
  const before = await page.evaluate(() =>
    localStorage.getItem("daytrace.data.v1"),
  );
  await page.getByRole("button", { name: "记录与设置", exact: true }).click();
  await page.getByRole("button", { name: "恢复备份", exact: true }).click();
  await page.locator("#backup-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"entries":[{"id":"bad"}],"days":{}}'),
  });
  await expect(page.locator("#restore-error")).not.toBeEmpty();
  expect(
    await page.evaluate(() => localStorage.getItem("daytrace.data.v1")),
  ).toBe(before);
});

test("桌面与手机布局、分享图片非空、默认隐私", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date("2026-09-14T12:00:00+08:00"));
  await page.goto("/");
  await page.getByRole("button", { name: "看看示例", exact: true }).click();
  await mkdir(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/desktop.png",
    fullPage: true,
  });
  for (const width of [390, 375, 320, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({
        path: ".local/screenshots/mobile.png",
        fullPage: true,
      });
  }
  await page.getByRole("button", { name: "我的回响", exact: true }).click();
  await expect(page.locator('[data-option="showEnergy"]')).not.toBeChecked();
  const distinct = await page.locator("#share-canvas").evaluate((c) => {
    const ctx = c.getContext("2d"),
      colors = new Set();
    for (let y = 0; y < c.height; y += 13)
      for (let x = 0; x < c.width; x += 13) {
        const p = ctx.getImageData(x, y, 1, 1).data;
        colors.add(`${p[0]},${p[1]},${p[2]}`);
      }
    return colors.size;
  });
  expect(distinct).toBeGreaterThan(30);
  await page
    .locator("#share-canvas")
    .screenshot({ path: ".local/screenshots/share.png" });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存图片", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("日迹-2026-09-示例.png");
  await download.saveAs(".local/screenshots/month-card.png");
  await page.getByRole("button", { name: "这一天", exact: true }).click();
  await expect(page.locator('[data-option="showTitles"]')).not.toBeChecked();
  await expect(page.locator('[data-option="showNote"]')).not.toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/screenshots/share-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
