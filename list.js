// functions/api/list.js —— 列出最近上传（便于核验 / 做采集相册）
// 可选查询参数：?prefix=photo/nanshan/  &limit=100
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' }
  });

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.UPLOADS) return json({ ok: false, error: '未绑定 R2（env.UPLOADS）' }, 500);
  const url = new URL(request.url);
  const prefix = url.searchParams.get('prefix') || undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1000);
  const listed = await env.UPLOADS.list({ prefix, limit });
  const items = listed.objects.map((o) => ({
    key: o.key,
    size: o.size,
    uploaded: o.uploaded,
    url: `/api/file/${o.key}`,
    meta: o.customMetadata || {}
  }));
  return json({ ok: true, count: items.length, items });
}
