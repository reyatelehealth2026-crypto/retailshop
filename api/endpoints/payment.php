<?php

require_once __DIR__ . '/../classes/LineNotifier.php';

$database = new Database();
$db = $database->getConnection();

switch ($requestMethod) {
    case 'POST':
        if ($action === 'slip') {
            uploadPaymentSlip($db);
        } else {
            sendError('Action not found', 404);
        }
        break;

    default:
        sendError('Method not allowed', 405);
}

function uploadPaymentSlip($db) {
    $customerId = requireAuthenticatedCustomerId();
    $data = getJsonInput();
    $required = ['orderNo'];
    $missing = validateRequired($data, $required);
    if (!empty($missing)) {
        sendError('Missing required fields: ' . implode(', ', $missing), 400);
    }

    $orderNo = (string) $data['orderNo'];
    $reference = (string) ($data['reference'] ?? '');
    $imageBase64 = (string) ($data['imageBase64'] ?? '');
    $filename = (string) ($data['filename'] ?? '');

    if ($imageBase64 === '') {
        sendError('Missing required fields: imageBase64', 400);
    }

    $stmt = $db->prepare('SELECT id, customer_id, status FROM retail_orders WHERE order_no = :order_no LIMIT 1');
    $stmt->execute([':order_no' => $orderNo]);
    $order = $stmt->fetch();
    if (!$order || intval($order['customer_id']) !== intval($customerId)) {
        sendError('Order not found', 404);
    }

    $payload = $imageBase64;
    $extension = 'png';
    if (preg_match('/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/', $imageBase64, $matches)) {
        $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
        $payload = $matches[2];
    } elseif ($filename !== '') {
        $pathinfo = pathinfo($filename);
        if (!empty($pathinfo['extension'])) {
            $extension = strtolower($pathinfo['extension']);
        }
    }

    $binary = base64_decode($payload, true);
    if ($binary === false) {
        sendError('Invalid image payload', 400);
    }

    $uploadDir = __DIR__ . '/../uploads/slips';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
        sendError('Failed to prepare upload directory', 500);
    }

    $safeFilename = $orderNo . '-' . date('YmdHis') . '.' . $extension;
    $absolutePath = $uploadDir . '/' . $safeFilename;
    if (file_put_contents($absolutePath, $binary) === false) {
        sendError('Failed to save payment slip', 500);
    }

    $relativePath = '/uploads/slips/' . $safeFilename;

    $update = $db->prepare("UPDATE retail_orders SET payment_reference = :payment_reference, payment_slip_path = :payment_slip_path, payment_slip_uploaded_at = NOW(), payment_status = 'pending', status = 'pending_payment' WHERE id = :id");
    $update->execute([
        ':payment_reference' => $reference !== '' ? $reference : null,
        ':payment_slip_path' => $relativePath,
        ':id' => intval($order['id'])
    ]);

    $history = $db->prepare("INSERT INTO retail_order_status_history (order_id, status_from, status_to, note, created_by) VALUES (:order_id, :status_from, 'pending_payment', :note, 'customer')");
    $history->execute([
        ':order_id' => intval($order['id']),
        ':status_from' => $order['status'],
        ':note' => 'Payment slip uploaded'
    ]);

    $customerStmt = $db->prepare('SELECT line_user_id FROM retail_customers WHERE id = :id LIMIT 1');
    $customerStmt->execute([':id' => $customerId]);
    $customer = $customerStmt->fetch();

    $notification = $db->prepare("INSERT INTO retail_notifications (customer_id, type, title, message, action_type, action_data) VALUES (:customer_id, 'order', :title, :message, 'order', :action_data)");
    $notification->execute([
        ':customer_id' => $customerId,
        ':title' => 'อัปโหลดหลักฐานชำระเงินแล้ว',
        ':message' => 'เราได้รับหลักฐานการชำระเงินสำหรับคำสั่งซื้อ ' . $orderNo . ' แล้ว',
        ':action_data' => json_encode(['orderNo' => $orderNo], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    ]);

    $notifier = new LineNotifier();
    if (!empty($customer['line_user_id'])) {
        $notifier->pushPaymentReceived($customer['line_user_id'], $orderNo);
    }

    sendResponse([
        'success' => true,
        'data' => [
            'orderNo' => $orderNo,
            'status' => 'pending_payment',
            'paymentStatus' => 'pending',
            'paymentSlipPath' => $relativePath
        ]
    ]);
}
