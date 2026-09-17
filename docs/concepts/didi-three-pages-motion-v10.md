# V10 三页视觉与动效设计

落地版本已修订为有序窗景阶段，实际实现边界见 [窗景落地修订](window-garden-v11-notes.md) 和 [0.4 说明](../RELEASE-20260917.md)。下文保留历史设计意图，不作为已实现功能清单。

状态：视觉提案及开发交接草案。用户选择 V9 主视觉继续设计，并提供弟弟四张照片；本轮输出三页静态视觉与动效分镜，未开发、未改变计算规则。
日期：2026-09-16。

## 交付图

- [首页](./energy-home-didi-fashion-v10.png)
- [日历](./garden-calendar-didi-fashion-v10.png)
- [回响](./garden-echo-didi-fashion-v10.png)
- [动效分镜](./energy-motion-didi-fashion-v10.png)

## 已继承的需求

- 成熟都市人的日常记录；沿用早期时装封面的修长线条、清晰色块和留白。
- 首页快捷项、最近记录及本轮分享图不展示事件分值，不要求用户在记录时选择 +8 或 +10。
- 当前估算电量保留大数字，以短暂变色和位移呈现变化；内部计算仍应可解释。
- 电量升降与花园丰盛程度分别表达：所有有效生活记录都能贡献植物。
- 日历保持简洁，详细记录在点开日期之后查看。
- 回响默认展示记录名称，备注不进入分享；导出范围不含应用按钮和导航。
- 此轮不增加开发工作，具体阈值、录入流程和数据模型以后与现有实现核对。

## 色彩与绘画

白纸 #FAFAF7、黑墨 #202526、青瓷绿 #9ABDAF、朱红 #CF4938、少量明黄 #D8BE58 和蓝色 #496F9B。米金仅用于弟弟的毛色及极小局部，不能扩展为整页米黄色。
沿用 V9 的窗框与城市远景、修长花茎和不对称构图。减少做旧、密集纹理、虚光及装饰物。应用正文保持清晰；标题可以有时装杂志般的衬线表现。
数值平时为黑墨；补充反馈短暂朱红，消耗反馈短暂蓝色，然后回到黑墨。颜色同时搭配位移、新植物及文字确认，不是唯一反馈。

## 弟弟的形象规范

照片为形象依据：凯米尔色美系缅因，浅奶金与银白长毛、轻浅的额头纹理、蓬松胸毛、耳尖毛、粉鼻、金橄榄色眼睛、修长厚实的身体和蓬松长尾。
大爪子是辨识重点：前掌宽、趾部圆厚、带毛，搭窗台时有自然重量感；不画成普通短毛猫的小白袜，不夸张成脱离身体的卡通手掌。
首页采用横卧、前爪搭在台沿的姿势；日历用同一形象的安静缩略场景；回响用正面坐姿，完整露出前爪；动效以一只前爪前伸和慢眨眼为核心。
照片仅用于形象参考。原始生活照片未复制到项目，背景物品、包装品牌和室内信息不用于设计。
没有猫咪陪伴记录的某天，花园不凭空生成陪伴事件。其他用户可采用自己的恢复来源，本轮示例属于用户与弟弟的个人体验。

## 三页职责

### 首页

上半部为当前估算与当天花园，下半部为稳定的记录区域。大数字只表达当前估算，日期和来源说明不伪装成生理测量。
补充候选：弟弟靠过来、按时吃上饭、眯了一会儿、终于到家。
消耗候选：通勤挤累了、晒得一身汗、淋雨湿了鞋、莫名其妙掉电。
使用补充/消耗选择方向，提供自己写一句；常用项不展示预设权重。事情是否恢复精力以用户选择为准。
本轮图示保留选择后“记下此刻”的提交方式：选中项只高亮，提交成功后才改变数字和花园，不能在选择时先加一次、提交时又加一次。最终录入流程待与现有两次点击体验核对。
反馈示例：“弟弟靠过来了 / 这一会儿，挺好。”、“淋雨，鞋袜湿了 / 这一路，确实有点累。”
记录确认文案随后收起，仅留最近记录与撤销，避免重复信息长期占位。

### 日历

