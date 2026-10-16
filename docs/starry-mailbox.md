# 星光信箱：实现与验收

## 修改范围

- `star-mailbox.html`：仅信箱页面；居中标题、分类、信件模板、写信表单、阅读浮层和原有底部引语插画。
- `star-mailbox.css`：信箱专用样式；水彩纸张、双栏布局、信封各层、邮票、火漆与动画，无第三方动画依赖。
- `star-mailbox.js`：可复用数据存储、信封渲染、阅读、收藏、分类、发送与状态反馈。
- `assets/mailbox/b612-post-office.webp`：独立透明 B612 插画。
- `assets/mailbox/paper-texture.webp`：中性复古纸张纹理。
- `assets/mailbox/pressed-flowers.webp`：独立透明压花装饰。
- `tests/star-mailbox.test.cjs`：16 项数据与边界回归测试。
- 本说明。

没有修改首页、已有 `index-main.js`、记忆客户端、服务端代码、认证和数据库模型。没有添加运行时依赖。

## 交互与数据

- 信件继续按日期归档，每天一封，含该日全部对话；不是把每句话改成新的服务端对象。
- 使用原有 `b612_diary` / `b612_history`；支持旧历史读取。已存在的空日记优先，删空后不重新导入旧记录。
- 摘要来自当天第一条用户消息；日期来自记录；原模型没有收件人字段，因此缺省显示“致 · 那天的自己”。若记录已有 recipient 字符串则原样安全显示。
- 收藏是现有 favorite 字段，支持刷新持久化与跨标签同步；删除有确认和撤销，仅处理本地日记，不宣称删除云端数据。
- 写信使用现有 `/api/chat` 的 messages 请求和 assistant.content / 本地 content 返回格式，保持既有 API 配置候选。不会向聊天接口传入匿名记忆凭证，不新增云端历史写入。
- 最多携带最近 9 条本地对话及本次消息。未获取有效回信时不生成成功状态、不写假回信；草稿保留。
- 回信成功但本地保存失败时，保留待保存回执，只重试浏览器保存，避免重复请求模型。浏览器关闭会丢失未保存回执，因此界面提示勿刷新，并阻止无提示离开。
- 界面不是云端同步的实现；原有匿名凭证和画像机制不变。需要原有画像上下文、明信片等完整聊天能力时，仍可回首页使用 B612 对话。

## 动画和可访问性

- Hover：信封上浮 3px、信纸相对上移 10px，约 300ms，细微阴影变化；触摸不依赖 hover。
- 拆信：翻开封口、抽出信纸（430ms），阅读层从信纸位置展开（300ms），合计约 730ms。
- 收藏：轻微缩放与短暂星光，状态真实持久化。
- 分类下划线移动、列表淡入和高度过渡；默认只有少数慢速星星和极淡星轨。
- 采用原生 dialog，支持 ESC、关闭按钮、背景关闭和焦点恢复；分类支持方向键/Home/End。
- 尊重 prefers-reduced-motion，简化全部动效；信件内容使用 textContent，防止用户文字注入 HTML。

## 本地预览

在完整仓库根目录运行：

```sh
python -m http.server 8766 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8766/star-mailbox.html`。静态服务器本身不提供 `/api/chat`；实际发送可按原项目配置启动本地 API（5000 端口），或使用已有配置覆盖：

`http://127.0.0.1:8766/star-mailbox.html?api=https://little-prince.xyz/api`

后者会把用户主动寄出的内容发送给现有线上聊天服务，并产生该服务正常的模型调用。纯视觉浏览不会主动调用聊天或记忆接口。预览域名和正式域名的 localStorage 不互通，预览信箱为空不代表正式站记录被删除。

测试：

```sh
node --check star-mailbox.js
node --test tests/star-mailbox.test.cjs tests/chat.test.cjs tests/memory-api.test.cjs
```

## 验收记录

