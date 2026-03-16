<?php
/**
 * Notifications API Endpoint
 * GET /api/notifications - List user notifications
 * PUT /api/notifications/:id/read - Mark notification as read
 * PUT /api/notifications/read-all - Mark all as read
 * DELETE /api/notifications/:id - Delete notification
 */

$database = new Database();
$db = $database->getConnection();

function getCurrentUserId($db) {
    return requireAuthenticatedCustomerId();
}

switch ($requestMethod) {
    case 'GET':
        getNotifications($db);
        break;
        
    case 'PUT':
        if ($action === 'read' && $id) {
            markAsRead($db, intval($id));
        } elseif ($action === 'read-all') {
            markAllAsRead($db);
        } else {
            sendError('Action not found', 404);
        }
        break;
        
    case 'DELETE':
        if ($id) {
            deleteNotification($db, intval($id));
        } else {
            sendError('Notification ID required', 400);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
}

function getNotifications($db) {
    try {
        $customerId = getCurrentUserId($db);
        
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(50, max(1, intval($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        $unreadOnly = ($_GET['unread'] ?? 'false') === 'true';
        
        // Build query
        $whereConditions = ['customer_id = :customer_id'];
        $params = [':customer_id' => $customerId];
        
        if ($unreadOnly) {
            $whereConditions[] = 'is_read = 0';
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        // Count total and unread
        $countSql = "SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
        FROM retail_notifications WHERE customer_id = :customer_id";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute([':customer_id' => $customerId]);
        $counts = $countStmt->fetch();
        
        // Get notifications
        $sql = "SELECT 
            id,
            type,
            title,
            message,
            image_url,
            action_type,
            action_data,
            is_read,
            read_at,
            created_at
        FROM retail_notifications 
        WHERE $whereClause 
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $notifications = $stmt->fetchAll();
        
        sendResponse([
            'success' => true,
            'data' => [
                'notifications' => array_map(function($n) {
                    return [
                        'id' => intval($n['id']),
                        'type' => $n['type'],
                        'title' => $n['title'],
                        'message' => $n['message'],
                        'imageUrl' => $n['image_url'],
                        'action' => [
                            'type' => $n['action_type'],
                            'data' => json_decode($n['action_data'], true)
                        ],
                        'isRead' => boolval($n['is_read']),
                        'readAt' => $n['read_at'],
                        'createdAt' => $n['created_at']
                    ];
                }, $notifications),
                'unreadCount' => intval($counts['unread']),
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => intval($counts['total']),
                    'totalPages' => ceil(intval($counts['total']) / $limit),
                    'hasNext' => ($page * $limit) < intval($counts['total']),
                    'hasPrev' => $page > 1
                ]
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get notifications error: " . $e->getMessage());
        sendError('Failed to fetch notifications', 500);
    }
}

function markAsRead($db, $id) {
    try {
        $customerId = getCurrentUserId($db);
        
        $sql = "UPDATE retail_notifications 
            SET is_read = 1, read_at = NOW() 
            WHERE id = :id AND customer_id = :customer_id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id, ':customer_id' => $customerId]);
        
        if ($stmt->rowCount() === 0) {
            sendError('Notification not found', 404);
        }
        
        sendResponse([
            'success' => true,
            'message' => 'Notification marked as read'
        ]);
        
    } catch (PDOException $e) {
        error_log("Mark as read error: " . $e->getMessage());
        sendError('Failed to mark as read', 500);
    }
}

function markAllAsRead($db) {
    try {
        $customerId = getCurrentUserId($db);
        
        $sql = "UPDATE retail_notifications 
            SET is_read = 1, read_at = NOW() 
            WHERE customer_id = :customer_id AND is_read = 0";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':customer_id' => $customerId]);
        
        sendResponse([
            'success' => true,
            'message' => 'All notifications marked as read',
            'updatedCount' => $stmt->rowCount()
        ]);
        
    } catch (PDOException $e) {
        error_log("Mark all as read error: " . $e->getMessage());
        sendError('Failed to mark all as read', 500);
    }
}

function deleteNotification($db, $id) {
    try {
        $customerId = getCurrentUserId($db);
        
        $sql = "DELETE FROM retail_notifications 
            WHERE id = :id AND customer_id = :customer_id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id, ':customer_id' => $customerId]);
        
        if ($stmt->rowCount() === 0) {
            sendError('Notification not found', 404);
        }
        
        sendResponse([
            'success' => true,
            'message' => 'Notification deleted'
        ]);
        
    } catch (PDOException $e) {
        error_log("Delete notification error: " . $e->getMessage());
        sendError('Failed to delete notification', 500);
    }
}
