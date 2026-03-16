<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../classes/OdooRetailClient.php';

requireSyncAccess();

$database = new Database();
$db = $database->getConnection();
$offset = max(1, intval($_GET['offset'] ?? $_GET['start'] ?? 1));
$limit = min(50, max(1, intval($_GET['limit'] ?? 50)));
$client = new OdooRetailClient();

if (!$client->isConfigured()) {
    sendError('Odoo API is not configured', 503);
}

try {
    $result = $client->syncProducts($db, $offset, $limit);
    sendResponse([
        'success' => true,
        'data' => $result
    ]);
} catch (Throwable $e) {
    error_log('sync-products.php error: ' . $e->getMessage());
    sendError('Failed to sync products', 500, $e->getMessage());
}
