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
    'password' => 'required'
]);

if ($validation !== true) {
    Response::validationError($validation);
}

$result = $auth->login($input['email'], $input['password']);

if ($result['success']) {
    Response::success($result['user'], $result['message']);
} else {
    Response::error($result['message'], 401);
}

