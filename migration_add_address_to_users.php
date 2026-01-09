<?php
require_once __DIR__ . '/config/config.php';

try {
    $db = Database::getInstance()->getConnection();
    
    // Check if column exists
    $stmt = $db->prepare("
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'address'
    ");
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        echo "Adding address column to users table...\n";
        $db->exec("ALTER TABLE users ADD COLUMN address TEXT");
        echo "Address column added successfully.\n";
    } else {
        echo "Address column already exists.\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
