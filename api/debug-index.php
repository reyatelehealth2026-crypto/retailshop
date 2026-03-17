<?php
// สำหรับ debug CORS ใน index.php หลัก
// CORS Headers - ต้องอยู่บนสุดสุด
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Log สำหรับ debug
error_log("API Request: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'none'));
error_log("Headers: " . json_encode(getallheaders()));

// ส่ง response ง่ายๆ สำหรับทดสอบ
echo json_encode([
    'success' => true,
    'message' => 'Main API is working',
    'method' => $_SERVER['REQUEST_METHOD'],
    'uri' => $_SERVER['REQUEST_URI'],
    'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'none'
]);
?>
