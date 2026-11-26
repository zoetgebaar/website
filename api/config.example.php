<?php
// Example of the mail settings. On the server, the deploy workflow writes api/config.php
// from the GitHub secrets SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER and SMTP_PASSWORD.
// Never commit a real config.php.
return [
    'smtp_host' => 'mail.zoetgebaar.be',
    'smtp_port' => 465,
    'smtp_secure' => 'ssl',          // 'ssl' (port 465), 'tls' (port 587) or 'none' (local tests only)
    'smtp_user' => 'info@zoetgebaar.be',
    'smtp_password' => 'wachtwoord-van-de-mailbox',
    'from' => 'info@zoetgebaar.be',
    'to' => 'info@zoetgebaar.be',
];