首屏只保留月份、月网格、每天至多一枚轻标记、选中日一行入口以及下方累计花园。
日期数字保持主角；猫咪日的小标记后续统一为有耳尖毛轮廓的简化猫头或尾线。
有记录才有标记，无记录与未来日期留白，不推断生活质量。示例为 2026 年 9 月，周一为每周首列，16 日选中。
点日期只移动选择圈并更新摘要；再点摘要进入当天详情。详情优先显示实际记录，可补记、修改、撤销，并可进入当天回响；不在月历首页再塞完整统计。
当前状态不会改变历史月份的颜色，历史图形来自该日期自己的记录。

### 回响

主内容是一张可以独立导出的当天海报，包含标题、日期、记录名称、花园与当天实际出现的弟弟。
按时吃饭、通勤、淋雨、到家和陪伴都能在画面中留下位置，不以明亮度评价一天好坏。
名称默认展示，支持隐藏；备注始终私密。预览与实际导出应一致。
竖版与方形使用重新排版，不能直接裁掉爪子、日期或长记录；记录多时提供续页或更多排版，不为整齐静默遗漏。
保存前固定最终花园状态，不截取半开的花或运动中模糊数字。保存按钮、隐私控制和导航不进入图片。

## 动效设计草案

时间与位移是试做起点，需在真机上微调。界面文字和操作区始终可用，动画不阻塞下一次记录。

| 触发 | 动作 | 暂定时长 | 结束状态 |
| --- | --- | --- | --- |
| 补充保存成功 | 数字真实更新，向上轻移约 6px，短暂朱红；新芽沿细茎展开 | 数字 450-650ms；生长 700-1000ms | 数字回黑墨，新花留下 |
| 消耗保存成功 | 数字真实更新，向下轻移约 6px，短暂蓝色；新增蓝花或深叶 | 与补充相近 | 原有红花和叶片保留，新植物留下 |
| 弟弟陪伴保存成功 | 数字执行补充反馈；弟弟一只大爪子前伸约 6-10px、慢眨眼、安顿下巴 | 900-1200ms，与生长并行 | 保持安静卧姿，不循环招手 |
| 选择日期 | 选择圈短淡入，摘要轻淡换 | 150-200ms | 日期网格不跳动 |
| 切换月份 | 日期区短距离水平切换，页脚花园交叉淡换 | 220-300ms | 保持月份栏和导航位置 |
| 打开当天详情 | 底部详情层平缓展开，背景弱化 | 220-280ms | 明确关闭入口，保留月历选择 |
| 打开回响 | 当天已成形花园短淡入到海报位置 | 250-350ms | 不从头播放当天全部生长 |
| 预览与比例切换 | 预览淡入；比例切换时完成重新排版后淡换 | 180-250ms | 日期、记录与爪子完整可见 |
| 保存成功 | 按钮内短暂勾号及“已保存” | 约 1000ms | 回到可再次保存状态，不弹庆祝 |

数字变化必须匹配真实派生结果。分镜 58、62、59 仅为动作示意，不建立新的默认权重。
不开逐个数字滚动的长动画，不显示单次差值。极小变化也可以通过字色和植物反馈被看到。
处于 100 上限且读数未变化时，不伪造上升；只确认记录并生长。透支恢复时显示真实透支变化，0 与负数不可混称。
低电量的动作可以更平缓，但不缩短记录区域、不重排常用按钮、不压暗到难读。高低状态主要影响一句话与轻微视觉氛围。
切换页面或重新打开应用时恢复已保存花园；只有新记录触发一次生长。0 条记录是一株小苗；零条生活记录不等于电量为 0。
按当天记录生长并归档，跨日产生新的当天花园，历史保留在日历。记录很多时使用新的小枝叶/花簇保持容量，不无限遮挡页面。
“只增不减”描述补充与消耗的共同价值，不限制数据纠错：删除或撤销误记后，数字与花园按剩余有效记录恢复，使用短淡换，不做枯萎惩罚。
校准只更新当前估算，不伪装成新生活事件。快速连续记录时以最终数据为准合并短动效，不积压动画队列。
减少动态模式下取消位移、伸爪和展开，只保留清楚的保存确认、数字更新和短淡换。不要求用户观看动画才知道记录成功。

## 视觉检查与限制

