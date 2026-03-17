<?php
/**
 * Cart API Endpoint
 * GET /api/cart - Get cart items
 * POST /api/cart/add - Add item to cart
 * PUT /api/cart/update - Update cart item quantity
 * DELETE /api/cart/remove/:sku - Remove item from cart
 * DELETE /api/cart/clear - Clear cart
 */

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$database = new Database();
$db = $database->getConnection();

function getCurrentUserId($db) {
    return requireAuthenticatedCustomerId();
}

switch ($requestMethod) {
    case 'GET':
        getCart($db);
        break;
        
    case 'POST':
        if ($action === 'add') {
            addToCart($db);
        } elseif ($action === 'sync') {
            syncCart($db);
        } else {
            sendError('Action not found', 404);
        }
        break;
        
    case 'PUT':
        if ($action === 'update') {
            updateCart($db);
        } else {
            sendError('Action not found', 404);
        }
        break;
        
    case 'DELETE':
        if ($action === 'remove' && $id) {
            removeFromCart($db, $id);
        } elseif ($action === 'clear') {
            clearCart($db);
        } else {
            sendError('Action not found', 404);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
}

function getCart($db) {
    try {
        $customerId = getCurrentUserId($db);
        
        $sql = "SELECT 
            c.id as cart_id,
            c.sku,
            c.quantity,
            c.added_at,
            p.id as product_id,
            p.name,
            p.short_description,
            p.retail_price,
            p.original_price,
            p.stock_qty,
            p.stock_status,
            p.image_url,
            p.category_name
        FROM retail_cart c
        JOIN retail_products p ON c.sku = p.sku
        WHERE c.customer_id = :customer_id AND p.is_retail_active = 1
        ORDER BY c.added_at DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':customer_id' => $customerId]);
        $items = $stmt->fetchAll();
        
        $cartItems = [];
        $subtotal = 0;
        $totalItems = 0;
        
        foreach ($items as $item) {
            $itemTotal = floatval($item['retail_price']) * intval($item['quantity']);
            $subtotal += $itemTotal;
            $totalItems += intval($item['quantity']);
            
            $cartItems[] = [
                'cartId' => intval($item['cart_id']),
                'sku' => $item['sku'],
                'name' => $item['name'],
                'shortDescription' => $item['short_description'],
                'retailPrice' => floatval($item['retail_price']),
                'originalPrice' => floatval($item['original_price'] ?? 0),
                'quantity' => intval($item['quantity']),
                'stockQty' => floatval($item['stock_qty']),
                'stockStatus' => $item['stock_status'],
                'imageUrl' => $item['image_url'],
                'categoryName' => $item['category_name'],
                'itemTotal' => $itemTotal,
                'addedAt' => $item['added_at']
            ];
        }
        
        // Calculate totals
        $shippingFee = $subtotal >= 499 ? 0 : 50;
        $total = $subtotal + $shippingFee;
        
        sendResponse([
            'success' => true,
            'data' => [
                'items' => $cartItems,
                'summary' => [
                    'totalItems' => $totalItems,
                    'subtotal' => $subtotal,
                    'shippingFee' => $shippingFee,
                    'discount' => 0,
                    'total' => $total
                ]
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get cart error: " . $e->getMessage());
        sendError('Failed to fetch cart', 500);
    }
}

function addToCart($db) {
    try {
        $customerId = getCurrentUserId($db);
        $data = getJsonInput();
        
        $required = ['sku', 'quantity'];
        $missing = validateRequired($data, $required);
        
        if (!empty($missing)) {
            sendError('Missing required fields: ' . implode(', ', $missing), 400);
        }
        
        $sku = $data['sku'];
        $quantity = max(1, intval($data['quantity']));
        
        // Check if product exists and has stock
        $productSql = "SELECT stock_qty, stock_status, is_retail_active FROM retail_products WHERE sku = :sku";
        $productStmt = $db->prepare($productSql);
        $productStmt->execute([':sku' => $sku]);
        $product = $productStmt->fetch();
        
        if (!$product) {
            sendError('Product not found', 404);
        }
        
        if (!$product['is_retail_active']) {
            sendError('Product is not available', 400);
        }
        
        if ($product['stock_status'] === 'out_of_stock' || $product['stock_qty'] < $quantity) {
            sendError('Insufficient stock', 400);
        }
        
        // Check if item already in cart
        $checkSql = "SELECT id, quantity FROM retail_cart WHERE customer_id = :customer_id AND sku = :sku";
        $checkStmt = $db->prepare($checkSql);
        $checkStmt->execute([':customer_id' => $customerId, ':sku' => $sku]);
        $existing = $checkStmt->fetch();
        
        if ($existing) {
            // Update quantity
            $newQuantity = min($existing['quantity'] + $quantity, intval($product['stock_qty']));
            $updateSql = "UPDATE retail_cart SET quantity = :quantity, updated_at = NOW() WHERE id = :id";
            $updateStmt = $db->prepare($updateSql);
            $updateStmt->execute([':quantity' => $newQuantity, ':id' => $existing['id']]);
        } else {
            // Insert new item
            $insertSql = "INSERT INTO retail_cart (customer_id, sku, quantity) VALUES (:customer_id, :sku, :quantity)";
            $insertStmt = $db->prepare($insertSql);
            $insertStmt->execute([
                ':customer_id' => $customerId,
                ':sku' => $sku,
                ':quantity' => $quantity
            ]);
        }
        
        // Return updated cart
        getCart($db);
        
    } catch (PDOException $e) {
        error_log("Add to cart error: " . $e->getMessage());
        sendError('Failed to add to cart', 500);
    }
}

function updateCart($db) {
    try {
        $customerId = getCurrentUserId($db);
        $data = getJsonInput();
        
        $required = ['sku', 'quantity'];
        $missing = validateRequired($data, $required);
        
        if (!empty($missing)) {
            sendError('Missing required fields: ' . implode(', ', $missing), 400);
        }
        
        $sku = $data['sku'];
        $quantity = intval($data['quantity']);
        
        if ($quantity <= 0) {
            // Remove item if quantity is 0 or negative
            removeFromCart($db, $sku);
            return;
        }
        
        // Check stock
        $productSql = "SELECT stock_qty FROM retail_products WHERE sku = :sku AND is_retail_active = 1";
        $productStmt = $db->prepare($productSql);
        $productStmt->execute([':sku' => $sku]);
        $product = $productStmt->fetch();
        
        if (!$product) {
            sendError('Product not found', 404);
        }
        
        if ($product['stock_qty'] < $quantity) {
            sendError('Insufficient stock. Available: ' . $product['stock_qty'], 400);
        }
        
        // Update cart
        $sql = "UPDATE retail_cart SET quantity = :quantity, updated_at = NOW() 
            WHERE customer_id = :customer_id AND sku = :sku";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':quantity' => $quantity,
            ':customer_id' => $customerId,
            ':sku' => $sku
        ]);
        
        if ($stmt->rowCount() === 0) {
            sendError('Item not found in cart', 404);
        }
        
        // Return updated cart
        getCart($db);
        
    } catch (PDOException $e) {
        error_log("Update cart error: " . $e->getMessage());
        sendError('Failed to update cart', 500);
    }
}

