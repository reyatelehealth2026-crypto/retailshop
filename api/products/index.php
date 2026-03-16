<?php
/**
 * Products API Endpoint
 * GET /api/products - ดึงรายการสินค้าทั้งหมด
 * Query Parameters:
 *   - page: หน้าปัจจุบัน (default: 1)
 *   - limit: จำนวนต่อหน้า (default: 20)
 *   - category: กรองตามหมวดหมู่
 *   - search: ค้นหาชื่อสินค้า
 *   - min_price: ราคาต่ำสุด
 *   - max_price: ราคาสูงสุด
 *   - sort: เรียงลำดับ (price_asc, price_desc, name_asc, name_desc, popular, new)
 *   - filter: ตัวกรอง (promotion, new, bestseller, in_stock)
 */

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    // Get query parameters
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, intval($_GET['limit']))) : 20;
    $offset = ($page - 1) * $limit;
    
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : null;
    $minPrice = isset($_GET['min_price']) ? floatval($_GET['min_price']) : null;
    $maxPrice = isset($_GET['max_price']) ? floatval($_GET['max_price']) : null;
    $sort = isset($_GET['sort']) ? $_GET['sort'] : 'popular';
    $filter = isset($_GET['filter']) ? $_GET['filter'] : null;

    // Build WHERE clause
    $whereConditions = ['p.is_retail_active = 1', 'p.deleted_at IS NULL'];
    $params = [];

    if ($category) {
        $whereConditions[] = '(p.category_id = :category OR c.slug = :category_slug)';
        $params[':category'] = $category;
        $params[':category_slug'] = $category;
    }

    if ($search) {
        $whereConditions[] = '(p.name LIKE :search OR p.sku LIKE :search OR p.short_description LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    if ($minPrice !== null) {
        $whereConditions[] = 'p.retail_price >= :min_price';
        $params[':min_price'] = $minPrice;
    }

    if ($maxPrice !== null) {
        $whereConditions[] = 'p.retail_price <= :max_price';
        $params[':max_price'] = $maxPrice;
    }

    // Filter conditions
    if ($filter === 'promotion') {
        $whereConditions[] = '(p.promotion_label IS NOT NULL OR p.original_price > p.retail_price)';
    } elseif ($filter === 'new') {
        $whereConditions[] = 'p.is_new = 1';
    } elseif ($filter === 'bestseller') {
        $whereConditions[] = 'p.is_bestseller = 1';
    } elseif ($filter === 'in_stock') {
        $whereConditions[] = 'p.stock_qty > 0';
    }

    $whereClause = implode(' AND ', $whereConditions);

    // Build ORDER BY clause
    $orderBy = 'p.display_order ASC, p.id DESC';
    switch ($sort) {
        case 'price_asc':
            $orderBy = 'p.retail_price ASC, p.id DESC';
            break;
        case 'price_desc':
            $orderBy = 'p.retail_price DESC, p.id DESC';
            break;
        case 'name_asc':
            $orderBy = 'p.name ASC';
            break;
        case 'name_desc':
            $orderBy = 'p.name DESC';
            break;
        case 'popular':
            $orderBy = 'p.sold_count DESC, p.view_count DESC, p.id DESC';
            break;
        case 'new':
            $orderBy = 'p.created_at DESC, p.id DESC';
            break;
    }

    // Count total products
    $countQuery = "SELECT COUNT(*) as total 
                   FROM retail_products p 
                   LEFT JOIN retail_categories c ON p.category_id = c.id 
                   WHERE $whereClause";
    $countStmt = $db->prepare($countQuery);
    foreach ($params as $key => $value) {
        $countStmt->bindValue($key, $value);
    }
    $countStmt->execute();
    $totalCount = $countStmt->fetch()['total'];

    // Fetch products
    $query = "SELECT 
                p.id,
                p.sku,
                p.name,
                p.short_description,
                p.description,
                p.retail_price as retail_price,
                p.original_price as original_price,
                p.member_price,
                p.stock_qty,
                p.stock_status,
                p.image_url,
                p.image_gallery,
                p.is_medicine,
                p.drug_type,
                p.dosage,
                p.side_effects,
                p.warnings,
                p.is_featured,
                p.is_new,
                p.is_bestseller,
                p.promotion_label,
                p.promotion_end_date,
                p.rating,
                p.review_count,
                p.sold_count,
                c.id as category_id,
                c.name as category_name,
                c.slug as category_slug
              FROM retail_products p
              LEFT JOIN retail_categories c ON p.category_id = c.id
              WHERE $whereClause
              ORDER BY $orderBy
              LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $products = [];
    while ($row = $stmt->fetch()) {
        // Parse image gallery
        $gallery = [];
        if ($row['image_gallery']) {
            $gallery = json_decode($row['image_gallery'], true) ?: [];
        }

        // Calculate discount
        $discountPercent = 0;
        if ($row['original_price'] > 0 && $row['original_price'] > $row['retail_price']) {
            $discountPercent = round((($row['original_price'] - $row['retail_price']) / $row['original_price']) * 100);
        }

        $products[] = [
            'id' => $row['id'],
            'sku' => $row['sku'],
            'name' => $row['name'],
            'shortDescription' => $row['short_description'],
            'description' => $row['description'],
            'retailPrice' => floatval($row['retail_price']),
            'originalPrice' => floatval($row['original_price']),
            'memberPrice' => floatval($row['member_price']),
            'discountPercent' => $discountPercent,
            'stockQty' => floatval($row['stock_qty']),
            'stockStatus' => $row['stock_status'],
            'imageUrl' => $row['image_url'],
            'imageGallery' => $gallery,
            'isMedicine' => (bool)$row['is_medicine'],
            'drugType' => $row['drug_type'],
            'dosage' => $row['dosage'],
            'sideEffects' => $row['side_effects'],
            'warnings' => $row['warnings'],
            'isFeatured' => (bool)$row['is_featured'],
            'isNew' => (bool)$row['is_new'],
            'isBestseller' => (bool)$row['is_bestseller'],
            'promotionLabel' => $row['promotion_label'],
            'promotionEndDate' => $row['promotion_end_date'],
            'rating' => floatval($row['rating']),
            'reviewCount' => intval($row['review_count']),
            'soldCount' => intval($row['sold_count']),
            'category' => $row['category_id'] ? [
                'id' => $row['category_id'],
                'name' => $row['category_name'],
                'slug' => $row['category_slug']
            ] : null
        ];
    }

    // Calculate pagination
    $totalPages = ceil($totalCount / $limit);

    sendResponse([
        'success' => true,
        'data' => $products,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'totalCount' => intval($totalCount),
            'totalPages' => $totalPages,
            'hasNext' => $page < $totalPages,
            'hasPrev' => $page > 1
        ]
    ]);

} catch (Exception $e) {
    error_log("Products API Error: " . $e->getMessage());
    sendError('Failed to fetch products', 500, $e->getMessage());
}
