<?php
/**
 * Categories API Endpoint
 * GET /api/categories - ดึงรายการหมวดหมู่สินค้า
 * Query Parameters:
 *   - parent_id: กรองตามหมวดหมู่แม่ (null สำหรับหมวดหมู่ระดับบนสุด)
 *   - with_products: รวมสินค้าในหมวดหมู่ (default: false)
 *   - limit: จำนวนสินค้าต่อหมวดหมู่ (ถ้า with_products=true)
 */

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $parentId = isset($_GET['parent_id']) ? $_GET['parent_id'] : null;
    $withProducts = isset($_GET['with_products']) && $_GET['with_products'] === 'true';
    $productLimit = isset($_GET['limit']) ? min(20, max(1, intval($_GET['limit']))) : 4;

    // Build WHERE clause
    $whereConditions = ['is_active = 1'];
    $params = [];

    if ($parentId !== null && $parentId !== '') {
        $whereConditions[] = 'parent_id = :parent_id';
        $params[':parent_id'] = $parentId === 'null' ? null : intval($parentId);
    } else {
        // Default: get only top-level categories
        $whereConditions[] = 'parent_id IS NULL';
    }

    $whereClause = implode(' AND ', $whereConditions);

    // Fetch categories
    $query = "SELECT 
                id, name, name_en, description, 
                parent_id, level, path,
                icon, image_url,
                slug, display_order, show_in_menu,
                product_count
              FROM retail_categories
              WHERE $whereClause
              ORDER BY display_order ASC, name ASC";

    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, $value === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    }
    $stmt->execute();

    $categories = [];
    while ($row = $stmt->fetch()) {
        $category = [
            'id' => $row['id'],
            'name' => $row['name'],
            'nameEn' => $row['name_en'],
            'description' => $row['description'],
            'parentId' => $row['parent_id'],
            'level' => $row['level'],
            'icon' => $row['icon'],
            'imageUrl' => $row['image_url'],
            'slug' => $row['slug'],
            'displayOrder' => $row['display_order'],
            'showInMenu' => (bool)$row['show_in_menu'],
            'productCount' => intval($row['product_count'])
        ];

        // Fetch subcategories
        $subQuery = "SELECT 
                        id, name, name_en, slug, image_url, product_count
                      FROM retail_categories
                      WHERE parent_id = :category_id AND is_active = 1
                      ORDER BY display_order ASC, name ASC
                      LIMIT 10";
        $subStmt = $db->prepare($subQuery);
        $subStmt->bindValue(':category_id', $row['id']);
        $subStmt->execute();

        $subcategories = [];
        while ($subRow = $subStmt->fetch()) {
            $subcategories[] = [
                'id' => $subRow['id'],
                'name' => $subRow['name'],
                'nameEn' => $subRow['name_en'],
                'slug' => $subRow['slug'],
                'imageUrl' => $subRow['image_url'],
                'productCount' => intval($subRow['product_count'])
            ];
        }
        $category['subcategories'] = $subcategories;

        // Fetch products in this category if requested
        if ($withProducts) {
            $prodQuery = "SELECT 
                            id, sku, name, retail_price, original_price,
                            image_url, rating, stock_status, is_new, is_bestseller
                          FROM retail_products
                          WHERE category_id = :category_id 
                            AND is_retail_active = 1
                            AND deleted_at IS NULL
                          ORDER BY is_featured DESC, sold_count DESC, view_count DESC
                          LIMIT :limit";
            $prodStmt = $db->prepare($prodQuery);
            $prodStmt->bindValue(':category_id', $row['id']);
            $prodStmt->bindValue(':limit', $productLimit, PDO::PARAM_INT);
            $prodStmt->execute();

            $products = [];
            while ($prodRow = $prodStmt->fetch()) {
                $discount = 0;
                if ($prodRow['original_price'] > 0 && $prodRow['original_price'] > $prodRow['retail_price']) {
                    $discount = round((($prodRow['original_price'] - $prodRow['retail_price']) / $prodRow['original_price']) * 100);
                }

                $products[] = [
                    'id' => $prodRow['id'],
                    'sku' => $prodRow['sku'],
                    'name' => $prodRow['name'],
                    'retailPrice' => floatval($prodRow['retail_price']),
                    'originalPrice' => floatval($prodRow['original_price']),
                    'discountPercent' => $discount,
                    'imageUrl' => $prodRow['image_url'],
                    'rating' => floatval($prodRow['rating']),
                    'stockStatus' => $prodRow['stock_status'],
                    'isNew' => (bool)$prodRow['is_new'],
                    'isBestseller' => (bool)$prodRow['is_bestseller']
                ];
            }
            $category['products'] = $products;
        }

        $categories[] = $category;
    }

    sendResponse([
        'success' => true,
        'data' => $categories,
        'count' => count($categories)
    ]);

} catch (Exception $e) {
    error_log("Categories API Error: " . $e->getMessage());
    sendError('Failed to fetch categories', 500, $e->getMessage());
}
