# 豆瓣图片代理服务

一个用于代理访问豆瓣图片资源的服务。

## 功能特性

- 代理访问 doubanio.com 域名下的图片资源
- 支持简单防盗链保护，仅允许指定域名访问
- 支持直接访问（无来源信息）和配置的域名访问
- 自动设置合适的请求头以绕过豆瓣的访问限制
- 支持缓存控制和跨域资源共享(CORS)
- 支持3种平台部署Edge One、Cloudflare Workers、PHP

## 安装部署

### Workers部署

1. 登录 Cloudflare 控制台
2. 进入 Workers 页面
3. 创建一个新的 Worker
4. 将 [worker/_worker.js](file:///g/My%20%E5%BC%80%E5%8F%91%20project/image-douban-proxy/worker/_worker.js) 的内容复制到编辑器中
5. 保存并部署

### Edge One部署
1. 登录 Edge One 账户
2. 点击Pages页面
3. 创建一个新的项目
4. 将 edgeone文件夹下的所有文件上传
5. 配置环境变量
6. 配置完环境变量后，还要重新部署一次,要不然环境变量不会生效

### PHP 部署
1. 将PHP文件夹下的所有文件上传到服务器即可

## 环境变量配置

- `ALLOWED_REFERERS`: 允许访问的域名列表，用逗号分隔，例如："yoursite.com,anothersite.org"

## 使用方法

### 基本用法

访问格式：
```
https://your-worker-domain.workers.dev/{original-url-path}
```

例如：
```
https://your-worker-domain.workers.dev/img3.doubanio.com/view/photo/s_ratio_poster/public/p2928448127.webp
```

### 在网页中使用

```html
<img 
  src="https://your-worker-domain.workers.dev/img3.doubanio.com/view/photo/s_ratio_poster/public/p2928448127.webp" 
  alt="图片描述"
/>
```

### 配合允许域名使用

如果你设置了 `ALLOWED_REFERERS` 环境变量，确保在配置的域名下使用，否则请求会被拒绝。
如不设置 `ALLOWED_REFERERS` 环境变量，则默认允许所有请求访问。可能会快速的消耗你的免费额度, 请务必注意。

## 安全说明

- 本项目实现了防盗链保护，可防止其他网站直接引用你的代理服务
- 你可以通过环境变量配置允许访问的域名
- 在严格模式下，没有来源信息的请求会被拒绝

## 注意事项

- 此服务仅供学习和个人使用，不得用于商业用途
- 请遵守豆瓣的相关使用条款
- 请合理使用，避免对豆瓣服务器造成过大压力

## 许可证

本项目采用禁止商用许可证。