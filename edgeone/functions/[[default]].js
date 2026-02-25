export default async function onRequest(context) {
  const request = context.request
  const url = new URL(request.url)

  // 特殊处理 favicon.ico 请求
  if (url.pathname === "/favicon.ico") {
    const favicon = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00,
      0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x06, 0x00,
      0x00, 0x00, 0x1f, 0xf3, 0xff, 0x61, 0x00, 0x00, 0x00,
      0x06, 0x62, 0x4b, 0x47, 0x44, 0x00, 0xff, 0x00, 0xff,
      0x00, 0xff, 0xa0, 0xbd, 0xa7, 0x93, 0x00, 0x00, 0x00,
      0x09, 0x70, 0x48, 0x59, 0x73, 0x00, 0x00, 0x0b, 0x13,
      0x00, 0x00, 0x0b, 0x13, 0x01, 0x00, 0x9a, 0x9c, 0x18,
      0x00, 0x00, 0x00, 0x07, 0x74, 0x49, 0x4d, 0x45, 0x07,
      0xd8, 0x0a, 0x17, 0x0c, 0x1d, 0x2d, 0x9d, 0x18, 0x66,
      0x2c, 0x00, 0x00, 0x00, 0x6c, 0x49, 0x44, 0x41, 0x54,
      0x38, 0xcb, 0x63, 0x60, 0x00, 0x02, 0x11, 0x09, 0x29,
      0x69, 0x19, 0x58, 0x24, 0x13, 0x98, 0x98, 0xc5, 0x25,
      0xa4, 0x64, 0x60, 0x91, 0x4c, 0x60, 0x62, 0x96, 0x90,
      0x94, 0x96, 0x85, 0x45, 0x32, 0x81, 0x89, 0x59, 0x42,
      0x52, 0x5a, 0x0e, 0x0e, 0xc9, 0x4c, 0x60, 0x62, 0x96,
      0x94, 0x92, 0x96, 0x83, 0x43, 0x32, 0x13, 0x98, 0x98,
      0x65, 0x64, 0xe5, 0xe0, 0x90, 0xcc, 0x04, 0x26, 0x66,
      0x59, 0x39, 0x79, 0x78, 0x24, 0x33, 0x81, 0x89, 0x59,
      0x4e, 0x5e, 0x01, 0x1e, 0xc9, 0x4c, 0x60, 0x62, 0x96,
      0x97, 0x57, 0x80, 0x47, 0x32, 0x13, 0x98, 0x98, 0x15,
      0x14, 0x15, 0xe1, 0x91, 0xcc, 0x04, 0x26, 0x66, 0x45,
      0x25, 0x65, 0x78, 0x24, 0x33, 0x81, 0x89, 0x59, 0x49,
      0x59, 0x05, 0x1e, 0xc9, 0x00, 0x00, 0x1a, 0x9c, 0x0d,
      0x66, 0xae, 0x6c, 0x7d, 0x62, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ])

    return new Response(favicon, {
      status: 200,
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control":
          "public, max-age=31536000, immutable",
      },
    })
  }

  const currentDomain = url.hostname

  // 防盗链检查函数
  function checkReferer(request, currentDomain, env) {
    const allowedReferers = env.ALLOWED_REFERERS
      ? env.ALLOWED_REFERERS.split(",").map((s) => s.trim())
      : []

    // 自动添加当前 EdgeOne 绑定的域名
    allowedReferers.push(currentDomain)

    const referer = request.headers.get("Referer")
    const origin = request.headers.get("Origin")

    // 必须有 Referer 或 Origin,否则拒绝
    if (!referer && !origin) {
      return false
    }

    try {
      const sourceHost = new URL(referer || origin).hostname

      // 检查是否在白名单中(支持子域名)
      return allowedReferers.some((allowed) => {
        if (sourceHost === allowed) return true
        if (sourceHost.endsWith("." + allowed)) return true
        return false
      })
    } catch (e) {
      return false
    }
  }

  // 防盗链检查
  if (!checkReferer(request, currentDomain, context.env)) {
    return new Response(
      "Access denied: Valid referer required. Cross-origin requests from unauthorized domains are not allowed.",
      {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      },
    )
  }

  // 从路径中提取目标URL（移除开头的斜杠）
  let query = url.searchParams
  let fullPath =
    query.get("url") || url.pathname.substring(1)

  // 地址栏参数解码
  fullPath = decodeURIComponent(fullPath)

  // 如果路径为空，则返回错误
  if (!fullPath) {
    return new Response(
      "Invalid path. Expected format: /domain.com/path/to/image",
      { status: 400 },
    )
  }

  // 移除协议头
  fullPath = fullPath.replace(/^https?:\/\//, "")

  // 分割路径以获取主机名和剩余路径
  const pathParts = fullPath.split("/")

  // 检查是否只是单一文件名，如果是，则返回错误
  if (pathParts.length < 2) {
    // 对于不合规的路径，返回错误信息
    return new Response(
      `Invalid path format. Expected: /hostname/path, but got: /${fullPath}`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
        },
      },
    )
  }

  const hostname = pathParts[0]
  const remainingPath = pathParts.slice(1).join("/")

  // 验证主机名是否为 doubanio.com 的子域名
  if (!hostname.endsWith("doubanio.com")) {
    return new Response(
      "Only doubanio.com domains allowed",
      { status: 403 },
    )
  }

  // 构造目标URL，保留原始子域名
  const targetUrl = `https://${hostname}/${remainingPath}`

  // 检查缓存
  try {
    const cache = caches.default
    const cacheKey = new Request(targetUrl, {
      headers: {
        Accept: "image/*",
      },
    })

    let response = await cache.match(cacheKey)

    if (!response) {
      const headers = new Headers()
      headers.set("Referer", "https://movie.douban.com/")
      headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      )
      headers.set(
        "Accept",
        "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      )

      const proxyRequest = new Request(targetUrl, {
        method: "GET",
        headers: headers,
        redirect: "follow",
      })

      const fetchedResponse = await fetch(proxyRequest)

      if (!fetchedResponse.ok) {
        return new Response(
          `Fetch failed: ${fetchedResponse.status} (可能 418 被拒，试换 Referer 或子域)`,
          { status: fetchedResponse.status },
        )
      }

      // 检查响应内容类型是否为图片
      const contentType =
        fetchedResponse.headers.get("Content-Type")
      if (
        !contentType ||
        !contentType.startsWith("image/")
      ) {
        return new Response(
          `Fetch failed. Content-Type: ${contentType} (可能418被拒，试换Referer或去掉强制img3)`,
          { status: 502 },
        )
      }

      // 创建新的响应，包含原始响应的主体和状态
      response = new Response(fetchedResponse.body, {
        status: fetchedResponse.status,
        statusText: fetchedResponse.statusText,
        headers: fetchedResponse.headers,
      })

      // 设置安全的响应头
      response.headers.set(
        "Content-Type",
        contentType || "image/webp",
      )
      response.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      )
      response.headers.set(
        "Access-Control-Allow-Origin",
        "*",
      )

      // 未命中缓存，设置响应头标识
      response.headers.set("x-edgefunctions-cache", "miss")

      // 存储到缓存
      try {
        context.waitUntil(
          cache.put(cacheKey, response.clone()),
        )
      } catch (cacheError) {
        console.warn("Cache put failed:", cacheError)
      }
    } else {
      // 命中缓存，设置响应头标识
      response.headers.set("x-edgefunctions-cache", "hit")
    }

    return response
  } catch (error) {
    return new Response(
      `Request failed: ${error.message}`,
      { status: 500 },
    )
  }
}
