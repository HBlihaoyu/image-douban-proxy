export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const currentDomain = url.hostname;
    let fullPath = url.pathname.substring(1);
    
    if (!fullPath) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>豆瓣图片代理服务</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              border-bottom: 2px solid #4a90e2;
              padding-bottom: 10px;
            }
            .example {
              background-color: #f8f9fa;
              border-left: 4px solid #4a90e2;
              padding: 15px;
              margin: 20px 0;
            }
            code {
              background-color: #f1f1f1;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: monospace;
            }
            .note {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 4px;
              padding: 10px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>豆瓣图片代理服务</h1>
            <p>这是一个用于代理访问豆瓣图片资源的服务，用于解决豆瓣图片防盗链问题。</p>
            
            <div class="example">
              <h3>使用方法</h3>
              <p>将豆瓣原始图片链接:</p>
              <code>https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2928387071.webp</code>
              
              <p>替换为:</p>
              <code>https://${currentDomain}/img1.doubanio.com/view/photo/s_ratio_poster/public/p2928387071.webp</code>
            </div>
            
            <div class="note">
              <strong>注意事项:</strong>
              <ul>
                <li>仅支持 doubanio.com 域名下的资源</li>
                <li>所有资源都会被缓存以提高访问速度</li>
                <li>请合理使用，不要用于商业用途</li>
              </ul>
            </div>
            
            <h3>示例</h3>
            <p>访问 <code>/img2.doubanio.com/spic/s2928387071.jpg</code> 来代理 <code>https://img2.doubanio.com/spic/s2928387071.jpg</code></p>
          </div>
        </body>
        </html>
      `;
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
    // 防盗链检查函数
    function checkReferer(request, currentDomain, env) {
      const allowedReferers = env.ALLOWED_REFERERS 
        ? env.ALLOWED_REFERERS.split(',').map(s => s.trim()) 
        : [];
      
      // 自动添加当前 Worker 绑定的域名
      allowedReferers.push(currentDomain);
      
      const referer = request.headers.get('Referer');
      const origin = request.headers.get('Origin');
      
      // 必须有 Referer 或 Origin,否则拒绝
      if (!referer && !origin) {
        return false;
      }
      
      try {
        const sourceHost = new URL(referer || origin).hostname;
        
        // 检查是否在白名单中(支持子域名)
        return allowedReferers.some(allowed => {
          if (sourceHost === allowed) return true;
          if (sourceHost.endsWith('.' + allowed)) return true;
          return false;
        });
      } catch (e) {
        return false;
      }
    }
    
    // 防盗链检查
    if (!checkReferer(request, currentDomain, env)) {
      return new Response('Access denied: Valid referer required. Cross-origin requests from unauthorized domains are not allowed.', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // 分割路径
    const pathParts = fullPath.split('/');
    if (pathParts.length < 2) {
      return new Response('Invalid path format. Expected: /hostname/path', { status: 400 });
    }
    
    const hostname = pathParts[0];
    const remainingPath = pathParts.slice(1).join('/');
    
    if (!hostname.endsWith('doubanio.com')) {
      return new Response('Only doubanio.com domains allowed', { status: 403 });
    }
    
    const targetUrl = `https://${hostname}/${remainingPath}`;
    
    // 检查缓存
    const cache = caches.default;
    const cacheKey = new Request(targetUrl, {
      headers: { 'Accept': 'image/*' }
    });
    
    let cachedResponse = await cache.match(cacheKey);
    
    // 如果缓存命中,返回缓存内容
    if (cachedResponse) {
      const newResponse = new Response(cachedResponse.body, cachedResponse);
      newResponse.headers.set('x-cache', 'HIT');
      newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;
    }
    
    // 缓存未命中,发起请求
    const headers = new Headers();
    headers.set('Referer', 'https://movie.douban.com/');
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    headers.set('Accept', 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8');
    
    const proxyRequest = new Request(targetUrl, {
      method: 'GET',
      headers: headers,
      redirect: 'follow'
    });
    
    try {
      const fetchedResponse = await fetch(proxyRequest);
      
      if (!fetchedResponse.ok) {
        return new Response(`Fetch failed: ${fetchedResponse.status} (可能 418 被拒,试换 Referer 或子域)`, { 
          status: fetchedResponse.status 
        });
      }
      
      // 检查响应内容类型
      const contentType = fetchedResponse.headers.get('Content-Type');
      if (!contentType || !contentType.startsWith('image/')) {
        return new Response(`Fetch failed. Content-Type: ${contentType} (可能418被拒,试换Referer或去掉强制img3)`, { 
          status: 502 
        });
      }
      
      // 创建新的响应
      const newResponse = new Response(fetchedResponse.body, {
        status: fetchedResponse.status,
        statusText: fetchedResponse.statusText,
        headers: fetchedResponse.headers
      });
      
      // 设置响应头
      newResponse.headers.set('Content-Type', contentType || 'image/webp');
      newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('x-cache', 'MISS');
      
      // 异步存储到缓存
      ctx.waitUntil(cache.put(cacheKey, newResponse.clone()));
      
      return newResponse;
    } catch (error) {
      return new Response(`Request failed: ${error.message}`, { status: 500 });
    }
  }
};