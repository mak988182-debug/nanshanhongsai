# 南山·通道 — 任务上传接口部署说明

页面里「拍照 / 录音」任务的「上传并完成」按钮，现在会把文件以 `multipart/form-data` 真实上传到接口 `POST /api/upload`。下面是把它跑起来的最简方案：**Cloudflare Pages Functions + R2 对象存储**（与你现有的 `nanshanhongsai.pages.dev` 完全一致，无需另购服务器）。

## 一、目录结构

把本目录的文件按如下结构放进你的 Pages 项目根目录：

```
项目根目录/
├── index.html
└── functions/
    └── api/
        ├── upload.js          # POST 上传 → 存入 R2
        ├── list.js            # GET  列出最近上传（核验/相册）
        └── file/
            └── [[key]].js     # GET  读取并返回文件
```

`functions/` 是 Cloudflare Pages 约定的目录，部署后会自动变成同域接口：
- 上传：`POST /api/upload`
- 读取：`GET /api/file/<key>`
- 列表：`GET /api/list`

## 二、创建并绑定 R2 存储桶

1. Cloudflare 控制台 → R2 → 创建存储桶，例如命名 `nanshan-uploads`。
2. 进入你的 Pages 项目 → **Settings → Functions → R2 bucket bindings** → 添加绑定：
   - **Variable name（变量名）**：`UPLOADS`（务必是这个名字，代码里用的就是 `env.UPLOADS`）
   - **R2 bucket**：选择刚建的 `nanshan-uploads`
3. 保存后重新部署（Deployments → Retry deployment 或推一次新提交）。

> 不绑定 R2 也能部署，但调用 `/api/upload` 会返回「未绑定 R2」的错误提示。

## 三、验证

- 手机或电脑打开站点，点一个拍照/录音任务 → 拍照/录音 → 「上传并完成」。
- 浏览器开发者工具 Network 里能看到 `POST /api/upload` 返回 `{ ok:true, url:"/api/file/..." }`。
- 直接访问 `https://你的域名/api/list` 可看到已上传文件清单；点 `url` 能打开文件。

上传时会附带这些字段，方便后台归类：`file`、`poi`（点位英文键）、`task`（任务名）、`role`（身份）、`type`（photo/audio）。

## 四、前端如何指向接口

- 默认前端上传到**同域** `/api/upload`，所以只要 `index.html` 和 `functions/` 一起部署在同一个 Pages 项目即可，无需改动。
- 如果你的接口在别的地址（例如独立服务器），在 `index.html` 里 `<head>` 顶部加一行即可覆盖：
  ```html
  <script>window.NS_UPLOAD_ENDPOINT = 'https://api.你的域名.com/upload';</script>
  ```
- 想让「上传失败时不允许完成任务」（严格模式），在 index.html 里把 `NS_UPLOAD.fallbackOnError` 改成 `false`（搜索 `fallbackOnError` 即可）。当前默认 `true`：接口未部署时仍可本地完成，便于演示。

## 五、换成你自己的服务器（可选）

任何能接收 `multipart/form-data`（字段名 `file`）并返回 JSON `{ "ok": true, "url": "可访问地址" }` 的接口都可对接。前端只认这个返回格式：`ok:false` 视为失败，`url` 会被记录到 `window._taskUploads`。

## 六、安全与配额（建议）

- 生产环境建议在 `upload.js` 里加：文件大小上限、`type` 白名单（仅 image/audio）、来源校验或简单令牌，避免被滥用。
- R2 有免费额度；大量音视频请关注存储与请求用量。
- 如需公开直链，可给 R2 桶开「公开访问」或绑定自定义域，然后把 `upload.js` 返回的 `url` 换成公开域名前缀。
