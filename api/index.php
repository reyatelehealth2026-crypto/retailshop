<?php
/**
 * Retail Mini App - API Router
 * Main entry point for all API endpoints
 */

// CORS Headers - ต้องอยู่บนสุด
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config/database.php';

// Get the request path
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Parse the path - รับจาก query string ถ้ามีจาก .htaccess
$endpoint = $_GET['endpoint'] ?? '';
$path = $endpoint;

// ถ้าไม่มี endpoint ให้ parse จาก URI เหมือนเดิม
if (empty($path)) {
    $path = parse_url($requestUri, PHP_URL_PATH);
    $path = str_replace('/api/', '', $path);
    $path = trim($path, '/');
}

$segments = explode('/', $path);

// Route to appropriate endpoint
$endpoint = $segments[0] ?? '';
$action = $segments[1] ?? '';
$id = $segments[2] ?? null;

try {
    switch ($endpoint) {
        case 'products':
            require_once 'endpoints/products.php';
            break;
            
        case 'categories':
            require_once 'endpoints/categories.php';
            break;
            
        case 'cart':
            require_once 'endpoints/cart.php';
            break;
            
        case 'orders':
            require_once 'endpoints/orders.php';
            break;
            
        case 'auth':
            require_once 'endpoints/auth.php';
            break;
            
        case 'banners':
            require_once 'endpoints/banners.php';
            break;
            
        case 'promotions':
            require_once 'endpoints/promotions.php';
            break;
            
        case 'notifications':
            require_once 'endpoints/notifications.php';
            break;

        case 'payment':
            require_once 'endpoints/payment.php';
            break;

        case 'webhook':
            require_once 'endpoints/webhook.php';
            break;
            
        case 'health':
            sendResponse(['success' => true, 'status' => 'ok', 'message' => 'API is running']);
            break;
            
        default:
            sendError('Endpoint not found', 404);
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    sendError('Internal server error', 500);
}
