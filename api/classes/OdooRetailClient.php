<?php

class OdooRetailClient
{
    private $baseUrl;
    private $apiUser;
    private $userToken;
    private $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) getEnvValue('ODOO_API_BASE_URL', ''), '/');
        $this->apiUser = (string) getEnvValue('CNY_ODOO_API_USER', '');
        $this->userToken = (string) getEnvValue('CNY_ODOO_USER_TOKEN', '');
        $this->timeout = (int) getEnvValue('ODOO_API_TIMEOUT', 30);
    }

    public function isConfigured()
    {
        return $this->baseUrl !== '' && $this->apiUser !== '' && $this->userToken !== '';
    }

    public function getProductsByRange($offset = 1, $limit = 20)
    {
        if (!$this->isConfigured()) {
            throw new Exception('Odoo product API is not configured');
        }

        $offset = max(1, (int) $offset);
        $limit = max(1, min(50, (int) $limit));
        $products = [];

        for ($i = $offset; $i < $offset + $limit; $i++) {
            $code = str_pad((string) $i, 4, '0', STR_PAD_LEFT);
            $response = $this->request('POST', '/ineco_gc/get_product', ['PRODUCT_CODE' => $code]);
            if (($response['success'] ?? false) && !empty($response['data']['products']) && is_array($response['data']['products'])) {
                foreach ($response['data']['products'] as $product) {
                    $products[] = $this->normalizeProduct($product);
                }
            }
        }

        return [
            'products' => $products,
            'offset' => $offset,
            'limit' => $limit,
            'count' => count($products)
        ];
    }

    public function linkUser($lineUserId, $phone = null, $customerCode = null, $email = null)
    {
        $payload = ['line_user_id' => $lineUserId];
        if ($phone) {
            $payload['phone'] = $phone;
        }
        if ($customerCode) {
            $payload['customer_code'] = $customerCode;
        }
        if ($email) {
            $payload['email'] = $email;
        }
        return $this->request('POST', '/reya/user/link', $payload);
    }

    public function getUserProfile($lineUserId)
    {
        return $this->request('POST', '/reya/user/profile', ['line_user_id' => $lineUserId]);
    }

    public function createSaleOrder(array $orderData)
    {
        return $this->request('POST', '/ineco_gc/create_sale_order', $orderData);
    }

    public function createSimpleSaleOrder($orderRef, $partnerId, $partnerCode, array $items, array $options = [])
    {
        $sumSubtotal = 0;
        $orderLines = [];

        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            if ($productId <= 0) {
                continue;
            }
            $qty = (float) ($item['qty'] ?? 1);
            $priceUnit = (float) ($item['price_unit'] ?? 0);
            $discount = (float) ($item['discount'] ?? 0);
            $subtotal = $qty * $priceUnit;
            $subtotalAfterDiscount = $subtotal * (1 - $discount / 100);
            $orderLines[] = [
                'product_id' => $productId,
                'qty' => $qty,
                'price_unit' => $priceUnit,
                'discount' => $discount,
                'price_subtotal' => $subtotalAfterDiscount
            ];
            $sumSubtotal += $subtotalAfterDiscount;
        }

        if (empty($orderLines)) {
            return [
                'success' => false,
                'error' => 'No Odoo-linked products found in order items'
            ];
        }

        $discountAmount = (float) ($options['discount_amount'] ?? 0);
        $deliveryFee = (float) ($options['delivery_fee'] ?? 0);
        $amountAfterDiscount = $sumSubtotal - $discountAmount + $deliveryFee;
        $amountUntax = round($amountAfterDiscount / 1.07, 2);
        $taxed = round($amountAfterDiscount - $amountUntax, 2);

        $orderData = [
            'order_ref' => $orderRef,
            'marketplace' => $options['marketplace'] ?? 'LINE',
            'marketplace_shop_name' => $options['marketplace_shop_name'] ?? 'RE-YA Retail',
            'payment_data' => $options['payment_data'] ?? 'COD',
            'customer_order' => [
                'partner_id' => (int) $partnerId,
                'partner_code' => $partnerCode
            ],
            'customer_delivery_address' => [
                'partner_shipping_address_id' => $options['shipping_address_id'] ?? (int) $partnerId,
                'partner_shipping_address_code' => $options['shipping_address_code'] ?? ($partnerCode . '-01')
            ],
            'order_line' => $orderLines,
            'order_bottom_amount' => [[
                'sum_price_subtotal' => $sumSubtotal,
                'discount_amount' => $discountAmount,
                'amount_after_discount' => $amountAfterDiscount,
                'amount_untax' => $amountUntax,
                'taxed' => $taxed,
                'total_amount' => $amountAfterDiscount
            ]]
        ];

        return $this->createSaleOrder($orderData);
    }

    public function syncProducts(PDO $db, $offset = 1, $limit = 50)
    {
        $result = $this->getProductsByRange($offset, $limit);
        $products = $result['products'] ?? [];
        $saved = 0;
        $categoryMap = [];

        $db->beginTransaction();

        $stmt = $db->prepare("INSERT INTO retail_products (
            odoo_product_id, sku, barcode, name, description, short_description,
            retail_price, original_price, stock_qty, stock_status,
            category_id, category_name, image_url,
            brand, manufacturer,
            is_retail_active, is_featured, is_new_arrival, is_best_seller,
            sort_order, last_sync_at
        ) VALUES (
            :odoo_product_id, :sku, :barcode, :name, :description, :short_description,
            :retail_price, :original_price, :stock_qty, :stock_status,
            :category_id, :category_name, :image_url,
            :brand, :manufacturer,
            :is_retail_active, :is_featured, :is_new_arrival, :is_best_seller,
            :sort_order, NOW()
        ) ON DUPLICATE KEY UPDATE
            barcode = VALUES(barcode),
            name = VALUES(name),
            description = VALUES(description),
            short_description = VALUES(short_description),
            retail_price = VALUES(retail_price),
            original_price = VALUES(original_price),
            stock_qty = VALUES(stock_qty),
            stock_status = VALUES(stock_status),
            category_id = VALUES(category_id),
            category_name = VALUES(category_name),
            image_url = VALUES(image_url),
            brand = VALUES(brand),
            manufacturer = VALUES(manufacturer),
            is_retail_active = VALUES(is_retail_active),
            is_featured = VALUES(is_featured),
            is_new_arrival = VALUES(is_new_arrival),
            is_best_seller = VALUES(is_best_seller),
            sort_order = VALUES(sort_order),
            last_sync_at = NOW()");

        foreach ($products as $index => $product) {
            $categoryId = $this->resolveCategoryId($db, $categoryMap, $product['category'] ?? '');
            $stockQty = (float) ($product['saleable_qty'] ?? 0);
            $retailPrice = (float) ($product['online_price'] ?? 0);
            $originalPrice = (float) ($product['list_price'] ?? 0);
            if ($retailPrice <= 0) {
                $retailPrice = $originalPrice;
            }
            $stmt->execute([
                ':odoo_product_id' => !empty($product['product_id']) ? intval($product['product_id']) : null,
                ':sku' => (string) (!empty($product['sku']) ? $product['sku'] : ($product['product_code'] ?? '')),
                ':barcode' => (string) ($product['barcode'] ?? ''),
                ':name' => (string) ($product['name'] ?? ''),
                ':description' => (string) ($product['generic_name'] ?? $product['name'] ?? ''),
                ':short_description' => (string) ($product['generic_name'] ?? ''),
                ':retail_price' => $retailPrice,
                ':original_price' => $originalPrice,
                ':stock_qty' => $stockQty,
                ':stock_status' => $stockQty <= 0 ? 'out_of_stock' : ($stockQty <= 10 ? 'low_stock' : 'in_stock'),
                ':category_id' => $categoryId,
                ':category_name' => (string) ($product['category'] ?? ''),
                ':image_url' => (string) ($product['image_url'] ?? ''),
                ':brand' => (string) ($product['brand'] ?? ''),
                ':manufacturer' => (string) ($product['manufacturer'] ?? ''),
                ':is_retail_active' => !empty($product['active']) ? 1 : 0,
                ':is_featured' => $index < 8 ? 1 : 0,
                ':is_new_arrival' => $index < 12 ? 1 : 0,
                ':is_best_seller' => $index < 8 ? 1 : 0,
                ':sort_order' => $index + 1,
            ]);
            $saved++;
        }

        $db->commit();

        return [
            'success' => true,
            'fetched' => count($products),
            'saved' => $saved,
            'offset' => $offset,
            'limit' => $limit
        ];
    }

    private function resolveCategoryId(PDO $db, array &$categoryMap, $categoryName)
    {
        $name = trim((string) $categoryName);
        if ($name === '') {
            return null;
        }
        if (isset($categoryMap[$name])) {
            return $categoryMap[$name];
        }

        $lookup = $db->prepare('SELECT id FROM retail_categories WHERE name = :name LIMIT 1');
        $lookup->execute([':name' => $name]);
        $existingId = $lookup->fetchColumn();
        if ($existingId) {
            $categoryMap[$name] = (int) $existingId;
            return (int) $existingId;
        }

        $insert = $db->prepare('INSERT INTO retail_categories (name, sort_order, is_active) VALUES (:name, :sort_order, 1)');
        $insert->execute([
            ':name' => $name,
            ':sort_order' => count($categoryMap) + 1
        ]);
        $categoryMap[$name] = (int) $db->lastInsertId();
        return $categoryMap[$name];
    }

    private function normalizeProduct(array $product)
    {
        $prices = $product['product_price_ids'] ?? [];
        $onlinePrice = null;
        if (is_array($prices)) {
            foreach ($prices as $row) {
                if (($row['price_code'] ?? '') === '005') {
                    $onlinePrice = (float) ($row['price'] ?? 0);
                    break;
                }
            }
        }

        return [
            'product_id' => $product['product_id'] ?? null,
            'product_code' => $product['product_code'] ?? '',
            'sku' => !empty($product['sku']) ? $product['sku'] : ($product['product_code'] ?? ''),
            'name' => $product['name'] ?? '',
            'generic_name' => $product['generic_name'] ?? '',
            'barcode' => $product['barcode'] ?? '',
            'category' => $product['category'] ?? '',
            'list_price' => (float) ($product['list_price'] ?? 0),
            'online_price' => $onlinePrice,
            'saleable_qty' => (float) ($product['saleable_qty'] ?? 0),
            'active' => !empty($product['active']),
            'brand' => $product['brand'] ?? '',
            'manufacturer' => $product['manufacturer'] ?? '',
            'image_url' => $product['image_url'] ?? ''
        ];
    }

    private function request($method, $endpoint, array $data = null)
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'error' => 'Odoo credentials are not configured'
            ];
        }

        $ch = curl_init($this->baseUrl . $endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'Api-User: ' . $this->apiUser,
                'User-Token: ' . $this->userToken
            ]
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            }
        }

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false || $error) {
            return [
                'success' => false,
                'error' => $error ?: 'Network error'
            ];
        }

        $decoded = json_decode($response, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            return [
                'success' => false,
                'error' => 'Invalid JSON response',
                'raw' => substr((string) $response, 0, 500)
            ];
        }

        if (isset($decoded['jsonrpc']) && isset($decoded['result'])) {
            return [
                'success' => true,
                'http_code' => $httpCode,
                'data' => $decoded['result']
            ];
        }

        if (isset($decoded['jsonrpc']) && isset($decoded['error'])) {
            return [
                'success' => false,
                'http_code' => $httpCode,
                'error' => $decoded['error']['message'] ?? 'Unknown Odoo error',
                'data' => $decoded['error']
            ];
        }

        return [
            'success' => $httpCode >= 200 && $httpCode < 300,
            'http_code' => $httpCode,
            'data' => $decoded
        ];
    }
}
