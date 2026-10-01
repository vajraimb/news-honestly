# News Honestly

每日新闻分析卡片站点 — 事实 · 双解读 · 分歧 · 综合。

**Live site:** <https://vajraimb.github.io/news-honestly/>

纯静态：`index.html` + `styles.css` + `app.js` + `data/*.json`，无需构建。

## 预览

在本目录启动本地 HTTP 服务（推荐）：

```bash
cd /workspace/news-honestly
python3 -m http.server 8765
```

浏览器打开：<http://127.0.0.1:8765/>

也可直接用浏览器打开 `index.html`（`file://`）。此时 `fetch` 可能被拦截，页面会自动回退到 `data/briefs.embed.js` 中的嵌入数据。

## 数据

- `data/briefs.json` — 主数据（数组，**最新日期在前**）
- `data/briefs.embed.js` — `window.BRIEFS_DATA = …`，供 `file://` 回退

更新 JSON 后，请同步刷新 embed：

```bash
python3 -c '
import json
from pathlib import Path
p = Path("data/briefs.json")
data = json.loads(p.read_text(encoding="utf-8"))
Path("data/briefs.embed.js").write_text(
    "window.BRIEFS_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
    encoding="utf-8",
)
print("updated briefs.embed.js")
'
```

或使用辅助脚本（会自动写 embed）：

```bash
python3 scripts/add_brief.py path/to/new_day.json
```

## 新增一天

1. 按下方 schema 写好单日 brief JSON（或含 `briefs` 数组的片段）。
2. 运行 `python3 scripts/add_brief.py your_day.json` — 按 `date` 去重，新日期插入到最前；同日则替换。
3. 刷新浏览器。

### Brief schema（单日）

```json
{
  "date": "2026-10-02",
  "title": "早间简报",
  "windowNote": "…",
  "thinDay": false,
  "thinDayNote": "",
  "vsYesterday": "…",
  "stories": [
    {
      "id": "1",
      "title": "…",
      "tag": "新故事",
      "facts": ["…"],
      "readingA": "…",
      "readingB": "…",
      "disagree": "…",
      "synthesis": "…",
      "unknown": "…",
      "confidence": "中高",
      "sources": [{"label": "Reuters", "url": "https://…"}]
    }
  ],
  "index": [{"n": 1, "title": "…", "outlet": "…", "url": "https://…"}]
}
```

也接受完整包装：`{ "site": {…}, "briefs": [ … ] }`（会合并 `briefs`；`site` 若提供则更新）。

## 设计说明

- 浅色主题：灰白卡片、细边框、轻阴影，Inter + Noto Sans SC
- 顶栏日期切换 +「故事卡片 / 头条索引」页签
- 响应式网格：手机 1 列，平板 2 列，桌面 3 列；展开后通栏
- 卡片默认展示编号、标题、标签、置信度、FACTS 预览；点击或「展开」查看完整分析

## 目录

```
news-honestly/
├── index.html
├── styles.css
├── app.js
├── README.md
├── data/
│   ├── briefs.json
│   └── briefs.embed.js
└── scripts/
    └── add_brief.py
```
