<?php

class MailService {
    // SMTP Ayarları
    private $host = 'sandbox.smtp.mailtrap.io';
    private $port = 2525;
    private $username = '5466e83d87f53f';
    private $password = '4a4bc86ae4d28b';
    private $fromEmail = 'hello@example.com';
    private $fromName = 'Şikayet Yönetim Sistemi';

    /**
     * E-posta gönder
     */
    /**
     * E-posta gönder
     */
    public function send($to, $subject, $body) {
        return $this->sendSmtp($to, $subject, $body);
    }

    /**
     * Custom SMTP Client Implementation
     */
    private function sendSmtp($to, $subject, $body) {
        try {
            $socket = fsockopen($this->host, $this->port, $errno, $errstr, 15);
            if (!$socket) {
                return ['success' => false, 'message' => "Bağlantı hatası: $errno - $errstr"];
            }

            $this->readResponse($socket); // Greeting

            $this->sendCommand($socket, "EHLO " . $_SERVER['SERVER_NAME']);
            
            // STARTTLS
            if ($this->port == 587 || $this->port == 2525) { // Mailtrap supports STARTTLS
                $this->sendCommand($socket, "STARTTLS");
                stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                $this->sendCommand($socket, "EHLO " . $_SERVER['SERVER_NAME']); // Resend EHLO after TLS
            }

            // AUTH PLAIN
            $this->sendCommand($socket, "AUTH LOGIN");
            $this->sendCommand($socket, base64_encode($this->username));
            $this->sendCommand($socket, base64_encode($this->password));

            // Mail From & Rcpt To
            $this->sendCommand($socket, "MAIL FROM: <" . $this->fromEmail . ">");
            $this->sendCommand($socket, "RCPT TO: <" . $to . ">");

            // DATA
            $this->sendCommand($socket, "DATA");

            // Headers & Body
            $message = "MIME-Version: 1.0\r\n";
            $message .= "Content-Type: text/html; charset=UTF-8\r\n";
            $message .= "From: " . $this->fromName . " <" . $this->fromEmail . ">\r\n";
            $message .= "To: <" . $to . ">\r\n";
            $message .= "Subject: " . $subject . "\r\n";
            $message .= "\r\n"; // End of headers
            $message .= $body . "\r\n";
            $message .= "."; // End of data

            $this->sendCommand($socket, $message);

            // QUIT
            $this->sendCommand($socket, "QUIT");
            fclose($socket);

            return ['success' => true, 'message' => 'E-posta başarıyla gönderildi'];

        } catch (Exception $e) {
            error_log("SMTP Error: " . $e->getMessage());
            return ['success' => false, 'message' => 'SMTP Hatası: ' . $e->getMessage()];
        }
    }

    private function readResponse($socket) {
        $response = "";
        while ($str = fgets($socket, 515)) {
            $response .= $str;
            if (substr($str, 3, 1) == " ") { break; }
        }
        return $response;
    }

    private function sendCommand($socket, $command) {
        fputs($socket, $command . "\r\n");
        $response = $this->readResponse($socket);
        // Basic error check
        $code = substr($response, 0, 3);
        if ($code >= 400) {
            throw new Exception("SMTP Komut Hatası ($command): $response");
        }
        return $response;
    }
    
    // Doğrulama linki oluşturucu
    public function sendVerificationEmail($to, $token) {
        $link = BASE_URL . "/api/verify_email.php?token=" . $token;
        
        $subject = "E-posta Adresinizi Doğrulayın";
        $body = "
            <h2>Hoşgeldiniz!</h2>
            <p>Hesabınızı doğrulamak için lütfen aşağıdaki linke tıklayın:</p>
            <p><a href='$link'>$link</a></p>
            <br>
            <p>Bu işlemi siz yapmadıysanız, bu e-postayı dikkate almayın.</p>
        ";
        
        return $this->send($to, $subject, $body);
    }
}
