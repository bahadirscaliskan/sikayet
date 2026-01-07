<?php
/**
 * Veri Doğrulama Sınıfı
 */

class Validator {
    /**
     * E-posta doğrulama
     */
    public static function email($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Şifre doğrulama (min 6 karakter)
     */
    public static function password($password) {
        return strlen($password) >= 6;
    }
    
    /**
     * Boş değer kontrolü
     */
    public static function required($value) {
        return !empty(trim($value));
    }
    
    /**
     * Koordinat doğrulama
     */
    public static function latitude($lat) {
        return is_numeric($lat) && $lat >= -90 && $lat <= 90;
    }
    
    public static function longitude($lng) {
        return is_numeric($lng) && $lng >= -180 && $lng <= 180;
    }
    
    /**
     * Genel doğrulama fonksiyonu
     */
    public static function validate($data, $rules) {
        $errors = [];
        
        foreach ($rules as $field => $ruleSet) {
            $rulesArray = explode('|', $ruleSet);
            
            foreach ($rulesArray as $rule) {
                $value = $data[$field] ?? null;
                
                if ($rule === 'required' && !self::required($value)) {
                    $errors[$field][] = ucfirst($field) . ' alanı zorunludur';
                }
                
                if ($rule === 'email' && self::required($value) && !self::email($value)) {
                    $errors[$field][] = 'Geçerli bir e-posta adresi giriniz';
                }
                
                if ($rule === 'password' && self::required($value) && !self::password($value)) {
                    $errors[$field][] = 'Şifre en az 6 karakter olmalıdır';
                }
            }
        }
        
        return empty($errors) ? true : $errors;
    }
}

