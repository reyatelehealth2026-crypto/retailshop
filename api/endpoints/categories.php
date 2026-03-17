<?php
/**
 * Categories API Endpoint
 * GET /api/categories - List all categories
 * GET /api/categories/:id - Get category by ID
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

switch ($requestMethod) {
    case 'GET':
        if ($action) {
            getCategoryById($db, intval($action));
        } else {
            getCategories($db);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
}

function getCategories($db) {
    try {
        $sql = "SELECT 
            id,
            odoo_category_id,
            name,
            name_en,
            description,
            image_url,
            icon,
            parent_id,
            sort_order,
            is_active,
            created_at
        FROM retail_categories 
        WHERE is_active = 1
        ORDER BY sort_order ASC, name ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $categories = $stmt->fetchAll();
        
        // Build hierarchical structure
        $categoryMap = [];
        $rootCategories = [];
        
        foreach ($categories as $category) {
            $formatted = [
                'id' => intval($category['id']),
                'odooCategoryId' => $category['odoo_category_id'] ? intval($category['odoo_category_id']) : null,
                'name' => $category['name'],
                'nameEn' => $category['name_en'],
                'description' => $category['description'],
                'imageUrl' => $category['image_url'],
                'icon' => $category['icon'],
                'parentId' => $category['parent_id'] ? intval($category['parent_id']) : null,
                'sortOrder' => intval($category['sort_order']),
                'subcategories' => []
            ];
            
            $categoryMap[$formatted['id']] = $formatted;
        }
        
        // Build tree
        foreach ($categoryMap as $id => $category) {
            if ($category['parentId'] && isset($categoryMap[$category['parentId']])) {
                $categoryMap[$category['parentId']]['subcategories'][] = &$categoryMap[$id];
            } else {
                $rootCategories[] = &$categoryMap[$id];
            }
        }
        
        sendResponse([
            'success' => true,
            'data' => [
                'categories' => $rootCategories,
                'flat' => array_values($categoryMap)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get categories error: " . $e->getMessage());
        sendError('Failed to fetch categories', 500);
    }
}

function getCategoryById($db, $id) {
    try {
        $sql = "SELECT 
            id,
            odoo_category_id,
            name,
            name_en,
            description,
            image_url,
            icon,
            parent_id,
            sort_order,
            is_active,
            created_at
        FROM retail_categories 
        WHERE id = :id AND is_active = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $category = $stmt->fetch();
        
        if (!$category) {
            sendError('Category not found', 404);
        }
        
        // Get subcategories
        $subSql = "SELECT 
            id, name, name_en, image_url, icon
        FROM retail_categories 
        WHERE parent_id = :parent_id AND is_active = 1
        ORDER BY sort_order ASC, name ASC";
        
        $subStmt = $db->prepare($subSql);
        $subStmt->execute([':parent_id' => $id]);
        $subcategories = $subStmt->fetchAll();
        
        // Get products in this category
        $productSql = "SELECT 
            id, sku, name, short_description, retail_price, original_price,
            stock_qty, stock_status, image_url
        FROM retail_products 
        WHERE category_id = :category_id AND is_retail_active = 1 AND stock_qty > 0
        ORDER BY is_featured DESC, id DESC
        LIMIT 20";
        
        $productStmt = $db->prepare($productSql);
        $productStmt->execute([':category_id' => $id]);
        $products = $productStmt->fetchAll();
        
        $formattedProducts = array_map(function($p) {
            return [
                'id' => intval($p['id']),
                'sku' => $p['sku'],
                'name' => $p['name'],
                'shortDescription' => $p['short_description'],
                'retailPrice' => floatval($p['retail_price']),
                'originalPrice' => floatval($p['original_price'] ?? 0),
                'stockQty' => floatval($p['stock_qty'] ?? 0),
                'stockStatus' => $p['stock_status'],
                'imageUrl' => $p['image_url']
            ];
        }, $products);
        
        sendResponse([
            'success' => true,
            'data' => [
                'id' => intval($category['id']),
                'name' => $category['name'],
                'nameEn' => $category['name_en'],
                'description' => $category['description'],
                'imageUrl' => $category['image_url'],
                'icon' => $category['icon'],
                'subcategories' => array_map(function($s) {
                    return [
                        'id' => intval($s['id']),
                        'name' => $s['name'],
                        'nameEn' => $s['name_en'],
                        'imageUrl' => $s['image_url'],
                        'icon' => $s['icon']
                    ];
                }, $subcategories),
                'products' => $formattedProducts
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get category error: " . $e->getMessage());
        sendError('Failed to fetch category', 500);
    }
}
