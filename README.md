# Arvin Prompt Library · 视频生成提示词案例库

博主 **@Arvin010717**（https://x.com/Arvin010717）的视频生成提示词在线预览网站。
参考 seedance-prompts-nu.vercel.app 的案例库形式：**首页卡片网格可筛选 → 详情页可展开完整提示词**。

## 部署到 Vercel（免费）

1. 把整个 `prompts-site/` 目录推送到 GitHub 仓库：
   ```bash
   cd prompts-site
   git init
   git add .
   git commit -m "prompt library site"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
2. 到 [vercel.com](https://vercel.com) → **Add New Project** → 导入该 GitHub 仓库。
3. FrameWork Preset 选 **Other**（静态站），直接 **Deploy**。
4. 部署完成即获得公网地址（如 `https://<项目名>.vercel.app`）。

`vercel.json` 已配置：
- 详情页短链：`/case/<slug>` → 自动跳转到 `detail.html?slug=<slug>`
- `data/prompts.json` 不缓存（保证更新即时可见）

## 本地预览

```bash
cd prompts-site
python3 -m http.server 8823
# 打开 http://127.0.0.1:8823
```

## 手动触发自动更新

**核心命令**：从 X 重新抓取博主最新推文 → 检测新增提示词 → 自动合并写入 `data/prompts.json` → 网站自动显示新内容（静态站无需重新构建）。

```bash
cd prompts-site

# 正常同步（会启动本地 Chrme 抓取，发现新提示词则写入数据并输出提示）
node sync.js

# 只预览新增内容，不写入文件
node sync.js --dry-run
```

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CHROME_PATH` | 自动探测常见路径 | 指定 Chrome/Chromium 路径 |
| `SCREEN_NAME` | `Arvin010717` | 抓取的 X 用户名 |
| `CDP_PORT` | `9333` | headless Chrome 调试端口 |

### 抓取原理

1. 启动 headless Chrome → 打开博主 X 主页（guest 可见时间线）
2. 在页面上下文调用 X GraphQL API（自动携带 guest token）：
   - `UserTweets` 查询 → 分页获取用户时间线
   - `TweetResultByRestId` 查询 → 逐条检查 NoteTweet 长文全文
3. **线程递归扫描**：提示词帖常以「自线程」发布（主帖→视频提示词帖→MJ 首帧帖），
   对每条推文抓取 SSR 详情页并递归发现同线程帖，再逐个检查 NoteTweet
4. 命中提示词关键词（提示词/prompt/故事板/分镜/--ar 等）的长文 → 收录
5. 按推文 ID 去重合并 → 写入 `data/prompts.json`

### 自动归组规则

- 同一天发布的提示词帖自动归并到同一案例（如 8/8：故事板+视频生成提示词；8/22：视频提示词+MJ 提示词）
- 类型判定按第一行标题：MJ 提示词 → 故事板提示词 → 视频提示词
- 已存在的提示词（按推文 ID 去重）不会重复收录

## 数据结构

```
prompts-site/
├── index.html          # 首页（卡片网格 + 筛选 + 搜索）
├── detail.html         # 详情页（元信息 + 可展开提示词 + 复制按钮）
├── vercel.json         # Vercel 部署配置（clean URLs / 短链 / 缓存策略）
├── package.json        # npm scripts（sync / sync:dry）
├── sync.js             # 手动触发抓取→更新的同步脚本
├── assets/
│   ├── style.css       # 白色简洁风格样式
│   └── app.js          # 渲染逻辑（fetch data → 渲染首页/详情/展开/复制）
└── data/
    └── prompts.json    # 数据源（更新即网站更新）
```

`data/prompts.json` 结构：

```json
{
  "updatedAt": "2026-08-22T00:00:00Z",
  "source": "https://x.com/Arvin010717",
  "cases": [
    {
      "id": "2091008730079146169",
      "slug": "cathedral-duel-22s",
      "title": "教堂剑斗：紫电剑客 vs 绯樱剑姬",
      "summary": "……",
      "tags": ["短视频", "3D动漫"],
      "featured": true,
      "date": "2026-08-22",
      "sourceUrl": "https://x.com/Arvin010717/status/2091008730079146169",
      "prompts": [
        {
          "id": "2091008830247514414",
          "type": "视频提示词",
          "duration": "22.27秒",
          "model": "视频生成",
          "full_text": "视频提示词：\n使用【@图片1】作为唯一严格首帧。……"
        }
      ]
    }
  ]
}
```

## 常见问题

- **sync 报「X 页面返回风控/拒绝」**：稍等几分钟重试，X 对短时间高频请求会限流。
- **提示词帖有遗漏**：博主把提示词发在时间线看不到的线程里时，sync 的线程递归扫描会尽力发现；也可人工把推文链接发给 sync 扩展扫描范围。
- **想改配色/主题**：直接编辑 `assets/style.css` 顶部的 CSS 变量即可。