四张均为静态生成稿；动效分镜展示动作设计，不是已运行的动画。
首页图把大数字画成朱红，可视为反馈瞬间；开发静止态仍以黑墨为准。
生成稿的小猫图标尚未统一为缅因耳尖轮廓，回响坐姿的爪子还能进一步加宽，保留为精修点。
回响稿中的返回箭头和“备注仅自己可见”后的箭头是生成的多余控件，根导航页不应有无意义返回，隐私提示也不应伪装成入口。
猫的写实细节略多，拆分插画素材时减少毛发笔触，让人物形象与平涂花叶更一致，同时保留身份特征。
确认方向后，正式尺寸需检查手机首屏操作区、长中文、缩放、日历六周月份、方形海报和大字模式。本轮只做视觉检查，未实施应用或真机交互测试。

## 生成方式与提示词

内置 image_gen，四次独立生成。首页参考 V9；日历参考本轮首页与 V6 简化结构；回响和分镜参考本轮首页。照片参与弟弟形象约束。以下为实际提示词，供后续复现方向，生成结果不保证逐像素一致。

### Home

```text
Original Chinese mobile app 日迹, mature 1910s-1930s illustrated fashion-cover sensibility, refined pochoir/gouache with fine elongated ink contours and spare Art Deco window geometry. Paper WHITE, ink-black #202526, celadon #9ABDAF, vermilion #CF4938, tiny straw yellow and French blue. Sharp light/dark balance, generous whitespace, very fine paper texture, no heavy woodblock grain, gradients, glowing orbs, ornate gold borders, sepia or beige-dominant screen. Original artwork, no VOGUE masthead. Contemporary readable UI, portrait complete mobile screen with bottom navigation, no phone frame.
CAT IDENTITY MUST MATCH PHOTO REFERENCES: 弟弟 is the user's adult cameo American Maine Coon, NOT the previous ginger-white short-haired cat. Pale cream/silvery warm golden long coat, very subtle peach on head and back, fluffy pale chest ruff, tall tufted ears, pink nose, amber-olive eyes, substantial long body, plume tail, broad soft square muzzle and EXTRA LARGE fluffy front paws. No stark orange/white patches. Translate into elegant flat fashion illustration with a few fine directional fur strokes, NOT pasted photography, not baby/chibi, not an exaggerated fierce European Maine Coon. Preserve large paws clearly visible and softly weight-bearing on the sill. White paper behind with ink/celadon contrasts makes his pale fur readable. Cat must harmonize with flowers and the window, never a sticker.
Product: every recorded experience grows the garden; difficult experiences add blue blooms and leaves, never erase/wilt existing flowers. Cat appears where companionship was recorded. Everyday urban copy, no idealized wellness checklist. No per-event point values, arithmetic deltas, progress goals or streaks.
Use case: ui-mockup. Deliverable 1 of a cohesive 3-page design: ENERGY HOME.
Reference image 1 defines visual palette and window/floral composition; images 2-4 define the exact cat identity, replacing ALL previous orange short-haired cats.
Design a less crowded version of the reference. Header small “日迹” and “9月16日 周三”, small settings icon. At upper left “此刻余量”, one large elegant ink number “62”, small “根据记录估算”. No other score numbers or percentages. Under it a short feedback line “弟弟靠过来了”, “这一会儿，挺好。”.
An unframed airy scene integrated with the page: black window mullion on the right, pale city geometry beyond, two or three slender vermilion flowers, fine celadon stems and tiny French-blue flowers. The photo-matched pale cameo long-haired Maine Coon lounges along the lower window ledge in the elongated pose in the first cat photo, with his face turned toward us, and BOTH oversized fluffy front paws draped visibly over the ledge. Paw shape and long fluffy ruff are important. Render as sophisticated hand-drawn fashion illustration, simplified yet recognizable.
Keep scene within top 55% of screen so logging is reachable on a normal phone. Remove books, flower vase, redundant mottos and ornamental paragraphs. Do not fill every blank area with leaves.
Below: compact “补充 / 消耗” segmented control, 补充 active. Four equally sized simple line-icon options in a 2x2 open layout: “弟弟靠过来”, “按时吃上饭”, “眯了一会儿”, “终于到家”. NO number badges, NO circular tinted backplates. A pencil icon “自己写一句”; solid ink rectangular button with modest radius “记下此刻”. Quiet recent row “刚刚 · 弟弟靠过来了” with undo icon.
Bottom tabs “电量 / 日历 / 回响”, 电量 active. Preserve comfortable readable Chinese sizes. All controls and text must fit. Static RESTING state of the design, no motion blur, no artificially glowing numbers. This home will later have a brief ink-color pulse and plant unfolding after logging.
```

