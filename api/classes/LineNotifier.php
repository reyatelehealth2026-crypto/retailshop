<?php

class LineNotifier
{
    private $channelAccessToken;

    public function __construct()
    {
        $this->channelAccessToken = (string) getEnvValue('LINE_CHANNEL_ACCESS_TOKEN', '');
    }

    public function isConfigured()
    {
        return $this->channelAccessToken !== '';
    }

    public function pushText($lineUserId, $text)
    {
        if (!$this->isConfigured() || !$lineUserId || !$text) {
            return [
                'success' => false,
                'error' => 'LINE notifier is not configured'
            ];
        }

        $payload = [
            'to' => $lineUserId,
            'messages' => [[
                'type' => 'text',
                'text' => $text
            ]]
        ];

        $ch = curl_init('https://api.line.me/v2/bot/message/push');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->channelAccessToken
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false || $error) {
            return [
                'success' => false,
                'error' => $error ?: 'LINE push failed'
            ];
        }

        return [
            'success' => $httpCode >= 200 && $httpCode < 300,
            'http_code' => $httpCode,
            'response' => $response
        ];
    }

    public function pushOrderConfirmation($lineUserId, $orderNo, $totalAmount)
    {
        return $this->pushText(
            $lineUserId,
            'คำสั่งซื้อ ' . $orderNo . ' ถูกสร้างเรียบร้อยแล้ว ยอดรวม ฿' . number_format((float) $totalAmount, 2)
        );
    }

    public function pushPaymentReceived($lineUserId, $orderNo)
    {
        return $this->pushText(
            $lineUserId,
            'เราได้รับหลักฐานการชำระเงินสำหรับคำสั่งซื้อ ' . $orderNo . ' แล้ว'
        );
    }
}
