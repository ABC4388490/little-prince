# 🌟 小王子 AI 情感对话平台

> *"你在你的星球上，我在我的。但只要你对着星星说话，我就会听见。"*

一个以《小王子》为主题的沉浸式 AI 情感对话网站。用户可以与具有记忆的小王子 AI 进行情感聊天，探索 8 颗星球的叙事旅程，并在飞行日志中阅读圣埃克苏佩里的真实故事。

🔗 **在线体验：[little-prince.xyz](https://little-prince.xyz)**

---

## 📸 预览

| 星球旅程地图 | AI 对话 | 星空信箱 |
|:-----------:|:-------:|:-------:|
| 8 颗可交互星球，SVG 地图导航 | 有记忆的小王子 AI 角色对话 | 对话归档、收藏、跨页面同步 |

| 章节故事弹窗 | 飞行日志 |
|:-----------:|:-------:|
| 8 章时间线，触摸/键盘/拖拽切换 | 圣埃克苏佩里真实经历叙事 |

---

## ✨ 核心功能

### 🤖 AI 角色对话（核心）
- 与小王子 AI 进行有记忆的情感聊天，回复风格模仿原著诗意
- **用户画像记忆系统**：自动提取情绪、烦恼、喜好，注入 system prompt 实现跨会话个性化
- **离线容灾机制**：API 不可达时基于规则情绪检测 + FNV 哈希保证回复稳定，无感知降级
- 狐狸驯服互动：3 步问答 → AI 生成个性化关系箴言

### 🌌 沉浸式交互体验
- **星际明信片**：对话一键生成 PNG 图片下载
- **星星飞行动画**：每句话发出后变成星空中的一颗星，悬停显示对话内容
- 打字机效果 + Web Audio API 合成音效
- 纸张质感系统（噪点 / 纤维 / 折痕 / 水印）+ 视差伴生元素

### 📖 内容叙事
- **Journey 星球旅程**：8 章时间线 + SVG 交互地图 + 纸飞机导航
- **飞行日志**：沉浸式讲述圣埃克苏佩里真实经历
- 8 种故事弹窗 + 章节滑动切换（触摸 / 键盘 / 拖拽）

### 📬 数据层
- **星空信箱**：对话归档、收藏、删除
- localStorage + URL hash 跨页面数据共享
- PostgreSQL 对话持久化，配置后支持跨设备历史同步

---

## 🏗️ 系统架构

```
用户浏览器（Vercel）
      │
      │  Vanilla JS · CSS 动效 · SVG 交互
      │
      ▼
  FastAPI 主服务（Railway）
      │
      ├── /api/chat ──────────→ Agent 策略路由
      │                              ├── 情绪检测（emotion / philosophy / general）
      │                              ├── RAG 检索（FAISS → CrossEncoder 重排）
      │                              └── DeepSeek API 生成回复
      │
      ├── /api/analyze ───────→ RAG + 温柔解读管线
      │
      ├── /api/conversations ─→ 对话持久化
      │                              └── PostgreSQL（生产）/ SQLite（开发）
      │
      └── Flask（WSGIMiddleware 挂载）
               └── 旧版星星留言接口
```

---

## 🛠️ 技术栈

**前端**
- Vanilla JS（无框架）· HTML · CSS
- 大量 SVG 动效 · clip-path · 视差效果 · 纸质感纹理
- Web Audio API · Google Fonts 手写字体

**后端**
- FastAPI + Flask（WSGIMiddleware 混合挂载）
- Uvicorn（ASGI）+ Gunicorn（WSGI）

**AI / RAG**
- DeepSeek Chat API
- sentence-transformers（文本向量化）
- FAISS（向量相似性检索）
- CrossEncoder（重排序）
- 自建 RAG 管线：embedding → retriever → reranker → generator

**数据库 & 部署**
- PostgreSQL（生产）/ SQLite（开发）
- Vercel（前端）+ Railway（后端）

---

## 🚀 本地启动

```bash
# 1. 克隆仓库
git clone https://github.com/yourname/little-prince.git
cd little-prince/message-api

# 2. 创建虚拟环境并安装依赖
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY 和可选的 DATABASE_URL

# 4. 构建 RAG 知识库索引
python scripts/build_chunk_meta.py
python -m rag.embed

# 5. 启动后端
uvicorn asgi:app --reload --host 127.0.0.1 --port 5000
```

浏览器打开 `http://localhost:5000/health`，返回 `{"ok":true}` 即启动成功。

---

## ⚙️ 环境变量

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek API 密钥 |
| `DATABASE_URL` | ❌ | Postgres 连接串，配置后启用跨设备对话同步 |
| `CORS_ORIGINS` | ❌ | 允许访问的前端域名（逗号分隔） |
| `RAG_FAISS_TOP_K` | ❌ | 向量检索候选条数（默认 10） |
| `RAG_FINAL_TOP_K` | ❌ | 重排后注入模型的条数（默认 3） |
| `RAG_DISABLE_RERANK` | ❌ | 设为 `1` 跳过重排，节省冷启动时间 |

---

## 🧪 测试

```bash
# 单元测试（RAG 管线、检索、prompt）
python -m unittest discover -s tests -v

# 端到端批量自检
python scripts/validate_rag_e2e.py

# 快速验证（2 条样例）
python scripts/validate_rag_e2e.py --quick

# 单次对话演示
python run_demo.py "你觉得孤独是什么？"
```

---

## 📁 项目结构

```
little-prince/
├── index.html              # 前端入口
├── message-api/            # 后端服务
│   ├── asgi.py             # 推荐启动入口（FastAPI + Flask）
│   ├── app/
│   │   ├── api/            # HTTP 路由（Blueprint）
│   │   ├── services/       # llm / rag / agent / analyze 服务
│   │   └── db.py           # 数据库初始化
│   ├── rag/                # RAG 子系统
│   │   ├── embedding/      # 句向量 bi-encoder
│   │   ├── vectorstore/    # FAISS 索引
│   │   ├── retriever/      # 查询检索
│   │   ├── reranker/       # CrossEncoder 重排
│   │   ├── generator/      # DeepSeek 生成
│   │   └── pipeline/       # 管线编排
│   ├── scripts/            # 构建索引 & 自检脚本
│   └── tests/              # 单元测试
```

---

*made with ✦ and a little longing for the stars*
