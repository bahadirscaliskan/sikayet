<?php
// Router script for PHP built-in server

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Remove trailing slash
$uri = rtrim($uri, '/');

// If empty, set to index
if (empty($uri) || $uri === '/') {
    $uri = '/index';
}

// API requests - pass through
if (strpos($uri, '/api/') === 0) {
    return false;
}

// Static files - serve them directly
$staticExtensions = ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'];
$extension = pathinfo($uri, PATHINFO_EXTENSION);
if (in_array($extension, $staticExtensions)) {
    return false;
}

// Remove /public/ prefix if exists
$cleanUri = str_replace('/public/', '/', $uri);

// Try to find HTML file in public directory
$htmlFile = __DIR__ . '/public' . $cleanUri . '.html';

if (file_exists($htmlFile)) {
    // Serve the HTML file
    include $htmlFile;
    exit;
}

// If file exists in public directory, serve it
$publicFile = __DIR__ . '/public' . $cleanUri;
if (file_exists($publicFile)) {
    return false;
}

// 404 - file not found
http_response_code(404);
echo "404 - Page not found";
