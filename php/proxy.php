<?php
// proxy.php - 豆瓣图片路径式代理
// 示例：https://yourdomain.com/img3.doubanio.com/view/photo/s_ratio_poster/public/p2221751514.jpg
// PHP版本禁止跨站请求请自行到你的服务器上进行设置

// 获取路径（去掉开头的/)
$path = trim($_SERVER['REQUEST_URI'], '/');
if (empty($path)) {
    http_response_code(400);
    die('Invalid path');
}

// 正则匹配豆瓣路径：img[1-9].doubanio.com/剩余路径
if (!preg_match('#^img([1-9])\.doubanio\.com/(.*)$#i', $path, $matches)) {
    http_response_code(403);
    die('Only doubanio.com images allowed');
}

$sub_num = $matches[1];
$sub_path = $matches[2];

$target_host = "img{$sub_num}.doubanio.com";

$target_url = "https://{$target_host}/{$sub_path}";

// cURL 获取图片
$ch = curl_init($target_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Referer: https://movie.douban.com/',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    ],
]);

$data = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($code !== 200 || empty($data) || strpos($content_type ?? '', 'image/') !== 0) {
    http_response_code($code ?: 502);
    die("Fetch failed. Code: $code (可能418被拒，试换Referer或去掉强制img3)");
}

// 输出图片
header('Content-Type: ' . ($content_type ?: 'image/jpeg'));
header('Cache-Control: public, max-age=31536000, immutable');
header('Access-Control-Allow-Origin: *');
echo $data;