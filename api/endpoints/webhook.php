<?php

switch ($requestMethod) {
    case 'POST':
        if ($action === 'odoo-status') {
            require_once __DIR__ . '/../webhook/odoo-status.php';
        } else {
            sendError('Action not found', 404);
        }
        break;

    default:
        sendError('Method not allowed', 405);
}