2026-10-15 本地：31 项 Node 测试通过，包括新增 16 项日记/历史兼容、收藏持久化、数据回滚、删除撤销和内容校验，以及原有聊天和记忆鉴权测试。

Edge / Playwright：空信箱，1/3/12 封信，悬停 10px、分阶段拆信、完整阅读、ESC 和焦点恢复、收藏筛选和刷新、搜索、长文本与安全文本渲染、成功请求与重复提交保护、503/无效回信保留草稿、保存失败仅重试保存、跨标签同步、损坏数据保护、减少动态效果均通过。检查 1400、1024、768、700、390、320px，无横向滚动。

线上聊天接口使用一条明确的验收测试消息返回 HTTP 200 和有效 assistant.content。自动化的失败/配额场景使用隔离浏览器与合成数据，不读取真实用户历史。

## 参考还原与限制

参考为用户提供的 `ok.png`。页面构图、色系与信封细节据此实现，不把完整参考图用作背景。插画是独立生成素材，并非与参考图逐像素相同；信封、邮票、信纸和内容均为真实 DOM。多个信件时采用第一封大信封、其余自适应网格，手机上纵向优先阅读。

保留 `letter1-cutout.png` 与原有引语。新增 PNG 源图由内置 image_gen 生成，再无损编码为 WebP，透明度保留；工作文件中保留原始 PNG。无浏览器端生成密钥。

### 素材生成提示

使用内置 image_gen，未使用 CLI/API 密钥模式。完整提示如下。

**b612-post-office**：Create ONE isolated transparent watercolor illustration asset for a website. The attached image is a VISUAL REFERENCE only, not the output UI. Recreate only the bottom-right illustration composition: the blond little prince viewed from behind in muted sage-green clothes and golden scarf sits beside an orange fox on a warm pale rocky asteroid, a red rose under a glass dome to their left, a few tiny flowers and soft wisps of pale watercolor clouds around the asteroid's base. Match the supplied reference's delicate hand-painted watercolor, mottled warm paper-like pigment, small details, subtle brown pencil outlines, low saturation, muted gold and sage palette, quiet storybook mood. Scene occupies most of a roughly square canvas, with the asteroid base softly fading into fully transparent edges. Fully transparent background, real alpha. No paper rectangle. No UI, no heading, no envelope, no letters, no text, no watermark, no border. Do not reproduce the full reference page. This is an independent decorative image consumed by HTML, the UI is implemented separately. Keep whole prince, fox, rose dome, scarf, flowers and asteroid within the image; no cropped characters.

**paper-texture**：Create a seamless-looking warm ivory vintage watercolor paper texture asset for a delicate French storybook website. Flat scanned paper only, full bleed, uniform brightness. Pale warm off-white with subtle beige fibers, extremely faint mottled watercolor pigment, tiny irregular golden beige speckles and occasional pale aged paper marks. Very low contrast so dark Chinese serif text remains highly readable over it. No folds, no hard borders, no objects, no text, no illustrations, no stars, no planets, no symbols, no shadows, no gradients, no UI. Gentle delicate paper grain, not grunge, not orange. Match approximate base #f8f3e9 with subtle tan fiber flecks. Square texture.

**pressed-flowers**：One isolated delicate dried-flower sprig for decorating a vintage watercolor paper envelope, on fully transparent background. A very slender slightly curved muted olive-brown stem with four or five tiny ivory cream five-petal wildflowers, pale ochre centers and just two small desaturated sage leaves. Hand-painted watercolor with fine brown pencil lines, soft translucent pigment and warm vintage storybook mood. Vertical narrow composition, entire stem and petals visible, flowers in upper half, slender bare stems at bottom tied by one subtle thin tan thread. No vase, no background, no paper, no frame, no text, no envelope, no large bouquet. Subtle gentle colors, resembles a pressed dried flower tucked behind a wax seal, not glossy realistic photography. Actual alpha transparency.
