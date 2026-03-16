<?php
/**
 * Orders API Endpoint
 * 
 * GET /api/orders - ดึงรายการคำสั่งซื้อของผู้ใช้
 * POST /api/orders - สร้างคำสั่งซื้อใหม่
 * GET /api/orders?order_no={order_no} - ดึงรายละเอียดคำสั่งซื้อ
 * 
 * Headers Required:
 *   - Authorization: Bearer {line_user_id}
 */

require_once '../config/database.php';

// Get user ID from header
function getUserId() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        return $matches[1];
    }
    
    if (isset($_GET['user_id'])) {
        return $_GET['user_id'];
    }
    
    return null;
}

// Get or create user by LINE ID
function getOrCreateUser($db, $lineUserId) {
    $stmt = $db->prepare("SELECT id FROM retail_users WHERE line_user_id = :line_user_id");
    $stmt->bindValue(':line_user_id', $lineUserId);
    $stmt->execute();
    
    $user = $stmt->fetch();
    if ($user) {
        return $user['id'];
    }
    
    // Create new user
    $insertStmt = $db->prepare("INSERT INTO retail_users (line_user_id, member_code, created_at) 
                                 VALUES (:line_user_id, :member_code, NOW())");
    $memberCode = 'MEM' . date('Ymd') . strtoupper(substr(uniqid(), -6));
    $insertStmt->bindValue(':line_user_id', $lineUserId);
    $insertStmt->bindValue(':member_code', $memberCode);
    $insertStmt->execute();
    
    return $db->lastInsertId();
}

// Get user details
function getUserDetails($db, $userId) {
    $stmt = $db->prepare("SELECT * FROM retail_users WHERE id = :id");
    $stmt->bindValue(':id', $userId);
    $stmt->execute();
    return $stmt->fetch();
}

// Get cart items
function getCartItems($db, $userId) {
    $query = "SELECT 
                c.id as cart_id,
                c.quantity,
                c.unit_price,
                p.id as product_id,
                p.sku,
                p.name,
                p.retail_price,
                p.original_price,
                p.stock_qty,
                p.stock_status,
                p.image_url
              FROM retail_cart c
              JOIN retail_products p ON c.product_id = p.id
              WHERE c.user_id = :user_id AND p.deleted_at IS NULL AND p.is_retail_active = 1";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $userId);
    $stmt->execute();
    
    $items = [];
    $totalAmount = 0;
    
    while ($row = $stmt->fetch()) {
        $subtotal = $row['unit_price'] * $row['quantity'];
        $items[] = [
            'cartId' => $row['cart_id'],
            'productId' => $row['product_id'],
            'sku' => $row['sku'],
            'name' => $row['name'],
            'unitPrice' => floatval($row['unit_price']),
            'quantity' => floatval($row['quantity']),
            'stockQty' => floatval($row['stock_qty']),
            'imageUrl' => $row['image_url'],
            'subtotal' => $subtotal
        ];
        $totalAmount += $subtotal;
    }
    
    return [
        'items' => $items,
        'totalAmount' => $totalAmount,
        'totalItems' => count($items)
    ];
}

// Get order details
function getOrderDetails($db, $orderId) {
    // Get order
    $orderQuery = "SELECT * FROM retail_orders WHERE id = :id";
    $orderStmt = $db->prepare($orderQuery);
    $orderStmt->bindValue(':id', $orderId);
    $orderStmt->execute();
    
    $order = $orderStmt->fetch();
    if (!$order) {
        return null;
    }
    
    // Get order items
    $itemsQuery = "SELECT * FROM retail_order_items WHERE order_id = :order_id";
    $itemsStmt = $db->prepare($itemsQuery);
    $itemsStmt->bindValue(':order_id', $orderId);
    $itemsStmt->execute();
    
    $items = [];
    while ($row = $itemsStmt->fetch()) {
        $items[] = [
            'id' => $row['id'],
            'productId' => $row['product_id'],
            'sku' => $row['sku'],
            'productName' => $row['product_name'],
            'productImage' => $row['product_image'],
            'unitPrice' => floatval($row['unit_price']),
            'quantity' => floatval($row['quantity']),
            'totalPrice' => floatval($row['total_price']),
            'discountAmount' => floatval($row['discount_amount'])
        ];
    }
    
    // Get status history
    $historyQuery = "SELECT * FROM retail_order_status_history 
                      WHERE order_id = :order_id ORDER BY created_at ASC";
    $historyStmt = $db->prepare($historyQuery);
    $historyStmt->bindValue(':order_id', $orderId);
    $historyStmt->execute();
    
    $statusHistory = [];
    while ($row = $historyStmt->fetch()) {
        $statusHistory[] = [
            'id' => $row['id'],
            'statusFrom' => $row['status_from'],
            'statusTo' => $row['status_to'],
            'notes' => $row['notes'],
            'createdAt' => $row['created_at']
        ];
    }
    
    return [
        'id' => $order['id'],
        'orderNumber' => $order['order_number'],
        'status' => $order['status'],
        'paymentStatus' => $order['payment_status'],
        'paymentMethod' => $order['payment_method'],
        'subtotal' => floatval($order['subtotal']),
        'discountAmount' => floatval($order['discount_amount']),
        'discountCode' => $order['discount_code'],
        'shippingFee' => floatval($order['shipping_fee']),
        'taxAmount' => floatval($order['tax_amount']),
        'totalAmount' => floatval($order['total_amount']),
        'shippingName' => $order['shipping_name'],
        'shippingPhone' => $order['shipping_phone'],
        'shippingAddress' => $order['shipping_address'],
        'shippingProvince' => $order['shipping_province'],
        'shippingDistrict' => $order['shipping_district'],
        'shippingSubdistrict' => $order['shipping_subdistrict'],
        'shippingPostalCode' => $order['shipping_postal_code'],
        'shippingMethod' => $order['shipping_method'],
        'trackingNumber' => $order['tracking_number'],
        'shippedAt' => $order['shipped_at'],
        'deliveredAt' => $order['delivered_at'],
        'customerNotes' => $order['customer_notes'],
        'adminNotes' => $order['admin_notes'],
        'createdAt' => $order['created_at'],
        'updatedAt' => $order['updated_at'],
        'cancelledAt' => $order['cancelled_at'],
        'cancelledReason' => $order['cancelled_reason'],
        'items' => $items,
        'statusHistory' => $statusHistory
    ];
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            $userId = getUserId();
            if (!$userId) {
                sendError('User ID required', 401);
            }
            
            $dbUserId = getOrCreateUser($db, $userId);
            
            // Check if getting specific order
            if (isset($_GET['order_no'])) {
                $orderNo = $_GET['order_no'];
                
                $orderQuery = "SELECT id FROM retail_orders 
                                WHERE order_number = :order_number AND user_id = :user_id";
                $orderStmt = $db->prepare($orderQuery);
                $orderStmt->bindValue(':order_number', $orderNo);
                $orderStmt->bindValue(':user_id', $dbUserId);
                $orderStmt->execute();
                
                $order = $orderStmt->fetch();
                if (!$order) {
                    sendError('Order not found', 404);
                }
                
                $orderDetails = getOrderDetails($db, $order['id']);
                
                sendResponse([
                    'success' => true,
                    'data' => $orderDetails
                ]);
            } else {
                // Get list of orders
                $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
                $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 10;
                $offset = ($page - 1) * $limit;
                
                $status = isset($_GET['status']) ? $_GET['status'] : null;
                
                $whereConditions = ['user_id = :user_id'];
                $params = [':user_id' => $dbUserId];
                
                if ($status) {
                    $whereConditions[] = 'status = :status';
                    $params[':status'] = $status;
                }
                
                $whereClause = implode(' AND ', $whereConditions);
                
                // Count total
                $countQuery = "SELECT COUNT(*) as total FROM retail_orders WHERE $whereClause";
                $countStmt = $db->prepare($countQuery);
                foreach ($params as $key => $value) {
                    $countStmt->bindValue($key, $value);
                }
                $countStmt->execute();
                $totalCount = $countStmt->fetch()['total'];
                
                // Get orders
                $query = "SELECT 
                            id, order_number, status, payment_status, payment_method,
                            total_amount, shipping_name, created_at, updated_at
                          FROM retail_orders
                          WHERE $whereClause
                          ORDER BY created_at DESC
                          LIMIT :limit OFFSET :offset";
                
                $stmt = $db->prepare($query);
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
                $stmt->execute();
                
                $orders = [];
                while ($row = $stmt->fetch()) {
                    // Get item count
                    $itemStmt = $db->prepare("SELECT COUNT(*) as count FROM retail_order_items WHERE order_id = :order_id");
                    $itemStmt->bindValue(':order_id', $row['id']);
                    $itemStmt->execute();
                    $itemCount = $itemStmt->fetch()['count'];
                    
                    // Get first item image
                    $imgStmt = $db->prepare("SELECT product_image FROM retail_order_items 
                                              WHERE order_id = :order_id LIMIT 1");
                    $imgStmt->bindValue(':order_id', $row['id']);
                    $imgStmt->execute();
                    $firstImage = $imgStmt->fetch()['product_image'] ?? null;
                    
                    $orders[] = [
                        'id' => $row['id'],
                        'orderNumber' => $row['order_number'],
                        'status' => $row['status'],
                        'paymentStatus' => $row['payment_status'],
                        'paymentMethod' => $row['payment_method'],
                        'totalAmount' => floatval($row['total_amount']),
                        'shippingName' => $row['shipping_name'],
                        'itemCount' => $itemCount,
                        'firstImage' => $firstImage,
                        'createdAt' => $row['created_at'],
                        'updatedAt' => $row['updated_at']
                    ];
                }
                
                $totalPages = ceil($totalCount / $limit);
                
                sendResponse([
                    'success' => true,
                    'data' => $orders,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'totalCount' => intval($totalCount),
                        'totalPages' => $totalPages,
                        'hasNext' => $page < $totalPages,
                        'hasPrev' => $page > 1
                    ]
                ]);
            }
            break;
            
        case 'POST':
            // Create new order
            $data = getJsonInput();
            
            $userId = getUserId();
            if (!$userId) {
                sendError('User ID required', 401);
            }
            
            $dbUserId = getOrCreateUser($db, $userId);
            
            // Validate required fields
            validateRequired($data, ['shippingName', 'shippingPhone', 'shippingAddress']);
            
            // Get cart items
            $cart = getCartItems($db, $dbUserId);
            
            if (empty($cart['items'])) {
                sendError('Cart is empty', 400);
            }
            
            // Validate stock for all items
            foreach ($cart['items'] as $item) {
                $stockStmt = $db->prepare("SELECT stock_qty, stock_status FROM retail_products WHERE id = :id");
                $stockStmt->bindValue(':id', $item['productId']);
                $stockStmt->execute();
                $product = $stockStmt->fetch();
                
                if (!$product || $product['stock_status'] === 'out_of_stock') {
                    sendError('Product ' . $item['sku'] . ' is out of stock', 400);
                }
                
                if ($product['stock_qty'] < $item['quantity']) {
                    sendError('Insufficient stock for ' . $item['sku'] . '. Available: ' . $product['stock_qty'], 400);
                }
            }
            
            // Calculate totals
            $subtotal = $cart['totalAmount'];
            $discountAmount = 0;
            $discountCode = isset($data['discountCode']) ? $data['discountCode'] : null;
            
            // Apply discount if code provided
            if ($discountCode) {
                $promoStmt = $db->prepare("SELECT * FROM retail_promotions 
                                            WHERE code = :code AND is_active = 1
                                            AND start_date <= NOW() AND end_date >= NOW()");
                $promoStmt->bindValue(':code', $discountCode);
                $promoStmt->execute();
                $promotion = $promoStmt->fetch();
                
                if ($promotion && $subtotal >= $promotion['min_purchase']) {
                    if ($promotion['discount_type'] === 'percentage') {
                        $discountAmount = $subtotal * ($promotion['discount_value'] / 100);
                        if ($promotion['max_discount'] && $discountAmount > $promotion['max_discount']) {
                            $discountAmount = $promotion['max_discount'];
                        }
                    } elseif ($promotion['discount_type'] === 'fixed_amount') {
                        $discountAmount = min($promotion['discount_value'], $subtotal);
                    }
                }
            }
            
            // Calculate shipping
            $shippingFee = 50; // Default shipping
            $freeShippingThreshold = 499;
            
            $settingsStmt = $db->prepare("SELECT setting_value FROM retail_settings WHERE setting_key = 'free_shipping_threshold'");
            $settingsStmt->execute();
            $setting = $settingsStmt->fetch();
            if ($setting) {
                $freeShippingThreshold = floatval($setting['setting_value']);
            }
            
            if (($subtotal - $discountAmount) >= $freeShippingThreshold) {
                $shippingFee = 0;
            }
            
            // Calculate tax (7%)
            $taxRate = 0.07;
            $taxAmount = ($subtotal - $discountAmount) * $taxRate;
            
            $totalAmount = $subtotal - $discountAmount + $shippingFee + $taxAmount;
            
            // Generate order number
            $orderNumber = generateOrderNumber();
            
            // Create order
            $orderQuery = "INSERT INTO retail_orders 
                            (order_number, user_id, subtotal, discount_amount, discount_code,
                             shipping_fee, tax_amount, total_amount, status, payment_status,
                             shipping_name, shipping_phone, shipping_address, shipping_province,
                             shipping_district, shipping_subdistrict, shipping_postal_code,
                             shipping_method, customer_notes, created_at, updated_at)
                           VALUES 
                            (:order_number, :user_id, :subtotal, :discount_amount, :discount_code,
                             :shipping_fee, :tax_amount, :total_amount, 'pending', 'pending',
                             :shipping_name, :shipping_phone, :shipping_address, :shipping_province,
                             :shipping_district, :shipping_subdistrict, :shipping_postal_code,
                             :shipping_method, :customer_notes, NOW(), NOW())";
            
            $orderStmt = $db->prepare($orderQuery);
            $orderStmt->bindValue(':order_number', $orderNumber);
            $orderStmt->bindValue(':user_id', $dbUserId);
            $orderStmt->bindValue(':subtotal', $subtotal);
            $orderStmt->bindValue(':discount_amount', $discountAmount);
            $orderStmt->bindValue(':discount_code', $discountCode);
            $orderStmt->bindValue(':shipping_fee', $shippingFee);
            $orderStmt->bindValue(':tax_amount', $taxAmount);
            $orderStmt->bindValue(':total_amount', $totalAmount);
            $orderStmt->bindValue(':shipping_name', $data['shippingName']);
            $orderStmt->bindValue(':shipping_phone', $data['shippingPhone']);
            $orderStmt->bindValue(':shipping_address', $data['shippingAddress']);
            $orderStmt->bindValue(':shipping_province', isset($data['shippingProvince']) ? $data['shippingProvince'] : null);
            $orderStmt->bindValue(':shipping_district', isset($data['shippingDistrict']) ? $data['shippingDistrict'] : null);
            $orderStmt->bindValue(':shipping_subdistrict', isset($data['shippingSubdistrict']) ? $data['shippingSubdistrict'] : null);
            $orderStmt->bindValue(':shipping_postal_code', isset($data['shippingPostalCode']) ? $data['shippingPostalCode'] : null);
            $orderStmt->bindValue(':shipping_method', isset($data['shippingMethod']) ? $data['shippingMethod'] : 'standard');
            $orderStmt->bindValue(':customer_notes', isset($data['customerNotes']) ? $data['customerNotes'] : null);
            $orderStmt->execute();
            
            $orderId = $db->lastInsertId();
            
            // Create order items
            foreach ($cart['items'] as $item) {
                $itemQuery = "INSERT INTO retail_order_items
                                (order_id, product_id, sku, product_name, product_image,
                                 unit_price, quantity, total_price, discount_amount, created_at)
                              VALUES
                                (:order_id, :product_id, :sku, :product_name, :product_image,
                                 :unit_price, :quantity, :total_price, 0, NOW())";
                
                $itemStmt = $db->prepare($itemQuery);
                $itemStmt->bindValue(':order_id', $orderId);
                $itemStmt->bindValue(':product_id', $item['productId']);
                $itemStmt->bindValue(':sku', $item['sku']);
                $itemStmt->bindValue(':product_name', $item['name']);
                $itemStmt->bindValue(':product_image', $item['imageUrl']);
                $itemStmt->bindValue(':unit_price', $item['unitPrice']);
                $itemStmt->bindValue(':quantity', $item['quantity']);
                $itemStmt->bindValue(':total_price', $item['subtotal']);
                $itemStmt->execute();
                
                // Update product stock
                $updateStockStmt = $db->prepare("UPDATE retail_products 
                                                  SET stock_qty = stock_qty - :quantity,
                                                      sold_count = sold_count + :quantity
                                                  WHERE id = :id");
                $updateStockStmt->bindValue(':quantity', $item['quantity']);
                $updateStockStmt->bindValue(':id', $item['productId']);
                $updateStockStmt->execute();
            }
            
            // Add status history
            $historyStmt = $db->prepare("INSERT INTO retail_order_status_history
                                          (order_id, status_to, notes, created_at)
                                         VALUES
                                          (:order_id, 'pending', 'Order created', NOW())");
            $historyStmt->bindValue(':order_id', $orderId);
            $historyStmt->execute();
            
            // Clear cart
            $clearCartStmt = $db->prepare("DELETE FROM retail_cart WHERE user_id = :user_id");
            $clearCartStmt->bindValue(':user_id', $dbUserId);
            $clearCartStmt->execute();
            
            // Get order details
            $orderDetails = getOrderDetails($db, $orderId);
            
            sendResponse([
                'success' => true,
                'message' => 'Order created successfully',
                'data' => $orderDetails
            ], 201);
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log("Orders API Error: " . $e->getMessage());
    sendError('Failed to process order', 500, $e->getMessage());
}