function removeFromCart($db, $sku) {
    try {
        $customerId = getCurrentUserId($db);
        
        $sql = "DELETE FROM retail_cart WHERE customer_id = :customer_id AND sku = :sku";
        $stmt = $db->prepare($sql);
        $stmt->execute([':customer_id' => $customerId, ':sku' => $sku]);
        
        // Return updated cart
        getCart($db);
        
    } catch (PDOException $e) {
        error_log("Remove from cart error: " . $e->getMessage());
        sendError('Failed to remove from cart', 500);
    }
}

function clearCart($db) {
    try {
        $customerId = getCurrentUserId($db);
        
        $sql = "DELETE FROM retail_cart WHERE customer_id = :customer_id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':customer_id' => $customerId]);
        
        sendResponse([
            'success' => true,
            'data' => [
                'items' => [],
                'summary' => [
                    'totalItems' => 0,
                    'subtotal' => 0,
                    'shippingFee' => 0,
                    'discount' => 0,
                    'total' => 0
                ]
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Clear cart error: " . $e->getMessage());
        sendError('Failed to clear cart', 500);
    }
}

function syncCart($db) {
    try {
        $customerId = getCurrentUserId($db);
        $data = getJsonInput();
        
        if (!isset($data['items']) || !is_array($data['items'])) {
            sendError('Invalid items data', 400);
        }
        
        $items = $data['items'];
        
        // Start transaction
        $db->beginTransaction();
        
        // Clear existing cart
        $clearSql = "DELETE FROM retail_cart WHERE customer_id = :customer_id";
        $clearStmt = $db->prepare($clearSql);
        $clearStmt->execute([':customer_id' => $customerId]);
        
        // Insert new items
        $insertSql = "INSERT INTO retail_cart (customer_id, sku, quantity) VALUES (:customer_id, :sku, :quantity)";
        $insertStmt = $db->prepare($insertSql);
        
        foreach ($items as $item) {
            if (isset($item['sku']) && isset($item['quantity']) && $item['quantity'] > 0) {
                // Check stock
                $stockSql = "SELECT stock_qty FROM retail_products WHERE sku = :sku AND is_retail_active = 1";
                $stockStmt = $db->prepare($stockSql);
                $stockStmt->execute([':sku' => $item['sku']]);
                $product = $stockStmt->fetch();
                
                if ($product && $product['stock_qty'] >= $item['quantity']) {
                    $insertStmt->execute([
                        ':customer_id' => $customerId,
                        ':sku' => $item['sku'],
                        ':quantity' => min($item['quantity'], intval($product['stock_qty']))
                    ]);
                }
            }
        }
        
        $db->commit();
        
        // Return updated cart
        getCart($db);
        
    } catch (PDOException $e) {
        $db->rollBack();
        error_log("Sync cart error: " . $e->getMessage());
        sendError('Failed to sync cart', 500);
    }
}
