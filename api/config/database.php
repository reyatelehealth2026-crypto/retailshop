<?php
/**
 * Retail Mini App - Database Configuration
 * MySQL Database Connection for Retail System
 */

if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) === 'HTTP_') {
                $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$headerName] = $value;
            }
        }
        return $headers;
    }
}

function getRequestedOrigin() {
    return $_SERVER['HTTP_ORIGIN'] ?? '';
}

function getAllowedOrigins() {
    $defaults = [
        'http://localhost:3000',
        'http://localhost:4173',
        'http://localhost:5173',
        'https://localhost:3000',
        'https://localhost:4173',
        'https://localhost:5173',
    ];
    $configured = array_filter(array_map('trim', explode(',', getenv('APP_ALLOWED_ORIGINS') ?: '')));
    return array_values(array_unique(array_merge($defaults, $configured)));
}

function isOriginAllowed($origin) {
    if ($origin === '') {
        return false;
    }
    if (filter_var(getenv('APP_ALLOW_ALL_ORIGINS') ?: 'false', FILTER_VALIDATE_BOOLEAN)) {
        return true;
    }
    if (in_array($origin, getAllowedOrigins(), true)) {
        return true;
    }
    $host = parse_url($origin, PHP_URL_HOST);
    if (!$host) {
        return false;
    }
    return substr($host, -11) === '.vercel.app';
}

header('Content-Type: application/json; charset=utf-8');
$origin = getRequestedOrigin();
if (isOriginAllowed($origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Sync-Token, X-Webhook-Token');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $conn;
    
    public function __construct() {
        // Database configuration - using environment variables or defaults
        $this->host = getenv('DB_HOST') ?: 'localhost';
        $this->db_name = getenv('DB_NAME') ?: 'zrismpsz_demo';
        $this->username = getenv('DB_USER') ?: 'zrismpsz_demo';
        $this->password = getenv('DB_PASS') ?: 'zrismpsz_demo';
    }
    
    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch(PDOException $e) {
            error_log("Connection Error: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
        
        return $this->conn;
    }
}

// Helper function to send JSON response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Helper function to send error response
function sendError($message, $statusCode = 400, $errors = null) {
    $response = [
        'success' => false,
        'error' => $message,
        'message' => $message
    ];
    if ($errors) {
        $response['errors'] = $errors;
    }
    sendResponse($response, $statusCode);
}

// Helper function to get JSON input
function getJsonInput() {
    $json = file_get_contents('php://input');
    return json_decode($json, true);
}

// Helper function to validate required fields
function validateRequired($data, $fields) {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $missing[] = $field;
        }
    }
    return $missing;
}

function getEnvValue($key, $default = null) {
    $value = getenv($key);
    if ($value === false || $value === null || $value === '') {
        return $default;
    }
    return $value;
}

function base64UrlEncode($value) {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64UrlDecode($value) {
    $padding = strlen($value) % 4;
    if ($padding > 0) {
        $value .= str_repeat('=', 4 - $padding);
    }
    return base64_decode(strtr($value, '-_', '+/'));
}

function getBearerToken() {
    $headers = getallheaders();
    $authHeader = '';
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            $authHeader = $value;
            break;
        }
    }
    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }
    return trim($matches[1]);
}

function getAuthTokenSecret() {
    $configured = getEnvValue('AUTH_TOKEN_SECRET');
    if ($configured) {
        return $configured;
    }
    return hash('sha256', implode('|', [
        getEnvValue('DB_HOST', 'localhost'),
        getEnvValue('DB_NAME', 'zrismpsz_demo'),
        getEnvValue('DB_USER', 'zrismpsz_demo'),
        __FILE__
    ]));
}

function issueAuthToken(array $claims, $ttlSeconds = 604800) {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload = array_merge($claims, [
        'iat' => time(),
        'exp' => time() + $ttlSeconds
    ]);
    $encodedHeader = base64UrlEncode(json_encode($header, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $encodedPayload = base64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    $signature = hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, getAuthTokenSecret(), true);
    return $encodedHeader . '.' . $encodedPayload . '.' . base64UrlEncode($signature);
}

function verifyAuthToken($token) {
    if (!$token) {
        return null;
    }
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
    $expected = base64UrlEncode(hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, getAuthTokenSecret(), true));
    if (!hash_equals($expected, $encodedSignature)) {
        return null;
    }
    $payload = json_decode(base64UrlDecode($encodedPayload), true);
    if (!is_array($payload)) {
        return null;
    }
    if (!empty($payload['exp']) && time() >= intval($payload['exp'])) {
        return null;
    }
    return $payload;
}

function requireAuthenticatedCustomerId() {
    $token = getBearerToken();
    $payload = verifyAuthToken($token);
    if (!$payload || !isset($payload['userId'])) {
        sendError('Unauthorized', 401);
    }
    return intval($payload['userId']);
}

function getSyncToken() {
    $headers = getallheaders();
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'x-sync-token') {
            return trim($value);
        }
    }
    return trim($_GET['sync_token'] ?? $_POST['sync_token'] ?? '');
}

function requireSyncAccess() {
    $expected = getEnvValue('RETAIL_SYNC_TOKEN');
    if (!$expected) {
        sendError('Sync token is not configured', 503);
    }
    if (!hash_equals($expected, getSyncToken())) {
        sendError('Forbidden', 403);
    }
}

function getWebhookToken() {
    $headers = getallheaders();
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'x-webhook-token') {
            return trim($value);
        }
    }
    return trim($_GET['token'] ?? $_POST['token'] ?? '');
}

function requireWebhookAccess() {
    $expected = getEnvValue('ODOO_WEBHOOK_SECRET');
    if (!$expected) {
        sendError('Webhook token is not configured', 503);
    }
    if (!hash_equals($expected, getWebhookToken())) {
        sendError('Forbidden', 403);
    }
}
