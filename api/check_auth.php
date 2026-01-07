<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';

$auth = new Auth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Sadece GET istekleri kabul edilir', 405);
}

$user = $auth->checkAuth();

if ($user) {
    Response::success($user, 'Kullanıcı oturum açmış');
} else {
    Response::error('Oturum açılmamış', 401);
}

