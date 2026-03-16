<?php
/**
 * Authentication API Endpoint
 * POST /api/auth/line-login - LINE Login
 * GET /api/auth/profile - Get user profile
 * PUT /api/auth/profile - Update user profile
 */

require_once __DIR__ . '/../classes/OdooRetailClient.php';

$database = new Database();
$db = $database->getConnection();

switch ($requestMethod) {
    case 'POST':
        if ($action === 'line-login') {
            lineLogin($db);
        } else {
            sendError('Action not found', 404);
        }
        break;
        
    case 'GET':
        if ($action === 'profile') {
            getProfile($db);
        } else {
            sendError('Action not found', 404);
        }
        break;
        
    case 'PUT':
        if ($action === 'profile') {
            updateProfile($db);
        } else {
            sendError('Action not found', 404);
        }
        break;
        
    default:
        sendError('Method not allowed', 405);
}

function lineLogin($db) {
    try {
        $data = getJsonInput();
        
        // Validate required fields
        $required = ['lineUserId', 'idToken'];
        $missing = validateRequired($data, $required);
        
        if (!empty($missing)) {
            sendError('Missing required fields: ' . implode(', ', $missing), 400);
        }
        
        $lineUserId = $data['lineUserId'];
        $idToken = $data['idToken'];
        $displayName = $data['displayName'] ?? null;
        $pictureUrl = $data['pictureUrl'] ?? null;
        $statusMessage = $data['statusMessage'] ?? null;
        $identity = verifyLineIdentity($idToken, $lineUserId);
        $displayName = $displayName ?: ($identity['name'] ?? null);
        $pictureUrl = $pictureUrl ?: ($identity['picture'] ?? null);

        // In production, verify the ID token with LINE API
        // For now, we'll trust the frontend verification
        
        // Check if user exists
        $checkSql = "SELECT id, line_user_id, line_display_name, line_picture_url, 
            first_name, last_name, phone, email, member_code, member_tier, member_points,
            is_active, created_at, odoo_partner_id, odoo_partner_code
        FROM retail_customers WHERE line_user_id = :line_user_id";
        
        $checkStmt = $db->prepare($checkSql);
        $checkStmt->execute([':line_user_id' => $lineUserId]);
        $existingUser = $checkStmt->fetch();
        
        if ($existingUser) {
            $updateSql = "UPDATE retail_customers SET 
                line_display_name = :display_name,
                line_picture_url = :picture_url,
                line_status_message = :status_message,
                last_login_at = NOW(),
                updated_at = NOW()
            WHERE line_user_id = :line_user_id";
            
            $updateStmt = $db->prepare($updateSql);
            $updateStmt->execute([
                ':display_name' => $displayName,
                ':picture_url' => $pictureUrl,
                ':status_message' => $statusMessage,
                ':line_user_id' => $lineUserId
            ]);
            
            $user = $existingUser;
            $isNewUser = false;
        } else {
            $memberCode = generateMemberCode();
            
            $insertSql = "INSERT INTO retail_customers (
                line_user_id, line_display_name, line_picture_url, line_status_message,
                member_code, member_tier, member_points, member_since, is_active, last_login_at
            ) VALUES (
                :line_user_id, :display_name, :picture_url, :status_message,
                :member_code, 'standard', 0, CURDATE(), 1, NOW()
            )";
            
            $insertStmt = $db->prepare($insertSql);
            $insertStmt->execute([
                ':line_user_id' => $lineUserId,
                ':display_name' => $displayName,
                ':picture_url' => $pictureUrl,
                ':status_message' => $statusMessage,
                ':member_code' => $memberCode
            ]);
            
            $userId = $db->lastInsertId();
            
            $userSql = "SELECT id, line_user_id, line_display_name, line_picture_url,
                first_name, last_name, phone, email, member_code, member_tier, member_points,
                is_active, created_at, odoo_partner_id, odoo_partner_code
            FROM retail_customers WHERE id = :id";
            
            $userStmt = $db->prepare($userSql);
            $userStmt->execute([':id' => $userId]);
            $user = $userStmt->fetch();
            $isNewUser = true;
        }
        
        $token = issueAuthToken([
            'userId' => $user['id'],
            'lineUserId' => $user['line_user_id'],
            'scope' => 'customer'
        ]);
        $stats = getCustomerStats($db, intval($user['id']));
        
        sendResponse([
            'success' => true,
            'data' => [
                'user' => formatUser(array_merge($user, $stats)),
                'token' => $token,
                'isNewUser' => $isNewUser
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Line login error: " . $e->getMessage());
        sendError('Failed to process login', 500);
    }
}

function getProfile($db) {
    try {
        $userId = requireAuthenticatedCustomerId();
        
        $sql = "SELECT id, line_user_id, line_display_name, line_picture_url,
            first_name, last_name, phone, email, date_of_birth, gender,
            member_code, member_tier, member_points, member_since, odoo_partner_id, odoo_partner_code,
            is_active, created_at
        FROM retail_customers WHERE id = :id AND is_active = 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendError('User not found', 404);
        }
        
        // Get addresses
        $addrSql = "SELECT id, address_type, is_default, recipient_name, recipient_phone,
            address_line1, address_line2, province, district, subdistrict, postal_code,
            delivery_note
        FROM retail_customer_addresses WHERE customer_id = :customer_id";
        
        $addrStmt = $db->prepare($addrSql);
        $addrStmt->execute([':customer_id' => $userId]);
        $addresses = $addrStmt->fetchAll();
        $stats = getCustomerStats($db, intval($userId));
        
        sendResponse([
            'success' => true,
            'data' => [
                'user' => formatUser(array_merge($user, $stats)),
                'addresses' => array_map(function($a) {
                    return [
                        'id' => intval($a['id']),
                        'type' => $a['address_type'],
                        'isDefault' => boolval($a['is_default']),
                        'recipientName' => $a['recipient_name'],
                        'recipientPhone' => $a['recipient_phone'],
                        'addressLine1' => $a['address_line1'],
                        'addressLine2' => $a['address_line2'],
                        'province' => $a['province'],
                        'district' => $a['district'],
                        'subdistrict' => $a['subdistrict'],
                        'postalCode' => $a['postal_code'],
                        'deliveryNote' => $a['delivery_note']
                    ];
                }, $addresses)
            ]
        ]);
        
    } catch (PDOException $e) {
        error_log("Get profile error: " . $e->getMessage());
        sendError('Failed to fetch profile', 500);
    }
}

function updateProfile($db) {
    try {
        $userId = requireAuthenticatedCustomerId();
        $data = getJsonInput();
        
        // Build update query
        $allowedFields = ['first_name', 'last_name', 'phone', 'email', 'date_of_birth', 'gender'];
        $updates = [];
        $params = [':id' => $userId];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }
        
        if (empty($updates)) {
            sendError('No fields to update', 400);
        }
        
        $sql = "UPDATE retail_customers SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        // Return updated profile
        getProfile($db);
        
    } catch (PDOException $e) {
        error_log("Update profile error: " . $e->getMessage());
        sendError('Failed to update profile', 500);
    }
}

