<?php
/**
 * Promotions API Endpoint
 * GET /api/promotions - List all active promotions
 * GET /api/promotions/:code - Get promotion by code
 * POST /api/promotions/validate - Validate coupon code
 */

$database = new Database();
$db = $database->getConnection();

switch ($requestMethod) {
    case 'GET':
        if ($action) {
            getPromotionByCode($db, $action);
        } else {
            getPromotions($db);
        }
        break;
        
    case 'POST':
        if ($action === 'validate') {
            validatePromotion($db);
        } else {
            sendError('Action not found', 404);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
}

function getPromotions($db) {
    try {
        $sql = "SELECT 
            id,
            code,
            name,
            description,
            type,
            discount_value,
            min_purchase_amount,
            max_discount_amount,
            usage_limit,
            usage_count,
            per_customer_limit,
            start_date,
            end_date
        FROM retail_promotions 
        WHERE is_active = 1
            AND (start_date IS NULL OR start_date <= NOW())
            AND (end_date IS NULL OR end_date >= NOW())
            AND (usage_limit IS NULL OR usage_count < usage_limit)
        ORDER BY end_date ASC, id DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $promotions = $stmt->fetchAll();
        
        sendResponse([
            'success' => true,
            'data' => [
                'promotions' => array_map(function($p) {
                    return [
                        'id' => intval($p['id']),
                        'code' => $p['code'],
                        'name' => $p['name'],
                        'description' => $p['description'],
                        'type' => $p['type'],
                        'discountValue' => floatval($p['discount_value']),
                        'minPurchaseAmount' => floatval($p['min_purchase_amount']),
                        'maxDiscountAmount' => floatval($p['max_discount_amount'] ?? 0),
                        'usageLimit' => $p['usage_limit'],
                        'usageCount' => intval($p['usage_count']),
                        'perCustomerLimit' => intval($p['per_customer_limit']),
                        'startDate' => $p['start_date'],
                        'endDate' => $p['end_date']
                    ];
                }, $promotions)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get promotions error: " . $e->getMessage());
        sendError('Failed to fetch promotions', 500);
    }
}

function getPromotionByCode($db, $code) {
    try {
        $sql = "SELECT 
            id,
            code,
            name,
            description,
            type,
            discount_value,
            min_purchase_amount,
            max_discount_amount,
            usage_limit,
            usage_count,
            per_customer_limit,
            start_date,
            end_date,
            applicable_products,
            applicable_categories,
            excluded_products
        FROM retail_promotions 
        WHERE code = :code AND is_active = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':code' => $code]);
        $promotion = $stmt->fetch();
        
        if (!$promotion) {
            sendError('Promotion not found', 404);
        }
        
        sendResponse([
            'success' => true,
            'data' => [
                'id' => intval($promotion['id']),
                'code' => $promotion['code'],
                'name' => $promotion['name'],
                'description' => $promotion['description'],
                'type' => $promotion['type'],
                'discountValue' => floatval($promotion['discount_value']),
                'minPurchaseAmount' => floatval($promotion['min_purchase_amount']),
                'maxDiscountAmount' => floatval($promotion['max_discount_amount'] ?? 0),
                'usageLimit' => $promotion['usage_limit'],
                'usageCount' => intval($promotion['usage_count']),
                'perCustomerLimit' => intval($promotion['per_customer_limit']),
                'startDate' => $promotion['start_date'],
                'endDate' => $promotion['end_date'],
                'applicableProducts' => json_decode($promotion['applicable_products']),
                'applicableCategories' => json_decode($promotion['applicable_categories']),
                'excludedProducts' => json_decode($promotion['excluded_products'])
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get promotion error: " . $e->getMessage());
        sendError('Failed to fetch promotion', 500);
    }
}

function validatePromotion($db) {
    try {
        $data = getJsonInput();
        
        if (empty($data['code'])) {
            sendError('Coupon code is required', 400);
        }
        
        $code = $data['code'];
        $cartTotal = floatval($data['cartTotal'] ?? 0);
        
        $sql = "SELECT 
            id,
            code,
            name,
            description,
            type,
            discount_value,
            min_purchase_amount,
            max_discount_amount,
            usage_limit,
            usage_count,
            per_customer_limit,
            start_date,
            end_date
        FROM retail_promotions 
        WHERE code = :code AND is_active = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':code' => $code]);
        $promotion = $stmt->fetch();
        
        if (!$promotion) {
            sendResponse([
                'success' => false,
                'valid' => false,
                'message' => 'รหัสคูปองไม่ถูกต้อง'
            ]);
        }
        
        // Check date validity
        if ($promotion['start_date'] && strtotime($promotion['start_date']) > time()) {
            sendResponse([
                'success' => false,
                'valid' => false,
                'message' => 'คูปองยังไม่เริ่มใช้งาน'
            ]);
        }
        
        if ($promotion['end_date'] && strtotime($promotion['end_date']) < time()) {
            sendResponse([
                'success' => false,
                'valid' => false,
                'message' => 'คูปองหมดอายุแล้ว'
            ]);
        }
        
        // Check usage limit
        if ($promotion['usage_limit'] && intval($promotion['usage_count']) >= intval($promotion['usage_limit'])) {
            sendResponse([
                'success' => false,
                'valid' => false,
                'message' => 'คูปองหมดจำนวนการใช้งานแล้ว'
            ]);
        }
        
        // Check minimum purchase
        if ($cartTotal < floatval($promotion['min_purchase_amount'])) {
            sendResponse([
                'success' => false,
                'valid' => false,
                'message' => 'ยอดสั่งซื้อขั้นต่ำ ' . number_format($promotion['min_purchase_amount'], 2) . ' บาท'
            ]);
        }
        
        // Calculate discount
        $discountAmount = 0;
        if ($promotion['type'] === 'percentage') {
            $discountAmount = $cartTotal * (floatval($promotion['discount_value']) / 100);
            if ($promotion['max_discount_amount']) {
                $discountAmount = min($discountAmount, floatval($promotion['max_discount_amount']));
            }
        } elseif ($promotion['type'] === 'fixed_amount') {
            $discountAmount = floatval($promotion['discount_value']);
        } elseif ($promotion['type'] === 'free_shipping') {
            $discountAmount = floatval($promotion['max_discount_amount'] ?? 50);
        }
        
        sendResponse([
            'success' => true,
            'valid' => true,
            'data' => [
                'code' => $promotion['code'],
                'name' => $promotion['name'],
                'description' => $promotion['description'],
                'type' => $promotion['type'],
                'discountValue' => floatval($promotion['discount_value']),
                'discountAmount' => $discountAmount,
                'message' => 'ใช้คูปองสำเร็จ'
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Validate promotion error: " . $e->getMessage());
        sendError('Failed to validate promotion', 500);
    }
}
