<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Validator.php';

$auth = new Auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Sadece POST istekleri kabul edilir', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$validation = Validator::validate($input, [
    'email' => 'required|email',
    'password' => 'required|password',
    'full_name' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$result = $auth->register(
    $input['email'],
    $input['password'],
    $input['full_name'],
    $input['phone'] ?? null
);

if ($result['success']) {
    Response::success($result['user'], $result['message'], 201);
} else {
    Response::error($result['message'], 400);
}