### Calendar

```text
Original Chinese mobile app 日迹, mature 1910s-1930s illustrated fashion-cover sensibility, refined pochoir/gouache with fine elongated ink contours and spare Art Deco window geometry. Paper WHITE, ink-black #202526, celadon #9ABDAF, vermilion #CF4938, tiny straw yellow and French blue. Sharp light/dark balance, generous whitespace, very fine paper texture, no heavy woodblock grain, gradients, glowing orbs, ornate gold borders, sepia or beige-dominant screen. Original artwork, no VOGUE masthead. Contemporary readable UI, portrait complete mobile screen with bottom navigation, no phone frame.
CAT IDENTITY MUST MATCH PHOTO REFERENCES: 弟弟 is the user's adult cameo American Maine Coon, NOT the previous ginger-white short-haired cat. Pale cream/silvery warm golden long coat, very subtle peach on head and back, fluffy pale chest ruff, tall tufted ears, pink nose, amber-olive eyes, substantial long body, plume tail, broad soft square muzzle and EXTRA LARGE fluffy front paws. No stark orange/white patches. Translate into elegant flat fashion illustration with a few fine directional fur strokes, NOT pasted photography, not baby/chibi, not an exaggerated fierce European Maine Coon. Preserve large paws clearly visible and softly weight-bearing on the sill. White paper behind with ink/celadon contrasts makes his pale fur readable. Cat must harmonize with flowers and the window, never a sticker.
Product: every recorded experience grows the garden; difficult experiences add blue blooms and leaves, never erase/wilt existing flowers. Cat appears where companionship was recorded. Everyday urban copy, no idealized wellness checklist. No per-event point values, arithmetic deltas, progress goals or streaks.
Use case: ui-mockup. Deliverable 2: VERY SIMPLE MONTH CALENDAR. Reference 1 is sibling home visual, reference 2 is ONLY previous simplified calendar structure, remaining references are real 弟弟 photos (sitting photo for big paws and proportions, face photo for identity).
The user explicitly rejected overloaded calendars. Calendar must be quieter than homepage. NO giant brand headline, no upper floral decoration, no slogan, no daily garden detail illustration, no energy stats or record list.
Top small “日迹”, below compact “九月” with small “2026” and month arrows on same baseline. Content focused on spacious 7-column grid, weekdays 一 二 三 四 五 六 日. Correct September 2026 calendar: Monday first; first week blank Monday then Tuesday 1 through Sunday 6; next rows 7-13,14-20,21-27; last 28,29,30. Day 16 selected by a fine ink ring, not a card.
Only days with recorded data up to 16 carry one TINY mark under the date: vermilion petal, celadon leaf or blue petal. Dates 17-30 are plain numerals, no fabricated future records. Several earlier days also blank. On cat days (3,9,16) a single tiny cat ear silhouette replaces the petal. Don't put giant cats or paws all over the grid.
Below calendar only ONE understated day-detail row between hairline rules: “16日 周三” left; “5段记录” middle; right arrow, no percentage.
At bottom a very low quiet unframed frieze about 18% screen height: thin black sill baseline, two slender celadon stems and one red bloom at left; real cameo long-haired Maine Coon 弟弟 resting on right, long pale tail along sill and TWO big fluffy cream paws clearly visible, rendered in refined fashion-illustration ink/gouache. Keep sparse. This is month's cumulative garden; silhouette is secondary to date grid. Do not add room furnishings.
Bottom navigation “电量 / 日历 / 回响”, 日历 selected. Chinese body text clear, whitespace generous. Mostly white screen, matte ink, controlled vermilion, tiny blue; the cat's cream is confined to cat, no beige screen. Entire calendar fits one viewport. This must look like a usable serene calendar with a personal illustrated signature.
```

### Echo

