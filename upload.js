// functions/api/upload.js —— 接收 multipart 上传，存入 R2，返回访问 URL
// 绑定要求：在 Pages 项目设置里添加 R2 绑定，变量名 = UPLOADS

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS }
  });

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.UPLOADS) {
      return json({ ok: false, error: '未绑定 R2 存储桶（缺少 env.UPLOADS）' }, 500);
    }
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return json({ ok: false, error: '缺少上传文件（字段名应为 file）' }, 400);
    }

    const poi  = (form.get('poi')  || 'misc').toString();
    const task = (form.get('task') || '').toString();
    const role = (form.get('role') || '').toString();
    const type = (form.get('type') || 'file').toString();

    // 仅用 ASCII 安全字符做 key（poi 为英文键名，安全）
    const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    let ext = 'bin';
    if (file.name && file.name.includes('.')) ext = file.name.split('.').pop().toLowerCase().slice(0, 5);
    else if (type === 'audio') ext = 'webm';
    else if (type === 'photo') ext = 'jpg';
    const key = `${safe(type)}/${safe(poi)}/${ts}-${rand}.${safe(ext)}`;

    await env.UPLOADS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
      customMetadata: { poi, task, role, type, ts: String(ts) }
    });

    return json({ ok: true, key, url: `/api/file/${key}`, poi, task, role, type, ts });
  } catch (e) {
    return json({ ok: false, error: e.message || String(e) }, 500);
  }
}
