<?php

requireWebhookAccess();

$database = new Database();
$db = $database->getConnection();
$data = getJsonInput();

$orderRef = (string) ($data['orderRef'] ?? $data['order_no'] ?? $data['odoo_order_ref'] ?? '');
$odooOrderId = intval($data['odooOrderId'] ?? $data['order_id'] ?? 0);
$status = (string) ($data['status'] ?? '');
$paymentStatus = (string) ($data['paymentStatus'] ?? $data['payment_status'] ?? '');
$trackingNo = (string) ($data['trackingNo'] ?? $data['tracking_no'] ?? '');
$shippingProvider = (string) ($data['shippingProvider'] ?? $data['shipping_provider'] ?? '');
$note = (string) ($data['note'] ?? 'Odoo status updated');

if ($orderRef === '' && $odooOrderId <= 0) {
    sendError('Missing order reference', 400);
}

$where = [];
$params = [];
if ($orderRef !== '') {
    $where[] = 'odoo_order_ref = :odoo_order_ref';
    $params[':odoo_order_ref'] = $orderRef;
}
if ($odooOrderId > 0) {
    $where[] = 'odoo_order_id = :odoo_order_id';
    $params[':odoo_order_id'] = $odooOrderId;
}

$stmt = $db->prepare('SELECT id, status FROM retail_orders WHERE ' . implode(' OR ', $where) . ' LIMIT 1');
$stmt->execute($params);
$order = $stmt->fetch();
if (!$order) {
    sendError('Order not found', 404);
}

$updates = ['updated_at = NOW()'];
$updateParams = [':id' => intval($order['id'])];
if ($status !== '') {
    $updates[] = 'status = :status';
    $updateParams[':status'] = $status;
    if ($status === 'confirmed') {
        $updates[] = 'confirmed_at = NOW()';
    } elseif ($status === 'shipped') {
        $updates[] = 'shipped_at = NOW()';
    } elseif ($status === 'delivered') {
        $updates[] = 'delivered_at = NOW()';
    } elseif ($status === 'cancelled') {
        $updates[] = 'cancelled_at = NOW()';
    }
}
if ($paymentStatus !== '') {
    $updates[] = 'payment_status = :payment_status';
    $updateParams[':payment_status'] = $paymentStatus;
    if ($paymentStatus === 'paid') {
        $updates[] = 'paid_at = NOW()';
    }
}
if ($trackingNo !== '') {
    $updates[] = 'tracking_no = :tracking_no';
    $updateParams[':tracking_no'] = $trackingNo;
}
if ($shippingProvider !== '') {
    $updates[] = 'shipping_provider = :shipping_provider';
    $updateParams[':shipping_provider'] = $shippingProvider;
}
if ($odooOrderId > 0) {
    $updates[] = 'odoo_order_id = :odoo_order_id';
    $updateParams[':odoo_order_id'] = $odooOrderId;
}
if ($orderRef !== '') {
    $updates[] = 'odoo_order_ref = :odoo_order_ref';
    $updateParams[':odoo_order_ref'] = $orderRef;
}
$updates[] = "odoo_sync_status = 'synced'";
$updates[] = 'odoo_sync_error = NULL';

$update = $db->prepare('UPDATE retail_orders SET ' . implode(', ', $updates) . ' WHERE id = :id');
$update->execute($updateParams);

$history = $db->prepare('INSERT INTO retail_order_status_history (order_id, status_from, status_to, note, created_by) VALUES (:order_id, :status_from, :status_to, :note, :created_by)');
$history->execute([
    ':order_id' => intval($order['id']),
    ':status_from' => $order['status'],
    ':status_to' => $status !== '' ? $status : $order['status'],
    ':note' => $note,
    ':created_by' => 'odoo_webhook'
]);

sendResponse([
    'success' => true,
    'data' => [
        'orderId' => intval($order['id']),
        'status' => $status !== '' ? $status : $order['status'],
        'paymentStatus' => $paymentStatus !== '' ? $paymentStatus : null
    ]
]);
