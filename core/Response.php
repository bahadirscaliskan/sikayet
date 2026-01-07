<?php
/**
 * API Yanıt Yardımcı Sınıfı
 */

class Response {
    /**
     * Başarılı yanıt
     */
    public static function success($data = null, $message = 'İşlem başarılı', $code = 200) {
        http_response_code($code);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    /**
     * Hata yanıtı
     */
    public static function error($message = 'Bir hata oluştu', $code = 400, $errors = null) {
        http_response_code($code);
        $response = [
            'success' => false,
            'message' => $message
        ];
        
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    /**
     * Validation hatası
     */
    public static function validationError($errors) {
        self::error('Doğrulama hatası', 422, $errors);
    }
}

