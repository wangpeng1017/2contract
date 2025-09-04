/**
 * 对 fetch 提供包装的重试工具，避免在类中插入复杂成员方法导致解析冲突
 */
export async function fetchWithRetry(
  request: RequestInfo | URL,
  init: RequestInit,
  options: { maxRetries?: number; retryOn?: (status: number, text: string) => boolean } = {}
) {
  const maxRetries = options.maxRetries ?? 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(request, init);
    if (res.ok) return res;

    const text = await res.text().catch(() => '');
    const should = options.retryOn
      ? options.retryOn(res.status, text)
      : res.status === 429 || res.status === 503;
    if (!should || attempt === maxRetries) {
      // 还原一个新的 Response 供上层读取 json()
      return new Response(text, { status: res.status, statusText: res.statusText });
    }
    const backoff = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 300);
    await new Promise((r) => setTimeout(r, backoff));
  }
  throw new Error('unreachable');
}

