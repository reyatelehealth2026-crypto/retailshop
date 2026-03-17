<?php
/**
 * Products API Endpoint
 * GET /api/products - List all products
 * GET /api/products/:sku - Get product by SKU
 * GET /api/products/featured - Get featured products
 * GET /api/products/new-arrivals - Get new arrivals
 * GET /api/products/best-sellers - Get best sellers
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

require_once __DIR__ . '/../classes/OdooRetailClient.php';

$database = new Database();
$db = $database->getConnection();

switch ($requestMethod) {
    case 'GET':
        if ($action === 'sync') {
            syncProductsFromOdoo($db);
        } elseif ($action === 'featured') {
            getFeaturedProducts($db);
        } elseif ($action === 'new-arrivals') {
            getNewArrivals($db);
        } elseif ($action === 'best-sellers') {
            getBestSellers($db);
        } elseif ($action === 'search') {
            searchProducts($db);
        } elseif ($action) {
            // Get product by SKU
            getProductBySku($db, $action);
        } else {
            // List all products
            getProducts($db);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
}

function getProducts($db) {
    try {
        // Get query parameters
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(50, max(1, intval($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        $category = $_GET['category'] ?? null;
        $search = $_GET['search'] ?? null;
        $minPrice = $_GET['minPrice'] ?? null;
        $maxPrice = $_GET['maxPrice'] ?? null;
        $sortBy = $_GET['sortBy'] ?? 'newest';
        $inStock = $_GET['inStock'] ?? null;
        
        // Build query
        $whereConditions = ['is_retail_active = 1'];
        $params = [];
        
        if ($category) {
            $whereConditions[] = '(category_id = :category OR category_name = :category_name)';
            $params[':category'] = $category;
            $params[':category_name'] = $category;
        }
        
        if ($search) {
            $whereConditions[] = '(name LIKE :search OR description LIKE :search OR keywords LIKE :search)';
            $params[':search'] = '%' . $search . '%';
        }
        
        if ($minPrice !== null) {
            $whereConditions[] = 'retail_price >= :minPrice';
            $params[':minPrice'] = $minPrice;
        }
        
        if ($maxPrice !== null) {
            $whereConditions[] = 'retail_price <= :maxPrice';
            $params[':maxPrice'] = $maxPrice;
        }
        
        if ($inStock === 'true') {
            $whereConditions[] = 'stock_qty > 0';
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        // Sort order
        $orderBy = match($sortBy) {
            'price_asc' => 'retail_price ASC',
            'price_desc' => 'retail_price DESC',
            'name_asc' => 'name ASC',
            'name_desc' => 'name DESC',
            'popular' => 'is_best_seller DESC, id DESC',
            default => 'is_featured DESC, id DESC'
        };
        
        // Count total
        $countSql = "SELECT COUNT(*) as total FROM retail_products WHERE $whereClause";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $totalCount = $countStmt->fetch()['total'];
        
        // Get products
        $sql = "SELECT 
            id,
            sku,
            barcode,
            name,
            name_en,
            description,
            short_description,
            retail_price,
            original_price,
            member_price,
            stock_qty,
            stock_status,
            category_id,
            category_name,
            subcategory_id,
            subcategory_name,
            image_url,
            image_gallery,
            brand,
            manufacturer,
            is_prescription_required,
            drug_classification,
            dosage,
            warnings,
            side_effects,
            is_featured,
            is_new_arrival,
            is_best_seller,
            meta_title,
            meta_description,
            created_at,
            updated_at
        FROM retail_products 
        WHERE $whereClause 
        ORDER BY $orderBy 
        LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        
        // Bind limit and offset separately
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $products = $stmt->fetchAll();
        
        // Format products
        $formattedProducts = array_map('formatProduct', $products);
        
        sendResponse([
            'success' => true,
            'data' => [
                'products' => $formattedProducts,
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
        error_log("Get products error: " . $e->getMessage());
        sendError('Failed to fetch products', 500);
    }
}

function getProductBySku($db, $sku) {
    try {
        $sql = "SELECT 
            id,
            sku,
            barcode,
            name,
            name_en,
            description,
            short_description,
            retail_price,
            original_price,
            member_price,
            stock_qty,
            stock_status,
            category_id,
            category_name,
            subcategory_id,
            subcategory_name,
            image_url,
            image_gallery,
            brand,
            manufacturer,
            country_of_origin,
            is_prescription_required,
            drug_classification,
            dosage,
            warnings,
            side_effects,
            is_featured,
            is_new_arrival,
            is_best_seller,
            meta_title,
            meta_description,
            keywords,
            created_at,
            updated_at
        FROM retail_products 
        WHERE sku = :sku AND is_retail_active = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':sku' => $sku]);
        $product = $stmt->fetch();
        
        if (!$product) {
            sendError('Product not found', 404);
        }
        
        // Get related products
        $relatedSql = "SELECT 
            sku, name, retail_price, original_price, image_url, stock_status
        FROM retail_products 
        WHERE category_id = :category_id 
            AND sku != :sku 
            AND is_retail_active = 1 
            AND stock_qty > 0
        ORDER BY RAND()
        LIMIT 4";
        
        $relatedStmt = $db->prepare($relatedSql);
        $relatedStmt->execute([
            ':category_id' => $product['category_id'],
            ':sku' => $sku
        ]);
        $relatedProducts = $relatedStmt->fetchAll();
        
        $formattedRelated = array_map(function($p) {
            return [
                'sku' => $p['sku'],
                'name' => $p['name'],
                'retailPrice' => floatval($p['retail_price']),
                'originalPrice' => floatval($p['original_price']),
                'imageUrl' => $p['image_url'],
                'stockStatus' => $p['stock_status']
            ];
        }, $relatedProducts);
        
        $formattedProduct = formatProduct($product);
        $formattedProduct['relatedProducts'] = $formattedRelated;
        
        sendResponse([
            'success' => true,
            'data' => $formattedProduct
        ]);
        
    } catch (PDOException $e) {
        error_log("Get product error: " . $e->getMessage());
        sendError('Failed to fetch product', 500);
    }
}

function getFeaturedProducts($db) {
    try {
        $limit = min(20, max(1, intval($_GET['limit'] ?? 8)));
        
        $sql = "SELECT 
            id, sku, name, short_description, retail_price, original_price,
            stock_qty, stock_status, category_name, image_url, is_featured
        FROM retail_products 
        WHERE is_retail_active = 1 AND is_featured = 1 AND stock_qty > 0
        ORDER BY sort_order ASC, id DESC
        LIMIT :limit";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll();
        
        sendResponse([
            'success' => true,
            'data' => [
                'products' => array_map('formatProduct', $products)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get featured products error: " . $e->getMessage());
        sendError('Failed to fetch featured products', 500);
    }
}

function getNewArrivals($db) {
    try {
        $limit = min(20, max(1, intval($_GET['limit'] ?? 8)));
        
        $sql = "SELECT 
            id, sku, name, short_description, retail_price, original_price,
            stock_qty, stock_status, category_name, image_url, is_new_arrival, created_at
        FROM retail_products 
        WHERE is_retail_active = 1 AND is_new_arrival = 1 AND stock_qty > 0
        ORDER BY created_at DESC
        LIMIT :limit";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll();
        
        sendResponse([
            'success' => true,
            'data' => [
                'products' => array_map('formatProduct', $products)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get new arrivals error: " . $e->getMessage());
        sendError('Failed to fetch new arrivals', 500);
    }
}

function getBestSellers($db) {
    try {
        $limit = min(20, max(1, intval($_GET['limit'] ?? 8)));
        
        $sql = "SELECT 
            id, sku, name, short_description, retail_price, original_price,
            stock_qty, stock_status, category_name, image_url, is_best_seller
        FROM retail_products 
        WHERE is_retail_active = 1 AND is_best_seller = 1 AND stock_qty > 0
        ORDER BY id DESC
        LIMIT :limit";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll();
        
        sendResponse([
            'success' => true,
            'data' => [
                'products' => array_map('formatProduct', $products)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get best sellers error: " . $e->getMessage());
        sendError('Failed to fetch best sellers', 500);
    }
}

function searchProducts($db) {
    try {
        $query = $_GET['q'] ?? '';
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(50, max(1, intval($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        if (empty($query)) {
            sendResponse([
                'success' => true,
                'data' => [
                    'products' => [],
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => 0,
                        'totalPages' => 0,
                        'hasNext' => false,
                        'hasPrev' => false
                    ]
                ]
            ]);
        }
        
        $searchTerm = '%' . $query . '%';
        
        // Count total
        $countSql = "SELECT COUNT(*) as total FROM retail_products 
            WHERE is_retail_active = 1 
            AND (name LIKE :search OR description LIKE :search OR keywords LIKE :search)";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute([':search' => $searchTerm]);
        $totalCount = $countStmt->fetch()['total'];
        
        // Search products
        $sql = "SELECT 
            id, sku, name, short_description, retail_price, original_price,
            stock_qty, stock_status, category_name, image_url
        FROM retail_products 
        WHERE is_retail_active = 1 
            AND (name LIKE :search OR description LIKE :search OR keywords LIKE :search)
        ORDER BY 
            CASE WHEN name LIKE :exact THEN 1 ELSE 2 END,
            is_featured DESC,
            id DESC
        LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':search', $searchTerm);
        $stmt->bindValue(':exact', $query . '%');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll();
        
        sendResponse([
            'success' => true,
            'data' => [
                'products' => array_map('formatProduct', $products),
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
        error_log("Search products error: " . $e->getMessage());
        sendError('Failed to search products', 500);
    }
}

function formatProduct($product) {
    $imageGallery = [];
    if (!empty($product['image_gallery'])) {
        $gallery = json_decode($product['image_gallery'], true);
        if (is_array($gallery)) {
            $imageGallery = $gallery;
        }
    }
    
    return [
        'id' => intval($product['id']),
        'sku' => $product['sku'],
        'barcode' => $product['barcode'] ?? null,
        'name' => $product['name'],
        'nameEn' => $product['name_en'] ?? null,
        'description' => $product['description'] ?? null,
        'shortDescription' => $product['short_description'] ?? null,
        'retailPrice' => floatval($product['retail_price']),
        'originalPrice' => floatval($product['original_price'] ?? 0),
        'memberPrice' => floatval($product['member_price'] ?? 0),
        'stockQty' => floatval($product['stock_qty'] ?? 0),
        'stockStatus' => $product['stock_status'] ?? 'out_of_stock',
        'categoryId' => $product['category_id'] ? intval($product['category_id']) : null,
        'categoryName' => $product['category_name'] ?? null,
        'subcategoryId' => $product['subcategory_id'] ? intval($product['subcategory_id']) : null,
        'subcategoryName' => $product['subcategory_name'] ?? null,
        'imageUrl' => $product['image_url'] ?? null,
        'imageGallery' => $imageGallery,
        'brand' => $product['brand'] ?? null,
        'manufacturer' => $product['manufacturer'] ?? null,
        'countryOfOrigin' => $product['country_of_origin'] ?? null,
        'isPrescriptionRequired' => boolval($product['is_prescription_required'] ?? 0),
        'drugClassification' => $product['drug_classification'] ?? 'general',
        'dosage' => $product['dosage'] ?? null,
        'warnings' => $product['warnings'] ?? null,
        'sideEffects' => $product['side_effects'] ?? null,
        'isFeatured' => boolval($product['is_featured'] ?? 0),
        'isNewArrival' => boolval($product['is_new_arrival'] ?? 0),
        'isBestSeller' => boolval($product['is_best_seller'] ?? 0),
        'metaTitle' => $product['meta_title'] ?? null,
        'metaDescription' => $product['meta_description'] ?? null,
        'createdAt' => $product['created_at'] ?? null,
        'updatedAt' => $product['updated_at'] ?? null
    ];
}

function syncProductsFromOdoo($db) {
    requireSyncAccess();

    $offset = max(1, intval($_GET['offset'] ?? $_GET['start'] ?? 1));
    $limit = min(50, max(1, intval($_GET['limit'] ?? 50)));
    $client = new OdooRetailClient();

    if (!$client->isConfigured()) {
        sendError('Odoo API is not configured', 503);
    }

    try {
        $result = $client->syncProducts($db, $offset, $limit);
        sendResponse([
            'success' => true,
            'data' => $result
        ]);
    } catch (Throwable $e) {
        error_log('Product sync error: ' . $e->getMessage());
        sendError('Failed to sync products', 500, $e->getMessage());
    }
}
