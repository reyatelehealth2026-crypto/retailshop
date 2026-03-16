<?php
/**
 * LINE Login API Endpoint
 * POST /api/auth/line-login
 * 
 * Request Body:
 *   - lineUserId: LINE User ID (required)
 *   - displayName: ชื่อแสดงใน LINE (optional)
 *   - pictureUrl: รูปโปรไฟล์ (optional)
 *   - statusMessage: สถานะ (optional)
 *   - idToken: LINE ID Token สำหรับ verification (optional)
 */

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method !== 'POST') {
        sendError('Method not allowed', 405);
    }
    
    $data = getJsonInput();
    
    // Validate required fields
    validateRequired($data, ['lineUserId']);
    
    $lineUserId = $data['lineUserId'];
    $displayName = isset($data['displayName']) ? $data['displayName'] : null;
    $pictureUrl = isset($data['pictureUrl']) ? $data['pictureUrl'] : null;
    $statusMessage = isset($data['statusMessage']) ? $data['statusMessage'] : null;
    $idToken = isset($data['idToken']) ? $data['idToken'] : null;
    
    // TODO: Verify ID Token with LINE API (for production)
    // For now, we'll trust the client-provided data
    
    // Check if user exists
    $checkStmt = $db->prepare("SELECT * FROM retail_users WHERE line_user_id = :line_user_id");
    $checkStmt->bindValue(':line_user_id', $lineUserId);
    $checkStmt->execute();
    
    $existingUser = $checkStmt->fetch();
    
    if ($existingUser) {
        // Update user info
        $updateStmt = $db->prepare("UPDATE retail_users 
                                     SET line_display_name = :display_name,
                                         line_picture_url = :picture_url,
                                         line_status_message = :status_message,
                                         last_login_at = NOW(),
                                         updated_at = NOW()
                                     WHERE id = :id");
        $updateStmt->bindValue(':display_name', $displayName);
        $updateStmt->bindValue(':picture_url', $pictureUrl);
        $updateStmt->bindValue(':status_message', $statusMessage);
        $updateStmt->bindValue(':id', $existingUser['id']);
        $updateStmt->execute();
        
        $userId = $existingUser['id'];
        $isNewUser = false;
        $memberCode = $existingUser['member_code'];
        $memberTier = $existingUser['member_tier'];
        $memberPoints = $existingUser['member_points'];
    } else {
        // Create new user
        $memberCode = 'MEM' . date('Ymd') . strtoupper(substr(uniqid(), -6));
        
        $insertStmt = $db->prepare("INSERT INTO retail_users 
                                     (line_user_id, line_display_name, line_picture_url, 
                                      line_status_message, member_code, member_tier, 
                                      member_points, member_since, last_login_at, 
                                      is_active, created_at, updated_at)
                                     VALUES
                                     (:line_user_id, :display_name, :picture_url,
                                      :status_message, :member_code, 'bronze',
                                      0, CURDATE(), NOW(),
                                      1, NOW(), NOW())");
        $insertStmt->bindValue(':line_user_id', $lineUserId);
        $insertStmt->bindValue(':display_name', $displayName);
        $insertStmt->bindValue(':picture_url', $pictureUrl);
        $insertStmt->bindValue(':status_message', $statusMessage);
        $insertStmt->bindValue(':member_code', $memberCode);
        $insertStmt->execute();
        
        $userId = $db->lastInsertId();
        $isNewUser = true;
        $memberTier = 'bronze';
        $memberPoints = 0;
    }
    
    // Get cart count
    $cartStmt = $db->prepare("SELECT COUNT(*) as count FROM retail_cart WHERE user_id = :user_id");
    $cartStmt->bindValue(':user_id', $userId);
    $cartStmt->execute();
    $cartCount = $cartStmt->fetch()['count'];
    
    // Get order count
    $orderStmt = $db->prepare("SELECT COUNT(*) as count FROM retail_orders WHERE user_id = :user_id");
    $orderStmt->bindValue(':user_id', $userId);
    $orderStmt->execute();
    $orderCount = $orderStmt->fetch()['count'];
    
    sendResponse([
        'success' => true,
        'message' => $isNewUser ? 'Welcome new user!' : 'Welcome back!',
        'data' => [
            'userId' => $userId,
            'lineUserId' => $lineUserId,
            'displayName' => $displayName,
            'pictureUrl' => $pictureUrl,
            'memberCode' => $memberCode,
            'memberTier' => $memberTier,
            'memberPoints' => intval($memberPoints),
            'isNewUser' => $isNewUser,
            'cartCount' => intval($cartCount),
            'orderCount' => intval($orderCount)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("LINE Login API Error: " . $e->getMessage());
    sendError('Authentication failed', 500, $e->getMessage());
}
