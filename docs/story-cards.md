# 首页六张故事票券

## 实现

保留原导航、标题、顶部玫瑰星球和底部插画，只替换原四卡区域。按用户最终确认扩为六个入口：玫瑰故事、星球地图、狐狸互动、星光信箱、小王子/B612 对话、飞行日志；新增两张卡片连接已有页面或弹层，没有新增后端功能或修改 API、认证、存储。

- `index.html`：六张真实 DOM 横向票券；编号、插画、中文标题、短句、普通入口和窄票根；轮播按钮与状态说明。
- `storybook.css`：细边框、浅粉/雾蓝/麦色/淡绿、局部纸纹、打孔和缺口；在星球地图、B612、信箱副标题旁增加很淡的线条与一致的焦点色，不改变其他页面布局。
- `story-cards.js`：原生环形投影、透视、惯性和吸附；不依赖 React、WebGL、动画包或外部图片服务。
- `index-main.js`：把旧点击处理收为一个六入口分发器，通过 `storybook:enter` 接收 `{ action: 'rose' | 'journey' | 'fox' | 'b612' | 'mailbox' | 'flight' }`。点击普通入口立即进入，撕票完成后进入；不叠加原 360ms 退场。未加载轮播模块时普通入口仍可使用。
- `star-mailbox.html`：仅加入共享装饰样式表；原有信箱 CSS、JS、接口和数据保持不变。
- `assets/story-cards/{rose,journey,fox,b612,mailbox,flight}.webp`：六张独立透明插画，共约 700KB。
- `tests/story-cards.browser.cjs`：Edge/Playwright 交互回归，使用隔离浏览器和合成接口响应。

## 操作

左右拖动卡片主体可以轮转。点侧边卡片先转到正面，再点击入口进入故事。拖动正面窄票根向右至少 75px，或用 Enter/Space 激活票根，播放短暂撕落后进入。短拖动、指针取消和离开页面会取消投递动作。票根不存储“已使用”状态，返回即可再次使用。

自动轮转约 8°/秒；悬停、键盘焦点、拖动、故事弹层、离开首页、页面隐藏或滚出视口时暂停。用户可手动暂停；移开鼠标/焦点后等待约 2 秒恢复。减少动态效果设置关闭自动轮转，切换与撕票即时完成。所有六卡可经键盘聚焦，方向键切换并移动卡片焦点。

桌面票券约 350×222px、手机约 280×210px，采用较宽的侧票根。默认狐狸居中、星球地图与信箱分列前侧，玫瑰、小王子和日志露在后排；六张卡片可轮转到正面。插画没有强行切片弯曲，因此文字和按钮保留清晰可读性。实际交互采用真实 DOM，与概念图的透视和插画位置会有细微差异。

## 验证与本地预览

在网站根目录运行 `python -m http.server 8766 --bind 127.0.0.1`，访问 `http://127.0.0.1:8766/index.html#home`。当前工作环境已有该端口服务。

数据回归：`node --test tests/chat.test.cjs tests/memory-api.test.cjs tests/star-mailbox.test.cjs`。

浏览器回归：有 Playwright 和 Edge 的环境运行 `node tests/story-cards.browser.cjs`。可用 `NODE_PATH` 指向已有 Playwright 安装；`STORY_BASE_URL` 可设为预览地址，`STORY_SCREENSHOTS` 可设为截图文件夹。不需要给网站添加运行时依赖。

验收覆盖：四个原有普通入口和撕票入口、新增信箱和飞行日志入口、只选中侧卡、回弹、返回复位、防止重复进入、取消手势、键盘、惯性、触摸横滑与纵向页面滚动、自动轮转与暂停、减少动态效果、模块加载失败的静态回退；1440/1024/768/600/390/320px；原星球章节、飞行日志、B612 请求与回信；另以原信箱脚本检查收藏刷新、分类、搜索、删除撤销、发送成功/失败与草稿保护。

所有网络交互回归使用合成数据，不读取真实用户历史。预览域名与正式域名的浏览器本地记录相互独立。正式站仍需合并或发布后才会改变。

## 插画来源与提示词

使用内置 imagegen 生成原创新素材，参考图仅用于线条、淡彩与文具构图的风格参考。随后仅做尺寸压缩和 WebP 编码，保留透明通道。没有把整张参考图当成网页，也没有复制 React Bits 的源码；动效为原生独立实现。

前四张图共用的最终提示词：

> Create a single standalone illustration asset for a delicate storybook website card. Reference images are STYLE ONLY, not compositions to copy. [SUBJECT] Original composition, airy vertical arrangement, centered with generous transparent margins. VERY FINE softly irregular colored pencil and ink contour lines, extremely light translucent pastel wash INSIDE selected areas, much unpainted negative space. Like a fine hand drawn vintage stationery illustration, intricate but sparse, inspired by the delicate botanical stationery in references. Keep lines and details visible at 220px wide. No words, no typography, no cards, no border, no paper texture, no background, no photograph, no heavy watercolor masses, no brown vignette, no 3D. Truly transparent background. The asset must stand alone, not a full website screenshot.

SUBJECT 分别为：

- Rose: One delicate botanical rose, curving sage leaves, a faint glass dome outline, two scattered petals, tiny pale gold stars and a loosely tied powder blue ribbon. Palette blush pink and sage green.
- Journey: Three small whimsical hand-drawn planets connected by a fine dashed orbit, one rose on an asteroid, a tiny telescope, a crescent moon and scattered pale gold stars, with a soft powder blue ribbon curving around the composition. Palette mist blue and cream yellow.
- Fox: A charming little amber fox sitting looking up, fluffy tail, three fine wheat stems, a few tiny footprints and pale gold stars, a restrained curling sage ribbon. Palette pale apricot, wheat cream, subtle sage.
- B612: A small golden-haired young space traveler in a sage green coat seen from behind, a very thin golden scarf flowing around a tiny asteroid with one miniature rose under a glass dome, and a few pale stars. Palette soft sage green and light gold.

新增信箱与日志使用同套插画联系图作为风格参考，内置 imagegen，透明背景。共用提示词：

> Create one ORIGINAL standalone transparent illustration asset for a Little Prince storybook website ticket. Reference sheet guides the delicate colored-pencil linework, pale translucent watercolor wash, soft pastel cream/blue/pink/sage, thin irregular contours and airy tiny stars. [SUBJECT] No background, no paper rectangle, no text, no border, no full webpage. Keep recognizable at 170px wide. Match the reference set closely. Plenty of negative space, no heavy brown watercolor, no photograph or 3D. Truly transparent background.

- Mailbox: A cream envelope tied with a flowing pale blue ribbon, small blush rose sprigs tucked into it, three tiny handwritten-looking GOLD STARS (no actual text), a small crescent moon. Airy horizontal composition with envelope as main subject.
- Flight: A cream paper airplane above a small stack of sage and blush journals tied with a narrow powder blue ribbon, a tiny brass compass and two pale clouds, several small gold stars. Airy horizontal composition with airplane as main subject.
