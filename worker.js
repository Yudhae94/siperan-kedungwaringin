// Cloudflare Worker: frontend statis (dari folder dist/) + proxy /api/* ke backend Express.
// Cara kerja:
//   - GET /api/... -> diteruskan (fetch) ke API_ORIGIN yang sama path-nya.
//   - Selain itu -> dilayani sebagai file statis dari [assets] (SPA fallback ke index.html).
// Wajib set Variables di dashboard Workers: API_ORIGIN = https://<tunnel-anda> (tanpa trailing slash).

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const apiOrigin = (env.API_ORIGIN || '').replace(/\/+$/, '')
    const apiTimeoutMs = Number(env.API_TIMEOUT_MS ?? 25000)
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      if (!apiOrigin) {
        return Response.json(
          { error: 'Backend belum dikonfigurasi. Set API_ORIGIN di Variables Worker ke URL backend Express.' },
          { status: 503 },
        )
      }
      const target = new URL(url.pathname + url.search, apiOrigin)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort('api-timeout'), apiTimeoutMs)
      try {
        // Sanitasi header yang tidak boleh diteruskan lintas origin:
        // host/cf-* milik Worker, content-length/encoding dihitung ulang oleh runtime.
        const forwardHeaders = new Headers(request.headers)
        forwardHeaders.delete('host')
        forwardHeaders.delete('content-length')
        forwardHeaders.delete('content-encoding')
        for (const key of [...forwardHeaders.keys()]) {
          if (key.startsWith('cf-') || key.startsWith('x-forwarded-') || key === 'x-real-ip') forwardHeaders.delete(key)
        }
        const proxied = new Request(target.toString(), {
          method: request.method,
          headers: forwardHeaders,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          redirect: 'manual',
          signal: controller.signal,
          // @ts-ignore: duplex dibutuhkan untuk streaming body di Workers
          duplex: 'half',
        })
        const upstream = await fetch(proxied)
        const headers = new Headers(upstream.headers)
        headers.delete('content-encoding')
        headers.delete('content-length')
        // Cookie sesi dari Express dibuat untuk domain tunnel backend.
        // Tulis ulang Domain agar cookie tersimpan di domain Worker (antar captcha -> login satu sesi).
        const rewritten = []
        for (const [key, value] of headers.entries()) {
          if (key.toLowerCase() === 'set-cookie') rewritten.push(value)
        }
        if (rewritten.length) {
          headers.delete('set-cookie')
          const workerHost = url.hostname
          for (const cookie of rewritten) {
            let fixed = cookie.replace(/;\s*Domain=[^;]*/gi, '')
            if (!/;\s*Secure/gi.test(fixed)) fixed += '; Secure'
            fixed += `; Domain=${workerHost}`
            headers.append('set-cookie', fixed)
          }
        }
        return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers })
      } catch (error) {
        return Response.json(
          { error: 'Backend tidak dapat dihubungi. Pastikan tunnel/server Express berjalan.' },
          { status: 502 },
        )
      } finally {
        clearTimeout(timer)
      }
    }
    // Selain /api/* biarkan Cloudflare Static Assets yang melayani (termasuk SPA fallback).
    return env.ASSETS.fetch(request)
  },
}
