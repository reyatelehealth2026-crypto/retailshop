<?php
/**
 * Product Detail API Endpoint
 * GET /api/products/detail.php?sku={sku} หรือ /api/products/detail.php?id={id}
 * ดึงรายละเอียดสินค้าตาม SKU หรือ ID
 */

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $sku = isset($_GET['sku']) ? trim($_GET['sku']) : null;
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;

    if (!$sku && !$id) {
        sendError('Please provide sku or id parameter', 400);
    }

    // Build query condition
    $condition = $sku ? 'p.sku = :sku' : 'p.id = :id';
    $param = $sku ? ':sku' : ':id';
    $value = $sku ?: $id;

    // Fetch product
    $query = "SELECT 
                p.*,
                c.id as category_id,
                c.name as category_name,
                c.slug as category_slug,
                c.description as category_description,
                sc.id as subcategory_id,
                sc.name as subcategory_name,
                sc.slug as subcategory_slug
              FROM retail_products p
              LEFT JOIN retail_categories c ON p.category_id = c.id
              LEFT JOIN retail_categories sc ON p.subcategory_id = sc.id
              WHERE $condition 
                AND p.is_retail_active = 1 
                AND p.deleted_at IS NULL";

    $stmt = $db->prepare($query);
    $stmt->bindValue($param, $value);
    $stmt->execute();

    $product = $stmt->fetch();

    if (!$product) {
        sendError('Product not found', 404);
    }

    // Update view count
    $updateStmt = $db->prepare("UPDATE retail_products SET view_count = view_count + 1 WHERE id = :id");
    $updateStmt->bindValue(':id', $product['id']);
    $updateStmt->execute();

    // Parse image gallery
    $gallery = [];
    if ($product['image_gallery']) {
        $gallery = json_decode($product['image_gallery'], true) ?: [];
    }

    // Parse tags
    $tags = [];
    if ($product['tags']) {
        $tags = json_decode($product['tags'], true) ?: [];
    }

    // Calculate discount
    $discountPercent = 0;
    if ($product['original_price'] > 0 && $product['original_price'] > $product['retail_price']) {
        $discountPercent = round((($product['original_price'] - $product['retail_price']) / $product['original_price']) * 100);
    }

    // Fetch related products (same category)
    $relatedQuery = "SELECT 
                        id, sku, name, retail_price, original_price, 
                        image_url, rating, stock_status
                      FROM retail_products 
                      WHERE category_id = :category_id 
                        AND id != :product_id
                        AND is_retail_active = 1
                        AND deleted_at IS NULL
                      ORDER BY sold_count DESC, view_count DESC
                      LIMIT 8";
    $relatedStmt = $db->prepare($relatedQuery);
    $relatedStmt->bindValue(':category_id', $product['category_id']);
    $relatedStmt->bindValue(':product_id', $product['id']);
    $relatedStmt->execute();

    $relatedProducts = [];
    while ($row = $relatedStmt->fetch()) {
        $relDiscount = 0;
        if ($row['original_price'] > 0 && $row['original_price'] > $row['retail_price']) {
            $relDiscount = round((($row['original_price'] - $row['retail_price']) / $row['original_price']) * 100);
        }

        $relatedProducts[] = [
            'id' => $row['id'],
            'sku' => $row['sku'],
            'name' => $row['name'],
            'retailPrice' => floatval($row['retail_price']),
            'originalPrice' => floatval($row['original_price']),
            'discountPercent' => $relDiscount,
            'imageUrl' => $row['image_url'],
            'rating' => floatval($row['rating']),
            'stockStatus' => $row['stock_status']
        ];
    }

    // Build response
    $response = [
        'success' => true,
        'data' => [
            'id' => $product['id'],
            'sku' => $product['sku'],
            'name' => $product['name'],
            'nameEn' => $product['name_en'],
            'shortDescription' => $product['short_description'],
            'description' => $product['description'],
            'retailPrice' => floatval($product['retail_price']),
            'originalPrice' => floatval($product['original_price']),
            'memberPrice' => floatval($product['member_price']),
            'discountPercent' => $discountPercent,
            'stockQty' => floatval($product['stock_qty']),
            'stockStatus' => $product['stock_status'],
            'lowStockThreshold' => floatval($product['low_stock_threshold']),
            'imageUrl' => $product['image_url'],
            'imageGallery' => $gallery,
            'tags' => $tags,
            'isMedicine' => (bool)$product['is_medicine'],
            'drugType' => $product['drug_type'],
            'dosage' => $product['dosage'],
            'sideEffects' => $product['side_effects'],
            'warnings' => $product['warnings'],
            'isFeatured' => (bool)$product['is_featured'],
            'isNew' => (bool)$product['is_new'],
            'isBestseller' => (bool)$product['is_bestseller'],
            'promotionLabel' => $product['promotion_label'],
            'promotionEndDate' => $product['promotion_end_date'],
            'rating' => floatval($product['rating']),
            'reviewCount' => intval($product['review_count']),
            'soldCount' => intval($product['sold_count']),
            'viewCount' => intval($product['view_count']) + 1,
            'category' => $product['category_id'] ? [
                'id' => $product['category_id'],
                'name' => $product['category_name'],
                'slug' => $product['category_slug'],
                'description' => $product['category_description']
            ] : null,
            'subcategory' => $product['subcategory_id'] ? [
                'id' => $product['subcategory_id'],
                'name' => $product['subcategory_name'],
                'slug' => $product['subcategory_slug']
            ] : null,
            'metaTitle' => $product['meta_title'],
            'metaDescription' => $product['meta_description'],
            'slug' => $product['slug'],
            'relatedProducts' => $relatedProducts,
            'lastSyncAt' => $product['last_sync_at']
        ]
    ];

    sendResponse($response);

} catch (Exception $e) {
    error_log("Product Detail API Error: " . $e->getMessage());
    sendError('Failed to fetch product details', 500, $e->getMessage());
}
