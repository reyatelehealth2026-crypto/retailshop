<?php
/**
 * Orders API Endpoint
 * GET /api/orders - List user orders
 * GET /api/orders/:orderNo - Get order details
 * POST /api/orders - Create new order
 */

require_once __DIR__ . '/../classes/OdooRetailClient.php';
require_once __DIR__ . '/../classes/LineNotifier.php';

$database = new Database();
$db = $database->getConnection();

function getCurrentUserId($db) {
    return requireAuthenticatedCustomerId();
}

switch ($requestMethod) {
    case 'GET':
        if ($action) {
            getOrderByOrderNo($db, $action);
        } else {
            getOrders($db);
        }
        break;
        
    case 'POST':
        createOrder($db);
        break;
        
    default:
        sendError('Method not allowed', 405);
}

function getOrders($db) {
    try {
        $customerId = getCurrentUserId($db);
        
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(50, max(1, intval($_GET['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;
        
        $status = $_GET['status'] ?? null;
        
        // Build query
        $whereConditions = ['customer_id = :customer_id'];
        $params = [':customer_id' => $customerId];
        
        if ($status) {
            if ($status === 'pending') {
                $whereConditions[] = "status IN ('pending', 'pending_payment')";
            } else {
                $whereConditions[] = 'status = :status';
                $params[':status'] = $status;
            }
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        // Count total
        $countSql = "SELECT COUNT(*) as total FROM retail_orders WHERE $whereClause";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $totalCount = $countStmt->fetch()['total'];
        
        // Get orders
        $sql = "SELECT 
            id, order_no, status, payment_status,
            subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
            shipping_method, tracking_no, shipping_provider,
            delivery_name, delivery_phone, delivery_address,
            payment_method, paid_at,
            created_at, updated_at
        FROM retail_orders 
        WHERE $whereClause 
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $orders = $stmt->fetchAll();
        
        // Get items for each order
        $formattedOrders = [];
        foreach ($orders as $order) {
            $itemsSql = "SELECT 
                sku, product_name, product_image, unit_price, quantity, total_amount
            FROM retail_order_items 
            WHERE order_id = :order_id";
            
            $itemsStmt = $db->prepare($itemsSql);
            $itemsStmt->execute([':order_id' => $order['id']]);
            $items = $itemsStmt->fetchAll();
            
            $formattedOrders[] = [
                'id' => intval($order['id']),
                'orderNo' => $order['order_no'],
                'status' => $order['status'],
                'paymentStatus' => $order['payment_status'],
                'subtotal' => floatval($order['subtotal']),
                'discountAmount' => floatval($order['discount_amount']),
                'shippingFee' => floatval($order['shipping_fee']),
                'taxAmount' => floatval($order['tax_amount']),
                'totalAmount' => floatval($order['total_amount']),
                'shippingMethod' => $order['shipping_method'],
                'trackingNo' => $order['tracking_no'],
                'shippingProvider' => $order['shipping_provider'],
                'deliveryName' => $order['delivery_name'],
                'deliveryPhone' => $order['delivery_phone'],
                'deliveryAddress' => $order['delivery_address'],
                'paymentMethod' => $order['payment_method'],
                'paidAt' => $order['paid_at'],
                'items' => array_map(function($item) {
                    return [
                        'sku' => $item['sku'],
                        'productName' => $item['product_name'],
                        'productImage' => $item['product_image'],
                        'unitPrice' => floatval($item['unit_price']),
                        'quantity' => intval($item['quantity']),
                        'totalAmount' => floatval($item['total_amount'])
                    ];
                }, $items),
                'itemCount' => count($items),
                'createdAt' => $order['created_at'],
                'updatedAt' => $order['updated_at']
            ];
        }
        
        sendResponse([
            'success' => true,
            'data' => [
                'orders' => $formattedOrders,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => intval($totalCount),
                    'totalPages' => ceil($totalCount / $limit),
                    'hasNext' => ($page * $limit) < $totalCount,
                    'hasPrev' => $page > 1
                ]
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get orders error: " . $e->getMessage());
        sendError('Failed to fetch orders', 500);
    }
}

function getOrderByOrderNo($db, $orderNo) {
    try {
        $customerId = getCurrentUserId($db);
        
        $sql = "SELECT 
            id, order_no, status, payment_status,
            subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
            coupon_code, discount_type, discount_value,
            shipping_method, tracking_no, shipping_provider,
            delivery_name, delivery_phone, delivery_address, delivery_province, delivery_postal_code, delivery_note,
            payment_method, payment_reference, payment_slip_path, payment_slip_uploaded_at, paid_at,
            odoo_order_id, odoo_order_ref, odoo_sync_status, odoo_sync_error,
            customer_note, admin_note,
            created_at, updated_at, confirmed_at, shipped_at, delivered_at, cancelled_at
        FROM retail_orders 
        WHERE order_no = :order_no AND customer_id = :customer_id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':order_no' => $orderNo, ':customer_id' => $customerId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            sendError('Order not found', 404);
        }
        
        // Get order items
        $itemsSql = "SELECT 
            sku, product_name, product_image, unit_price, original_price, quantity, subtotal, discount_amount, total_amount
        FROM retail_order_items 
        WHERE order_id = :order_id";
        
        $itemsStmt = $db->prepare($itemsSql);
        $itemsStmt->execute([':order_id' => $order['id']]);
        $items = $itemsStmt->fetchAll();
        
        // Get status history
        $historySql = "SELECT 
            status_from, status_to, note, created_by, created_at
        FROM retail_order_status_history 
        WHERE order_id = :order_id
        ORDER BY created_at ASC";
        
        $historyStmt = $db->prepare($historySql);
        $historyStmt->execute([':order_id' => $order['id']]);
        $history = $historyStmt->fetchAll();
        
        sendResponse([
            'success' => true,
            'data' => [
                'id' => intval($order['id']),
                'orderNo' => $order['order_no'],
                'status' => $order['status'],
                'paymentStatus' => $order['payment_status'],
                'subtotal' => floatval($order['subtotal']),
                'discountAmount' => floatval($order['discount_amount']),
                'shippingFee' => floatval($order['shipping_fee']),
                'taxAmount' => floatval($order['tax_amount']),
                'totalAmount' => floatval($order['total_amount']),
                'couponCode' => $order['coupon_code'],
                'discountType' => $order['discount_type'],
                'discountValue' => floatval($order['discount_value'] ?? 0),
                'shippingMethod' => $order['shipping_method'],
                'trackingNo' => $order['tracking_no'],
                'shippingProvider' => $order['shipping_provider'],
                'delivery' => [
                    'name' => $order['delivery_name'],
                    'phone' => $order['delivery_phone'],
                    'address' => $order['delivery_address'],
                    'province' => $order['delivery_province'],
                    'postalCode' => $order['delivery_postal_code'],
                    'note' => $order['delivery_note']
                ],
                'paymentMethod' => $order['payment_method'],
                'paymentReference' => $order['payment_reference'],
                'paymentSlipPath' => $order['payment_slip_path'],
                'paymentSlipUploadedAt' => $order['payment_slip_uploaded_at'],
                'paidAt' => $order['paid_at'],
                'customerNote' => $order['customer_note'],
                'adminNote' => $order['admin_note'],
                'odooOrderId' => !empty($order['odoo_order_id']) ? intval($order['odoo_order_id']) : null,
                'odooOrderRef' => $order['odoo_order_ref'],
                'odooSyncStatus' => $order['odoo_sync_status'],
                'odooSyncError' => $order['odoo_sync_error'],
                'items' => array_map(function($item) {
                    return [
                        'sku' => $item['sku'],
                        'productName' => $item['product_name'],
                        'productImage' => $item['product_image'],
                        'unitPrice' => floatval($item['unit_price']),
                        'originalPrice' => floatval($item['original_price'] ?? 0),
                        'quantity' => intval($item['quantity']),
                        'subtotal' => floatval($item['subtotal']),
                        'discountAmount' => floatval($item['discount_amount']),
                        'totalAmount' => floatval($item['total_amount'])
                    ];
                }, $items),
                'statusHistory' => array_map(function($h) {
                    return [
                        'statusFrom' => $h['status_from'],
                        'statusTo' => $h['status_to'],
                        'note' => $h['note'],
                        'createdBy' => $h['created_by'],
                        'createdAt' => $h['created_at']
                    ];
                }, $history),
                'timestamps' => [
                    'created' => $order['created_at'],
                    'updated' => $order['updated_at'],
                    'confirmed' => $order['confirmed_at'],
                    'shipped' => $order['shipped_at'],
                    'delivered' => $order['delivered_at'],
                    'cancelled' => $order['cancelled_at']
                ]
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get order error: " . $e->getMessage());
        sendError('Failed to fetch order', 500);
    }
}

function createOrder($db) {
    try {
        $customerId = getCurrentUserId($db);
        $data = getJsonInput();
        
        // Validate required fields
        $required = ['items', 'delivery', 'paymentMethod'];
        $missing = validateRequired($data, $required);
        
        if (!empty($missing)) {
            sendError('Missing required fields: ' . implode(', ', $missing), 400);
        }
        
        $items = $data['items'];
        $delivery = $data['delivery'];
        $paymentMethod = $data['paymentMethod'];
        $couponCode = $data['couponCode'] ?? null;
        $customerNote = $data['note'] ?? null;
        $coupon = null;
        
        if (empty($items)) {
            sendError('Order must have at least one item', 400);
        }
        
        // Validate delivery info
        $deliveryRequired = ['name', 'phone', 'address', 'province', 'postalCode'];
        $deliveryMissing = [];
        foreach ($deliveryRequired as $field) {
            if (empty($delivery[$field])) {
                $deliveryMissing[] = $field;
            }
        }
        
        if (!empty($deliveryMissing)) {
            sendError('Missing delivery fields: ' . implode(', ', $deliveryMissing), 400);
        }
        
        // Start transaction
        $db->beginTransaction();
        
        // Generate order number
        $orderNo = generateOrderNo($db);
        
        // Calculate totals
        $subtotal = 0;
        $orderItems = [];
        
        foreach ($items as $item) {
            $productSql = "SELECT id, odoo_product_id, name, image_url, retail_price, original_price, stock_qty, stock_status 
                FROM retail_products WHERE sku = :sku AND is_retail_active = 1";
            $productStmt = $db->prepare($productSql);
            $productStmt->execute([':sku' => $item['sku']]);
            $product = $productStmt->fetch();
            
            if (!$product) {
                $db->rollBack();
                sendError('Product not found: ' . $item['sku'], 404);
            }
            
            if ($product['stock_qty'] < $item['quantity']) {
                $db->rollBack();
                sendError('Insufficient stock for: ' . $product['name'], 400);
            }
            
            $itemSubtotal = floatval($product['retail_price']) * intval($item['quantity']);
            $subtotal += $itemSubtotal;
            
            $orderItems[] = [
                'product_id' => $product['id'],
                'odoo_product_id' => $product['odoo_product_id'],
                'sku' => $item['sku'],
                'name' => $product['name'],
                'image' => $product['image_url'],
                'unit_price' => $product['retail_price'],
                'original_price' => $product['original_price'],
                'quantity' => $item['quantity'],
                'subtotal' => $itemSubtotal,
                'total' => $itemSubtotal
            ];
        }
        
        // Calculate discount
        $discountAmount = 0;
        if ($couponCode) {
            $couponSql = "SELECT * FROM retail_promotions 
                WHERE code = :code AND is_active = 1 
                AND (start_date IS NULL OR start_date <= NOW())
                AND (end_date IS NULL OR end_date >= NOW())
                AND (usage_limit IS NULL OR usage_count < usage_limit)";
            $couponStmt = $db->prepare($couponSql);
            $couponStmt->execute([':code' => $couponCode]);
            $coupon = $couponStmt->fetch();
            
            if ($coupon && $subtotal >= floatval($coupon['min_purchase_amount'])) {
                if ($coupon['type'] === 'percentage') {
                    $discountAmount = $subtotal * (floatval($coupon['discount_value']) / 100);
                    if ($coupon['max_discount_amount']) {
                        $discountAmount = min($discountAmount, floatval($coupon['max_discount_amount']));
                    }
                } elseif ($coupon['type'] === 'fixed_amount') {
                    $discountAmount = floatval($coupon['discount_value']);
                }
                
                // Update coupon usage
                $updateCouponSql = "UPDATE retail_promotions SET usage_count = usage_count + 1 WHERE id = :id";
                $updateCouponStmt = $db->prepare($updateCouponSql);
                $updateCouponStmt->execute([':id' => $coupon['id']]);
            }
        }
        
        // Calculate shipping
        $shippingFee = $subtotal >= 499 ? 0 : 50;
        
        // Calculate total
        $totalAmount = $subtotal - $discountAmount + $shippingFee;
        
        // Create order
        $orderSql = "INSERT INTO retail_orders (
            order_no, customer_id, status, payment_status,
            subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
            coupon_code, discount_type, discount_value,
            shipping_method,
            delivery_name, delivery_phone, delivery_address, delivery_province, delivery_postal_code, delivery_note,
            payment_method, customer_note
        ) VALUES (
            :order_no, :customer_id, 'pending', 'pending',
            :subtotal, :discount_amount, :shipping_fee, 0, :total_amount,
            :coupon_code, :discount_type, :discount_value,
            'standard',
            :delivery_name, :delivery_phone, :delivery_address, :delivery_province, :delivery_postal_code, :delivery_note,
            :payment_method, :customer_note
        )";
        
        $orderStmt = $db->prepare($orderSql);
        $orderStmt->execute([
            ':order_no' => $orderNo,
            ':customer_id' => $customerId,
            ':subtotal' => $subtotal,
            ':discount_amount' => $discountAmount,
            ':shipping_fee' => $shippingFee,
            ':total_amount' => $totalAmount,
            ':coupon_code' => $couponCode,
            ':discount_type' => $coupon['type'] ?? null,
            ':discount_value' => $coupon['discount_value'] ?? 0,
            ':delivery_name' => $delivery['name'],
            ':delivery_phone' => $delivery['phone'],
            ':delivery_address' => $delivery['address'],
            ':delivery_province' => $delivery['province'],
            ':delivery_postal_code' => $delivery['postalCode'],
            ':delivery_note' => $delivery['note'] ?? null,
            ':payment_method' => $paymentMethod,
            ':customer_note' => $customerNote
        ]);
        
        $orderId = $db->lastInsertId();
        
        // Insert order items
        $itemSql = "INSERT INTO retail_order_items (
            order_id, product_id, sku, product_name, product_image,
            unit_price, original_price, quantity, subtotal, discount_amount, total_amount
        ) VALUES (
            :order_id, :product_id, :sku, :product_name, :product_image,
            :unit_price, :original_price, :quantity, :subtotal, 0, :total_amount
        )";
        
        $itemStmt = $db->prepare($itemSql);
        
        foreach ($orderItems as $item) {
            $itemStmt->execute([
                ':order_id' => $orderId,
                ':product_id' => $item['product_id'],
                ':sku' => $item['sku'],
                ':product_name' => $item['name'],
                ':product_image' => $item['image'],
                ':unit_price' => $item['unit_price'],
                ':original_price' => $item['original_price'],
                ':quantity' => $item['quantity'],
                ':subtotal' => $item['subtotal'],
                ':total_amount' => $item['total']
            ]);
            
            // Update stock
            $updateStockSql = "UPDATE retail_products 
                SET stock_qty = stock_qty - :quantity,
                    stock_status = CASE WHEN stock_qty - :quantity2 <= 0 THEN 'out_of_stock' 
                                       WHEN stock_qty - :quantity3 <= low_stock_threshold THEN 'low_stock'
                                       ELSE 'in_stock' END
                WHERE id = :product_id";
            $updateStockStmt = $db->prepare($updateStockSql);
            $updateStockStmt->execute([
                ':quantity' => $item['quantity'],
                ':quantity2' => $item['quantity'],
                ':quantity3' => $item['quantity'],
                ':product_id' => $item['product_id']
            ]);
        }
        
        // Add status history
        $historySql = "INSERT INTO retail_order_status_history (order_id, status_to, note, created_by) 
            VALUES (:order_id, 'pending', 'Order created', 'system')";
        $historyStmt = $db->prepare($historySql);
        $historyStmt->execute([':order_id' => $orderId]);
        
        // Clear cart
        $clearCartSql = "DELETE FROM retail_cart WHERE customer_id = :customer_id";
        $clearCartStmt = $db->prepare($clearCartSql);
        $clearCartStmt->execute([':customer_id' => $customerId]);
        
        $db->commit();
        $odooSync = syncOrderToOdoo($db, intval($orderId), intval($customerId), $orderNo, $orderItems, [
            'discount_amount' => $discountAmount,
            'delivery_fee' => $shippingFee,
            'payment_method' => $paymentMethod,
            'delivery' => $delivery
        ]);
        createOrderNotification($db, intval($customerId), $orderNo, $totalAmount);
        
        sendResponse([
            'success' => true,
            'data' => [
                'orderNo' => $orderNo,
                'status' => 'pending',
                'paymentStatus' => 'pending',
                'totalAmount' => $totalAmount,
                'odooSyncStatus' => $odooSync['status'] ?? 'pending',
                'odooSyncError' => $odooSync['error'] ?? null,
                'message' => 'Order created successfully'
            ]
        ], 201);
        
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Create order error: " . $e->getMessage());
        sendError('Failed to create order', 500);
    }
}

function generateOrderNo($db) {
    $prefix = 'RYR';
    $date = date('Ymd');
    
    // Get last order number for today
    $sql = "SELECT order_no FROM retail_orders WHERE order_no LIKE :pattern ORDER BY id DESC LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->execute([':pattern' => $prefix . $date . '%']);
    $lastOrder = $stmt->fetch();
    
    if ($lastOrder) {
        $lastSeq = intval(substr($lastOrder['order_no'], -4));
        $seq = str_pad($lastSeq + 1, 4, '0', STR_PAD_LEFT);
    } else {
        $seq = '0001';
    }
    
    return $prefix . $date . $seq;
}

function syncOrderToOdoo($db, $orderId, $customerId, $orderNo, $orderItems, $options = []) {
    $customerStmt = $db->prepare("SELECT line_user_id, line_display_name, phone, email, odoo_partner_id, odoo_partner_code FROM retail_customers WHERE id = :id LIMIT 1");
    $customerStmt->execute([':id' => $customerId]);
    $customer = $customerStmt->fetch();

    $partnerId = intval($customer['odoo_partner_id'] ?? 0);
    $partnerCode = (string) ($customer['odoo_partner_code'] ?? '');

    if ($partnerId <= 0) {
        $partnerId = intval(getEnvValue('ODOO_DEFAULT_PARTNER_ID', 0));
    }
    if ($partnerCode === '') {
        $partnerCode = (string) getEnvValue('ODOO_DEFAULT_PARTNER_CODE', '');
    }

    if ($partnerId <= 0 || $partnerCode === '') {
        $error = 'Missing Odoo partner mapping';
        $stmt = $db->prepare("UPDATE retail_orders SET odoo_sync_status = 'error', odoo_sync_error = :error WHERE id = :id");
        $stmt->execute([':error' => $error, ':id' => $orderId]);
        return ['status' => 'error', 'error' => $error];
    }

    $client = new OdooRetailClient();
    if (!$client->isConfigured()) {
        $error = 'Odoo API is not configured';
        $stmt = $db->prepare("UPDATE retail_orders SET odoo_sync_status = 'error', odoo_sync_error = :error WHERE id = :id");
        $stmt->execute([':error' => $error, ':id' => $orderId]);
        return ['status' => 'error', 'error' => $error];
    }

    $payloadItems = array_map(function($item) {
        return [
            'product_id' => intval($item['odoo_product_id'] ?? 0),
            'qty' => floatval($item['quantity'] ?? 0),
            'price_unit' => floatval($item['unit_price'] ?? 0),
            'discount' => 0
        ];
    }, array_filter($orderItems, function($item) {
        return !empty($item['odoo_product_id']);
    }));

    $result = $client->createSimpleSaleOrder($orderNo, $partnerId, $partnerCode, $payloadItems, [
        'discount_amount' => floatval($options['discount_amount'] ?? 0),
        'delivery_fee' => floatval($options['delivery_fee'] ?? 0),
        'payment_data' => strtoupper((string) ($options['payment_method'] ?? 'COD'))
    ]);

    if (!($result['success'] ?? false)) {
        $error = (string) ($result['error'] ?? 'Odoo sync failed');
        $stmt = $db->prepare("UPDATE retail_orders SET odoo_sync_status = 'error', odoo_sync_error = :error WHERE id = :id");
        $stmt->execute([':error' => $error, ':id' => $orderId]);
        return ['status' => 'error', 'error' => $error];
    }

    $data = $result['data'] ?? [];
    $odooOrderId = intval($data['order_id'] ?? $data['sale_order_id'] ?? $data['id'] ?? 0);
    $odooOrderRef = (string) ($data['order_ref'] ?? $data['name'] ?? $orderNo);
    $stmt = $db->prepare("UPDATE retail_orders SET odoo_order_id = :odoo_order_id, odoo_order_ref = :odoo_order_ref, odoo_sync_status = 'synced', odoo_sync_error = NULL WHERE id = :id");
    $stmt->execute([
        ':odoo_order_id' => $odooOrderId > 0 ? $odooOrderId : null,
        ':odoo_order_ref' => $odooOrderRef,
        ':id' => $orderId
    ]);
    return ['status' => 'synced', 'orderId' => $odooOrderId, 'orderRef' => $odooOrderRef];
}

function createOrderNotification($db, $customerId, $orderNo, $totalAmount) {
    $customerStmt = $db->prepare("SELECT line_user_id FROM retail_customers WHERE id = :id LIMIT 1");
    $customerStmt->execute([':id' => $customerId]);
    $customer = $customerStmt->fetch();

    $stmt = $db->prepare("INSERT INTO retail_notifications (customer_id, type, title, message, action_type, action_data) VALUES (:customer_id, 'order', :title, :message, 'order', :action_data)");
    $stmt->execute([
        ':customer_id' => $customerId,
        ':title' => 'ยืนยันคำสั่งซื้อ',
        ':message' => 'คำสั่งซื้อ ' . $orderNo . ' ถูกสร้างเรียบร้อยแล้ว',
        ':action_data' => json_encode(['orderNo' => $orderNo], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    ]);

    $notifier = new LineNotifier();
    if (!empty($customer['line_user_id'])) {
        $notifier->pushOrderConfirmation($customer['line_user_id'], $orderNo, $totalAmount);
    }
}
