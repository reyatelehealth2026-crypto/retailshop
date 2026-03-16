<?php
/**
 * Cart API Endpoint
 * 
 * GET /api/cart - ดึงข้อมูลตะกร้าสินค้า
 * POST /api/cart - เพิ่ม/อัพเดทสินค้าในตะกร้า
 * PUT /api/cart - อัพเดทจำนวนสินค้า
 * DELETE /api/cart - ลบสินค้าออกจากตะกร้า
 * 
 * Headers Required:
 *   - Authorization: Bearer {line_user_id} (หรือใช้ user_id จาก session)
 */

require_once '../config/database.php';

// Get user ID from header or query
function getUserId() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        return $matches[1];
    }
    
    // Fallback to query parameter (for development)
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

// Get cart items with product details
function getCartItems($db, $userId) {
    $query = "SELECT 
                c.id as cart_id,
                c.quantity,
                c.unit_price,
                c.notes,
                p.id as product_id,
                p.sku,
                p.name,
                p.short_description,
                p.retail_price,
                p.original_price,
                p.stock_qty,
                p.stock_status,
                p.image_url,
                p.is_medicine,
                p.requires_prescription
              FROM retail_cart c
              JOIN retail_products p ON c.product_id = p.id
              WHERE c.user_id = :user_id AND p.deleted_at IS NULL AND p.is_retail_active = 1";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':user_id', $userId);
    $stmt->execute();
    
    $items = [];
    $totalAmount = 0;
    $totalItems = 0;
    $totalQuantity = 0;
    
    while ($row = $stmt->fetch()) {
        $subtotal = $row['unit_price'] * $row['quantity'];
        
        $discount = 0;
        if ($row['original_price'] > 0 && $row['original_price'] > $row['retail_price']) {
            $discount = round((($row['original_price'] - $row['retail_price']) / $row['original_price']) * 100);
        }
        
        $items[] = [
            'cartId' => $row['cart_id'],
            'productId' => $row['product_id'],
            'sku' => $row['sku'],
            'name' => $row['name'],
            'shortDescription' => $row['short_description'],
            'retailPrice' => floatval($row['retail_price']),
            'originalPrice' => floatval($row['original_price']),
            'unitPrice' => floatval($row['unit_price']),
            'discountPercent' => $discount,
            'quantity' => floatval($row['quantity']),
            'stockQty' => floatval($row['stock_qty']),
            'stockStatus' => $row['stock_status'],
            'imageUrl' => $row['image_url'],
            'isMedicine' => (bool)$row['is_medicine'],
            'notes' => $row['notes'],
            'subtotal' => $subtotal
        ];
        
        $totalAmount += $subtotal;
        $totalItems++;
        $totalQuantity += $row['quantity'];
    }
    
    return [
        'items' => $items,
        'totalAmount' => $totalAmount,
        'totalItems' => $totalItems,
        'totalQuantity' => $totalQuantity
    ];
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Get cart
            $userId = getUserId();
            if (!$userId) {
                sendError('User ID required', 401);
            }
            
            // Get or create user
            $dbUserId = getOrCreateUser($db, $userId);
            
            $cart = getCartItems($db, $dbUserId);
            
            sendResponse([
                'success' => true,
                'data' => $cart
            ]);
            break;
            
        case 'POST':
            // Add to cart
            $data = getJsonInput();
            validateRequired($data, ['sku', 'quantity']);
            
            $userId = getUserId();
            if (!$userId) {
                sendError('User ID required', 401);
            }
            
            $dbUserId = getOrCreateUser($db, $userId);
            $sku = $data['sku'];
            $quantity = max(1, floatval($data['quantity']));
            $notes = isset($data['notes']) ? $data['notes'] : null;
            
            // Get product
            $prodStmt = $db->prepare("SELECT id, retail_price, stock_qty, stock_status, is_retail_active 
                                       FROM retail_products 
                                       WHERE sku = :sku AND deleted_at IS NULL");
            $prodStmt->bindValue(':sku', $sku);
            $prodStmt->execute();
            
            $product = $prodStmt->fetch();
            if (!$product) {
                sendError('Product not found', 404);
            }
            
            if (!$product['is_retail_active']) {
                sendError('Product is not available for retail', 400);
            }
            
            if ($product['stock_status'] === 'out_of_stock') {
                sendError('Product is out of stock', 400);
            }
            
            if ($product['stock_qty'] < $quantity) {
                sendError('Insufficient stock. Available: ' . $product['stock_qty'], 400);
            }
            
            // Check if already in cart
            $checkStmt = $db->prepare("SELECT id, quantity FROM retail_cart 
                                        WHERE user_id = :user_id AND product_id = :product_id");
            $checkStmt->bindValue(':user_id', $dbUserId);
            $checkStmt->bindValue(':product_id', $product['id']);
            $checkStmt->execute();
            
            $existingItem = $checkStmt->fetch();
            
            if ($existingItem) {
                // Update quantity
                $newQuantity = $existingItem['quantity'] + $quantity;
                
                if ($product['stock_qty'] < $newQuantity) {
                    sendError('Insufficient stock. Available: ' . $product['stock_qty'], 400);
                }
                
                $updateStmt = $db->prepare("UPDATE retail_cart 
                                             SET quantity = :quantity, notes = :notes, updated_at = NOW()
                                             WHERE id = :id");
                $updateStmt->bindValue(':quantity', $newQuantity);
                $updateStmt->bindValue(':notes', $notes);
                $updateStmt->bindValue(':id', $existingItem['id']);
                $updateStmt->execute();
            } else {
                // Add new item
                $insertStmt = $db->prepare("INSERT INTO retail_cart 
                                             (user_id, product_id, quantity, unit_price, notes, created_at, updated_at)
                                             VALUES 
                                             (:user_id, :product_id, :quantity, :unit_price, :notes, NOW(), NOW())");
                $insertStmt->bindValue(':user_id', $dbUserId);
                $insertStmt->bindValue(':product_id', $product['id']);
                $insertStmt->bindValue(':quantity', $quantity);
                $insertStmt->bindValue(':unit_price', $product['retail_price']);
                $insertStmt->bindValue(':notes', $notes);
                $insertStmt->execute();
            }
            
            // Return updated cart
            $cart = getCartItems($db, $dbUserId);
            
            sendResponse([
                'success' => true,
                'message' => 'Item added to cart',
                'data' => $cart
            ]);
            break;
            
        case 'PUT':
            // Update cart item
            $data = getJsonInput();
            validateRequired($data, ['sku', 'quantity']);
            
            $userId = getUserId();
            if (!$userId) {
                sendError('User ID required', 401);
            }
            
            $dbUserId = getOrCreateUser($db, $userId);
            $sku = $data['sku'];
            $quantity = floatval($data['quantity']);
            
            if ($quantity <= 0) {
                // Remove item if quantity is 0 or less
                $deleteStmt = $db->prepare("DELETE c FROM retail_cart c
                                             JOIN retail_products p ON c.product_id = p.id
                                             WHERE c.user_id = :user_id AND p.sku = :sku");
                $deleteStmt->bindValue(':user_id', $dbUserId);
                $deleteStmt->bindValue(':sku', $sku);
                $deleteStmt->execute();
            } else {
                // Get product to check stock
                $prodStmt = $db->prepare("SELECT p.id, p.stock_qty, p.stock_status
                                           FROM retail_products p
                                           JOIN retail_cart c ON p.id = c.product_id
                                           WHERE c.user_id = :user_id AND p.sku = :sku");
                $prodStmt->bindValue(':user_id', $dbUserId);
                $prodStmt->bindValue(':sku', $sku);
                $prodStmt->execute();
                
                $product = $prodStmt->fetch();
                if (!$product) {
                    sendError('Product not found in cart', 404);
                }
                
                if ($product['stock_qty'] < $quantity) {
                    sendError('Insufficient stock. Available: ' . $product['stock_qty'], 400);
                }
                
                // Update quantity
                $updateStmt = $db->prepare("UPDATE retail_cart c
                                             JOIN retail_products p ON c.product_id = p.id
                                             SET c.quantity = :quantity, c.updated_at = NOW()
                                             WHERE c.user_id = :user_id AND p.sku = :sku");
                $updateStmt->bindValue(':quantity', $quantity);
                $updateStmt->bindValue(':user_id', $dbUserId);
                $updateStmt->bindValue(':sku', $sku);
                $updateStmt->execute();
            }
            
            // Return updated cart
            $cart = getCartItems($db, $dbUserId);
            
            sendResponse([
                'success' => true,
                'message' => 'Cart updated',
                'data' => $cart
            ]);
            break;
            
        case 'DELETE':
            // Remove from cart
            $data = getJsonInput();
            validateRequired($data, ['sku']);
            
            $userId = getUserId();
            if (!$userId) {
                sendError('User ID required', 401);
            }
            
            $dbUserId = getOrCreateUser($db, $userId);
            $sku = $data['sku'];
            
            $deleteStmt = $db->prepare("DELETE c FROM retail_cart c
                                         JOIN retail_products p ON c.product_id = p.id
                                         WHERE c.user_id = :user_id AND p.sku = :sku");
            $deleteStmt->bindValue(':user_id', $dbUserId);
            $deleteStmt->bindValue(':sku', $sku);
            $deleteStmt->execute();
            
            // Return updated cart
            $cart = getCartItems($db, $dbUserId);
            
            sendResponse([
                'success' => true,
                'message' => 'Item removed from cart',
                'data' => $cart
            ]);
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log("Cart API Error: " . $e->getMessage());
    sendError('Failed to process cart operation', 500, $e->getMessage());
}
