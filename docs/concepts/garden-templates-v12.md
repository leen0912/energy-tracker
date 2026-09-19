# 四套窗边花园：V12

2026-09-19。内置图像生成工具生成三套位图原画，参考已落地的 `miniprogram/assets/window-3-didi.jpg`。没有新增生成依赖、外部图片服务或私人照片入库。

## 构图与使用

每张原稿为 2 列 × 4 行：左无猫、右有弟弟，四行由初生到丰盛。新增原稿为 `garden-peony-v12.png`、`garden-iris-v12.png`、`garden-tulip-v12.png`。既有红马蹄莲保持原资产。

原稿花束没有完全服从左侧留白，因此交付素材采用统一等比尺寸 468px，靠右、靠下放在 600px 纯白画幅中。只做规则裁切、等比缩放和 JPG 压缩，不拉伸猫或裁爪，也不用白块遮住花。保留全部根部、窗台和配花，固定各阶段画幅以便旧有柔边过渡。600px 不是原画细节分辨率的承诺。

程序按日期固定模板；0/1/2–3/4+ 条记录对应四阶段。并非每条经历新增一朵独立花，也没有新增逐花瓣动画。下一批模板必须追加生效日期段，保持旧日历映射。

## 生成提示词

以下为三套使用的共同规格与花种差异。牡丹首次生成时留白要求为左 38%、上 68%，根部 x=65%；后两套加强到左 46%、上 72%、根部 x=75%。最终均通过固定等比排版留出文字区。

```text
Use case: stylized-concept. Production sprite atlas for an existing mature Chinese personal diary app. Input image 1 is the exact composition/style and cat identity reference. Create ONE atlas of 2 columns by 4 rows, EXACTLY eight equal square panels, perfectly edge-to-edge regular grid, no gaps, no panel borders, no lettering, no numbers. Output portrait 1:2 ratio, ideally 1024x2048. Each panel is a complete square illustration with identical locked camera, BLACK city window frame on the far right 35%, clear distant pale blue urban architecture through window, thick ink-black windowsill near bottom at 90% height, paper PURE WHITE background. Early 1920s fashion illustration, elegant hand-painted gouache and precise fine line work, contemporary restrained sophisticated editorial print, NOT cartoon, NOT childish, no beige dominant page, no 3D, no gradients or glowing decorations. The top-left rectangle x=0..46%, y=0..72% in EVERY PANEL must be pure white empty breathing room for live UI text. Flowers form one intentional designed bouquet growing from a shared base near x=75%, y=88%, occupy ONLY x=48%..98% in upper 72% of each panel, and may spread to left below y=72%, never scatter clipart. Both columns have EXACT same architecture and bouquet at each row; left column NO CAT, right column the same real cameo American Maine Coon from reference, PALE CREAM SILVER GOLD, tall ear tufts, refined long face, pink nose, dense long chest fur, elongated body resting along sill, two VERY LARGE fluffy front paws draped over sill, adult realistic proportions, no orange cartoon cat. The cat stays bottom foreground, complete paws and tail never cropped. Camera, window, sill, cat scale/position IDENTICAL across all rows. Row1: tiny two-leaf shoot and no flowers. Row2: elegant modest arrangement of three blooms. Row3: six blooms with a few small accents and balanced foliage. Row4: LUSH sophisticated florist arrangement with 10 to 12 blooms of varied size and depth, readable negative space and strong visual hierarchy, not a tangled pile. Plant growth stages share root and established stems. No labels or UI, only eight final composable scenes. Variant botanical brief:  Layout priority: LEFT 46% OF EVERY PANEL MUST STAY ABSOLUTELY WHITE ABOVE Y=72%, even the dense mature bouquet; grow tall and layered on RIGHT HALF, not horizontally into the text zone. 
```

牡丹差异：CORAL PEONIES with layered coral-pink and pale shell-pink petals, warm golden chamomile centers and tiny ivory daisies, forest green and celadon foliage, a few burgundy stems. Mature lush romantic city florist, irregular oval bouquet silhouette; flowers clearly much more abundant than reference but keep upper-left blank. Cream cat remains distinct against dark sill. Do not copy red calla flowers; this template must visibly be peonies.

鸢尾差异：FRENCH BLUE IRIS flowers with poised sculptural petals, pale ivory anemones with dark centers, small amber yellow mimosa sprays, upright celadon sword leaves. Tall asymmetric architectural arrangement; blue, ivory and amber accents, not a monochrome screen. No red callas, no peonies, no typography.

郁金香差异：ELEGANT TULIPS AND ICELAND POPPIES. Sculptural tall coral and muted raspberry tulips, soft apricot poppies with gold centers, small ivory narcissus accents, forest and celadon leaves. Airy upward arrangement; final stage 10–12 blooms in a composed rich florist bouquet, varied heights. Cream silver cameo Maine Coon, large fluffy paws. No text.

生成器实际产出的花头数量与最初提示略有差异；产品不把花头个数当成记录统计。复现资产处理运行 `node scripts/build-garden-templates.mjs`，完整视觉回归运行 `npm run mini:check` 与 `npm run mini:preview`。