```text
Original Chinese mobile app 日迹, mature 1910s-1930s illustrated fashion-cover sensibility, refined pochoir/gouache with fine elongated ink contours and spare Art Deco window geometry. Paper WHITE, ink-black #202526, celadon #9ABDAF, vermilion #CF4938, tiny straw yellow and French blue. Sharp light/dark balance, generous whitespace, very fine paper texture, no heavy woodblock grain, gradients, glowing orbs, ornate gold borders, sepia or beige-dominant screen. Original artwork, no VOGUE masthead. Contemporary readable UI, portrait complete mobile screen with bottom navigation, no phone frame.
CAT IDENTITY MUST MATCH PHOTO REFERENCES: 弟弟 is the user's adult cameo American Maine Coon, NOT the previous ginger-white short-haired cat. Pale cream/silvery warm golden long coat, very subtle peach on head and back, fluffy pale chest ruff, tall tufted ears, pink nose, amber-olive eyes, substantial long body, plume tail, broad soft square muzzle and EXTRA LARGE fluffy front paws. No stark orange/white patches. Translate into elegant flat fashion illustration with a few fine directional fur strokes, NOT pasted photography, not baby/chibi, not an exaggerated fierce European Maine Coon. Preserve large paws clearly visible and softly weight-bearing on the sill. White paper behind with ink/celadon contrasts makes his pale fur readable. Cat must harmonize with flowers and the window, never a sticker.
Product: every recorded experience grows the garden; difficult experiences add blue blooms and leaves, never erase/wilt existing flowers. Cat appears where companionship was recorded. Everyday urban copy, no idealized wellness checklist. No per-event point values, arithmetic deltas, progress goals or streaks.
Use case: ui-mockup. Deliverable 3: ECHO / SHARE page, “回响”. Reference 1 = matching home palette, drawing and cat; reference 2 = real cat FRONT SITTING pose to use prominently; reference 3 = close face identity.
Create complete portrait screen. Compact header “今日回响” and date picker “9月16日” with small chevrons. Main area is an exquisite share poster (4:5 vertical artwork) filling the width with a little white margin, no shadow or rounded card. Poster is visibly its own composition, export will exclude controls below. Fashion-cover-inspired, original ink-and-gouache artwork, strong spare black diagonals / window mullion, white breathing room, tall vermilion blooms and celadon foliage, a small blue flower branch representing a difficult experience.
Poster title at upper left in refined Chinese serif “这一天，都算数。” Date “2026.09.16”. Main subject in lower-right: real pale cameo Maine Coon 弟弟 SITTING upright in the exact proportions of the standing/sitting photo: elongated substantial torso, chest ruff, pale golden long fur, prominent tufted ears, calm amber eyes, pink nose, and large broad front paws side by side on the black sill, unobscured. Whole cat including paws visible. Harmonize him with the stylized long stems, soften detailed fur into elegant grouped gouache shapes. No previous orange tabby. City window lines only as sparse geometry.
Along left of poster a clean readable column of FIVE actual day moments, ordered chronological and without scores or icons crowding:
“通勤挤累了”
“按时吃上饭”
“淋雨湿了鞋”
“终于到家”
“弟弟靠过来了”
A small line near bottom “到家了，弟弟也在。” and discreet “日迹” maker mark. No grand motivational prose. No percentages, totals, number scores, record count, mock financial statistics. Good and hard experiences both remain beautiful in the garden.
Below poster, visually distinct white application area:
one row “展示记录名称” with toggle ON.
small privacy line “备注仅自己可见”.
A plain segmented format choice “竖版 / 方形”, 竖版 selected.
One solid ink-black button with download icon “保存今日回响”, modest 6px corner radius.
A compact expand icon option “预览大图”.
Bottom navigation “电量 / 日历 / 回响”, 回响 selected.
Layout must be professionally balanced with legible event names, poster not overwhelmed by text. Controls must fit within viewport; no repeated slogans or duplicate logo headers. Mature urban gentle illustration, no cute storybook, no faux ancient yellow paper, no stickers, no cards within cards.
```

### Motion

