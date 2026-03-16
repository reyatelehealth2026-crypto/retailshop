<?php
/**
 * Banners API Endpoint
 * GET /api/banners - List all active banners
 * GET /api/banners/position/:position - Get banners by position
 */

$database = new Database();
$db = $database->getConnection();

switch ($requestMethod) {
    case 'GET':
        if ($action === 'position' && $id) {
            getBannersByPosition($db, $id);
        } else {
            getBanners($db);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
}

function getBanners($db) {
    try {
        $sql = "SELECT 
            id,
            title,
            subtitle,
            image_url,
            mobile_image_url,
            link_url,
            link_type,
            link_target,
            position,
            sort_order
        FROM retail_banners 
        WHERE is_active = 1
            AND (start_date IS NULL OR start_date <= NOW())
            AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY position ASC, sort_order ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $banners = $stmt->fetchAll();
        
        // Group by position
        $grouped = [];
        foreach ($banners as $banner) {
            $position = $banner['position'];
            if (!isset($grouped[$position])) {
                $grouped[$position] = [];
            }
            
            $grouped[$position][] = [
                'id' => intval($banner['id']),
                'title' => $banner['title'],
                'subtitle' => $banner['subtitle'],
                'imageUrl' => $banner['image_url'],
                'mobileImageUrl' => $banner['mobile_image_url'],
                'link' => [
                    'url' => $banner['link_url'],
                    'type' => $banner['link_type'],
                    'target' => $banner['link_target']
                ],
                'position' => $banner['position'],
                'sortOrder' => intval($banner['sort_order'])
            ];
        }
        
        sendResponse([
            'success' => true,
            'data' => [
                'banners' => $grouped,
                'all' => array_map(function($b) {
                    return [
                        'id' => intval($b['id']),
                        'title' => $b['title'],
                        'subtitle' => $b['subtitle'],
                        'imageUrl' => $b['image_url'],
                        'mobileImageUrl' => $b['mobile_image_url'],
                        'link' => [
                            'url' => $b['link_url'],
                            'type' => $b['link_type'],
                            'target' => $b['link_target']
                        ],
                        'position' => $b['position'],
                        'sortOrder' => intval($b['sort_order'])
                    ];
                }, $banners)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get banners error: " . $e->getMessage());
        sendError('Failed to fetch banners', 500);
    }
}

function getBannersByPosition($db, $position) {
    try {
        $sql = "SELECT 
            id,
            title,
            subtitle,
            image_url,
            mobile_image_url,
            link_url,
            link_type,
            link_target,
            sort_order
        FROM retail_banners 
        WHERE position = :position 
            AND is_active = 1
            AND (start_date IS NULL OR start_date <= NOW())
            AND (end_date IS NULL OR end_date >= NOW())
        ORDER BY sort_order ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':position' => $position]);
        $banners = $stmt->fetchAll();
        
        sendResponse([
            'success' => true,
            'data' => [
                'position' => $position,
                'banners' => array_map(function($b) {
                    return [
                        'id' => intval($b['id']),
                        'title' => $b['title'],
                        'subtitle' => $b['subtitle'],
                        'imageUrl' => $b['image_url'],
                        'mobileImageUrl' => $b['mobile_image_url'],
                        'link' => [
                            'url' => $b['link_url'],
                            'type' => $b['link_type'],
                            'target' => $b['link_target']
                        ],
                        'sortOrder' => intval($b['sort_order'])
                    ];
                }, $banners)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get banners by position error: " . $e->getMessage());
        sendError('Failed to fetch banners', 500);
    }
}