function generateMemberCode() {
    $prefix = 'RY';
    $year = date('y');
    $random = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6));
    return $prefix . $year . $random;
}

function getCustomerStats($db, $userId) {
    $cartStmt = $db->prepare("SELECT COALESCE(SUM(quantity), 0) as total_quantity FROM retail_cart WHERE customer_id = :customer_id");
    $cartStmt->execute([':customer_id' => $userId]);
    $cartCount = intval($cartStmt->fetch()['total_quantity'] ?? 0);

    $orderStmt = $db->prepare("SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_amount FROM retail_orders WHERE customer_id = :customer_id");
    $orderStmt->execute([':customer_id' => $userId]);
    $orders = $orderStmt->fetch();

    return [
        'cart_count' => $cartCount,
        'order_count' => intval($orders['total_orders'] ?? 0),
        'total_spent' => floatval($orders['total_amount'] ?? 0)
    ];
}

function verifyLineIdentity($idToken, $lineUserId) {
    $channelId = getEnvValue('LINE_LOGIN_CHANNEL_ID', getEnvValue('LINE_CHANNEL_ID', ''));
    if ($channelId) {
        $ch = curl_init('https://api.line.me/oauth2/v2.1/verify');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'id_token' => $idToken,
                'client_id' => $channelId
            ]),
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded'
            ]
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response !== false && !$error) {
            $decoded = json_decode($response, true);
            if ($httpCode >= 200 && $httpCode < 300 && is_array($decoded)) {
                if (!empty($decoded['sub']) && $decoded['sub'] !== $lineUserId) {
                    sendError('LINE identity mismatch', 401);
                }
                return $decoded;
            }
        }
    }

    $parts = explode('.', $idToken);
    if (count($parts) < 2) {
        sendError('Invalid LINE token', 401);
    }
    $payload = json_decode(base64UrlDecode($parts[1]), true);
    if (!is_array($payload)) {
        sendError('Invalid LINE token', 401);
    }
    if (!empty($payload['sub']) && $payload['sub'] !== $lineUserId) {
        sendError('LINE identity mismatch', 401);
    }
    if (!empty($payload['exp']) && time() >= intval($payload['exp'])) {
        sendError('LINE token expired', 401);
    }
    return $payload;
}

function formatUser($user) {
    return [
        'id' => intval($user['id']),
        'lineUserId' => $user['line_user_id'],
        'displayName' => $user['line_display_name'],
        'pictureUrl' => $user['line_picture_url'],
        'firstName' => $user['first_name'],
        'lastName' => $user['last_name'],
        'phone' => $user['phone'],
        'email' => $user['email'],
        'dateOfBirth' => $user['date_of_birth'],
        'gender' => $user['gender'],
        'memberCode' => $user['member_code'],
        'memberLevel' => $user['member_tier'],
        'memberTier' => $user['member_tier'],
        'memberPoints' => intval($user['member_points']),
        'points' => intval($user['member_points']),
        'memberSince' => $user['member_since'],
        'cartCount' => intval($user['cart_count'] ?? 0),
        'orderCount' => intval($user['order_count'] ?? 0),
        'totalSpent' => floatval($user['total_spent'] ?? 0),
        'odooPartnerId' => !empty($user['odoo_partner_id']) ? intval($user['odoo_partner_id']) : null,
        'odooPartnerCode' => $user['odoo_partner_code'] ?? null,
        'isActive' => boolval($user['is_active']),
        'createdAt' => $user['created_at']
    ];
}