```text
Original Chinese mobile app 日迹, mature 1910s-1930s illustrated fashion-cover sensibility, refined pochoir/gouache with fine elongated ink contours and spare Art Deco window geometry. Paper WHITE, ink-black #202526, celadon #9ABDAF, vermilion #CF4938, tiny straw yellow and French blue. Sharp light/dark balance, generous whitespace, very fine paper texture, no heavy woodblock grain, gradients, glowing orbs, ornate gold borders, sepia or beige-dominant screen. Original artwork, no VOGUE masthead. Contemporary readable UI, portrait complete mobile screen with bottom navigation, no phone frame.
CAT IDENTITY MUST MATCH PHOTO REFERENCES: 弟弟 is the user's adult cameo American Maine Coon, NOT the previous ginger-white short-haired cat. Pale cream/silvery warm golden long coat, very subtle peach on head and back, fluffy pale chest ruff, tall tufted ears, pink nose, amber-olive eyes, substantial long body, plume tail, broad soft square muzzle and EXTRA LARGE fluffy front paws. No stark orange/white patches. Translate into elegant flat fashion illustration with a few fine directional fur strokes, NOT pasted photography, not baby/chibi, not an exaggerated fierce European Maine Coon. Preserve large paws clearly visible and softly weight-bearing on the sill. White paper behind with ink/celadon contrasts makes his pale fur readable. Cat must harmonize with flowers and the window, never a sticker.
Product: every recorded experience grows the garden; difficult experiences add blue blooms and leaves, never erase/wilt existing flowers. Cat appears where companionship was recorded. Everyday urban copy, no idealized wellness checklist. No per-event point values, arithmetic deltas, progress goals or streaks.
Use case: ui-mockup. Deliverable 4: A STATIC MOTION STORYBOARD, landscape 1800x1400-ish, for 日迹. This is an OUTSIDE-APP design board, not a fourth application page. Use three ROWS with three equally sized frames per row, on a clean white page, subtle thin separators, ample space. Follow input 1 for app visual and photos 2-3 for EXACT cameo cat identity including huge paws. Title small “日迹 · 动效分镜”. Left-to-right frames are START, CHANGE, SETTLE. Use very short Chinese row labels: “补充”, “消耗”, “弟弟陪伴”. Column headers “记录前”, “发生变化”, “安定下来”. Each frame MUST be large enough to see the change.

ROW 1 补充: same crop of home number and a small slender red-flower garden, SAME layout and plant positions.
1) ink-black “58”, one existing closed vermilion bud.
2) numeral moves UP a few pixels and briefly turns vermilion, a tiny fine upward ink trace, bud begins unfolding.
3) stable ink-black “62”, unfolded red bloom remains. No neon halo or pulsing glow. Existing stems preserved.

ROW 2 消耗: same crop, existing RED bloom preserved across all THREE frames.
1) ink-black “62” and red bloom with one small blue closed bud.
2) number moves DOWN a few pixels and briefly becomes French blue, thin downward ink trace. The blue stem lengthens.
3) stable ink-black “59”, NEW blue bloom open beside STILL PRESENT red bloom. No plant shrinks or vanishes. No negative delta text. Do not express loss as plant damage.

ROW 3 弟弟陪伴: close crop of cat on black sill and a small red bud, NO numbers. This row is ALL ABOUT HIS PAWS.
1) cameo Maine Coon resting with both enormous fluffy cream front paws on sill, amber eyes relaxed, ear tufts and ruff.
2) ONE wide fluffy front paw extends slightly forward and settles over edge, cat slow blinks. The paw is anatomically continuous with leg, large soft rounded toes, not a disembodied paw graphic; subtle motion curve, no hearts/confetti.
3) cat comfortably rests chin near paws, with small flower newly open beside him. Same cat and same body proportions all three frames. Keep his coat pale cream and very light golden, not orange tabby. Stylize smoothly with fine contours and grouped fur planes to integrate with flora.

Bottom caption small “每次记录，只回应一次。” and “电量有起落，花园继续生长。”
Do NOT include exact plus/minus deltas, point badges, score counters, % signs, confetti, sparkles, giant directional arrows, rings, gradients, glow blobs, saturated full backgrounds or phone frames.
Art direction is elegant early fashion-illustration line economy, vermilion/celadon/ink-white, sparse architecture, mature affectionate actual cat. The board must be coherent and understandable. Static sequential drawings, not claims of a running animation.
```
