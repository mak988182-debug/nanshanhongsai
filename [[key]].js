// functions/api/file/[[key]].js —— 从 R2 读取并返回上传的文件（key 含斜杠，用 catch-all）
export async function onRequestGet(context) {
  const { env, params } = context;
  const key = Array.isArray(params.key) ? params.key.join('/') : params.key;
  if (!env.UPLOADS) return new Response('未绑定 R2（env.UPLOADS）', { status: 500 });
  const obj = await env.UPLOADS.get(key);
  if (!obj) return new Response('文件不存在', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000');
  return new Response(obj.body, { headers });
}
