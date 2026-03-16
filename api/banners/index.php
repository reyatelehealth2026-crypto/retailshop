<?php
/**
 * Banners API Endpoint
 * GET /api/banners - ดึงรายการแบนเนอร์
 * Query Parameters:
 *   - position: ตำแหน่งแบนเนอร์ (home_top, home_middle, home_bottom, category_page, product_page)
 */

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $position = isset($_GET['position']) ? $_GET['position'] : null;

    // Build WHERE clause
    $whereConditions = ['is_active = 1'];
    $params = [];

    // Check date range
    $whereConditions[] = '(start_date IS NULL OR start_date <= NOW())';
    $whereConditions[] = '(end_date IS NULL OR end_date >= NOW())';

    if ($position) {
        $whereConditions[] = 'position = :position';
        $params[':position'] = $position;
    }

    $whereClause = implode(' AND ', $whereConditions);

    // Fetch banners
    $query = "SELECT 
                id, title, subtitle,
                image_url, image_mobile_url,
                link_url, link_type, link_target,
                position, display_order
              FROM retail_banners
              WHERE $whereClause
              ORDER BY position ASC, display_order ASC, id DESC";

    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    $banners = [];
    while ($row = $stmt->fetch()) {
        $banners[] = [
            'id' => $row['id'],
            'title' => $row['title'],
            'subtitle' => $row['subtitle'],
            'imageUrl' => $row['image_url'],
            'imageMobileUrl' => $row['image_mobile_url'],
            'linkUrl' => $row['link_url'],
            'linkType' => $row['link_type'],
            'linkTarget' => $row['link_target'],
            'position' => $row['position'],
            'displayOrder' => $row['display_order']
        ];
    }

    sendResponse([
        'success' => true,
        'data' => $banners,
        'count' => count($banners)
    ]);

} catch (Exception $e) {
    error_log("Banners API Error: " . $e->getMessage());
    sendError('Failed to fetch banners', 500, $e->getMessage());
}
