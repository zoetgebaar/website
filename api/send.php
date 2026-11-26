<?php
// Receives the order form (bestellen.html) and the business form (bedrijven.html)
// and mails them to the Zoet Gebaar mailbox over SMTP. Settings live in api/config.php,
// which the deploy workflow writes from GitHub secrets and which is never committed.
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/lib/PHPMailer/Exception.php';
require __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/lib/PHPMailer/SMTP.php';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT = 5;          // submissions per IP address
const RATE_WINDOW = 600;       // seconds
const LOGO_TYPES = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/svg+xml' => 'svg', 'application/pdf' => 'pdf'];

final class FormError extends RuntimeException {}

$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, string $message, int $status, bool $json, string $redirect = ''): void
{
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($ok && $redirect !== '') {
        header('Location: ' . $redirect, true, 303);
        exit;
    }
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="nl"><meta charset="utf-8"><title>Zoet Gebaar</title><p>'
        . htmlspecialchars($message, ENT_QUOTES, 'UTF-8')
        . '</p><p><a href="../index.html">Terug naar de website</a></p></html>';
    exit;
}

function textLength(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function field(string $name, int $max, bool $required = false, string $label = ''): string
{
    $value = $_POST[$name] ?? '';
    if (!is_string($value)) {
        throw new FormError('Ongeldige invoer.');
    }
    $value = trim(str_replace(["\r\n", "\r"], "\n", $value));
    if ($required && $value === '') {
        throw new FormError(($label ?: ucfirst($name)) . ' is verplicht.');
    }
    if (textLength($value) > $max) {
        throw new FormError(($label ?: ucfirst($name)) . ' is te lang.');
    }
    return $value;
}

function oneLine(string $value): string
{
    return trim((string) preg_replace('/\s+/u', ' ', $value));
}

function choice(string $name, array $allowed, string $label): string
{
    $value = field($name, 100, true, $label);
    if (!in_array($value, $allowed, true)) {
        throw new FormError('Kies een geldige waarde voor ' . strtolower($label) . '.');
    }
    return $value;
}

function money(int $cents): string
{
    return '€ ' . number_format($cents / 100, 2, ',', '.');
}

function rateLimited(): bool
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'onbekend';
    $file = sys_get_temp_dir() . '/zoetgebaar-rate-' . sha1($ip);
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $stored = json_decode((string) @file_get_contents($file), true);
        if (is_array($stored)) {
            $hits = array_values(array_filter($stored, static fn($t) => is_int($t) && $t > $now - RATE_WINDOW));
        }
    }
    if (count($hits) >= RATE_LIMIT) {
        return true;
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
    return false;
}

/** @return array<int, array{0: string, 1: string}> */
function orderMail(): array
{
    $content = json_decode((string) @file_get_contents(__DIR__ . '/../data/content.json'), true);
    if (!is_array($content) || !isset($content['products']) || !is_array($content['products'])) {
        throw new RuntimeException('content.json kon niet worden gelezen.');
    }
    $products = [];
    foreach ($content['products'] as $product) {
        $products[$product['id']] = $product;
    }

    $items = json_decode(field('items', 2000, true, 'De bestelling'), true);
    if (!is_array($items) || $items === [] || count($items) > count($products)) {
        throw new FormError('Kies minstens één doosje.');
    }
    $lines = [];
    $total = 0;
    $unknown = false;
    $seen = [];
    foreach ($items as $item) {
        $id = is_array($item) ? ($item['id'] ?? null) : null;
        $qty = is_array($item) ? ($item['qty'] ?? null) : null;
        if (!is_string($id) || !isset($products[$id]) || isset($seen[$id]) || !is_int($qty) || $qty < 1 || $qty > 50) {
            throw new FormError('De bestelling bevat een ongeldig doosje of aantal.');
        }
        $seen[$id] = true;
        $p = $products[$id];
        if (empty($p['available'])) {
            throw new FormError($p['name'] . ' is tijdelijk niet beschikbaar.');
        }
        $mix = $p['mix'] === 'gewoon' ? 'met gelatine' : 'gelatinevrij';
        $price = $p['priceCents'];
        if ($price === null) {
            $unknown = true;
            $lines[] = sprintf('%d x %s, %s, %d gram (prijs volgt)', $qty, $p['name'], $mix, $p['weightGrams']);
        } else {
            $total += $price * $qty;
            $lines[] = sprintf('%d x %s, %s, %d gram (%s)', $qty, $p['name'], $mix, $p['weightGrams'], money($price * $qty));
        }
    }

    return [
        ['Naam', oneLine(field('naam', 100, true, 'Je naam'))],
        ['Mailadres', ''],
        ['Telefoon', oneLine(field('telefoon', 40)) ?: 'Niet opgegeven'],
        ['Bestelling', implode("\n", $lines)],
        ['Totaal', $unknown ? 'Prijs volgt voor een of meer doosjes' : money($total)],
        ['Kaartje', field('kaartje', 200) ?: 'Geen boodschap'],
        ['Afhalen', field('afhalen', 300) ?: 'Nog af te spreken'],
    ];
}

/** @return array<int, array{0: string, 1: string}> */
function businessMail(): array
{
    $aantal = field('aantal', 6, true, 'Het aantal doosjes');
    if (!preg_match('/^\d+$/', $aantal) || (int) $aantal < 1 || (int) $aantal > 5000) {
        throw new FormError('Vul een aantal tussen 1 en 5000 in.');
    }
    $datum = field('datum', 10);
    if ($datum !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $datum)) {
        throw new FormError('De datum is ongeldig.');
    }
    $kleur = choice('lintkleur', ['Rood', 'Roze', 'Zwart', 'Goud', 'Groen', 'Blauw', 'Wit', 'Andere kleur'], 'Kleur van het lint');
    if ($kleur === 'Andere kleur') {
        $kleur = 'Andere kleur: ' . oneLine(field('lintkleur_anders', 100, true, 'De gewenste lintkleur'));
    }

    return [
        ['Bedrijf', oneLine(field('bedrijf', 150, true, 'De bedrijfsnaam'))],
        ['Contactpersoon', oneLine(field('contactpersoon', 100, true, 'De contactpersoon'))],
        ['Mailadres', ''],
        ['Telefoon', oneLine(field('telefoon', 40)) ?: 'Niet opgegeven'],
        ['Aantal doosjes', $aantal],
        ['Gewenste datum', $datum !== '' ? date('d/m/Y', (int) strtotime($datum)) : 'Niet opgegeven'],
        ['Formaat', choice('formaat', ['Weet ik nog niet', 'Klein doosje (350 gram)', 'Middelgroot doosje (500 gram)', 'Groot doosje (800 gram)', 'Een mix van formaten'], 'Formaat')],
        ['Snoepmix', choice('snoepmix', ['Weet ik nog niet', 'Met gelatine', 'Gelatinevrij', 'Allebei'], 'Snoepmix')],
        ['Lintkleur', $kleur],
        ['Bericht', field('bericht', 2000) ?: 'Geen bericht'],
    ];
}

/** @return array{path: string, name: string}|null */
function uploadedLogo(): ?array
{
    $file = $_FILES['logo'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE || (int) $file['size'] > MAX_LOGO_BYTES) {
        throw new FormError('Het logo is groter dan 5 MB.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        throw new FormError('Het logo kon niet worden opgeladen.');
    }
    $type = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if ($type === 'text/xml' || $type === 'image/svg') {
        $type = 'image/svg+xml';
    }
    if (!isset(LOGO_TYPES[$type])) {
        throw new FormError('Het logo moet een PNG, JPG, SVG of PDF zijn.');
    }
    return ['path' => $file['tmp_name'], 'name' => 'logo.' . LOGO_TYPES[$type]];
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Dit adres verwerkt enkel formulieren.', 405, $wantsJson);
}

$type = $_POST['type'] ?? '';
$back = $type === 'bedrijf' ? '../bedrijven.html?verzonden=1#aanvraag' : '../bestellen.html';

// Bots fill in the hidden "website" field; pretend all went well.
if (($_POST['website'] ?? '') !== '') {
    respond(true, 'Bedankt.', 200, $wantsJson, $back);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(false, 'Het formulier is nog niet ingesteld. Mail ons via info@zoetgebaar.be.', 503, $wantsJson);
}
$config = require $configFile;

if (rateLimited()) {
    respond(false, 'Je hebt al enkele berichten verstuurd. Probeer het binnen tien minuten opnieuw.', 429, $wantsJson);
}

try {
    if ($type !== 'bestelling' && $type !== 'bedrijf') {
        throw new FormError('Onbekend formulier.');
    }
    $email = field('email', 200, true, 'Je mailadres');
    if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        throw new FormError('Vul een geldig mailadres in.');
    }
    $rows = $type === 'bestelling' ? orderMail() : businessMail();
    foreach ($rows as $i => $row) {
        if ($row[0] === 'Mailadres') {
            $rows[$i][1] = $email;
        }
    }
    $logo = $type === 'bedrijf' ? uploadedLogo() : null;
    $replyName = $rows[0][1];
    $subject = $type === 'bestelling'
        ? 'Nieuwe bestelling van ' . $replyName
        : 'Nieuwe aanvraag van ' . $rows[0][1];
} catch (FormError $error) {
    respond(false, $error->getMessage(), 422, $wantsJson);
} catch (Throwable $error) {
    error_log('Zoet Gebaar formulier: ' . $error->getMessage());
    respond(false, 'Er ging iets mis. Mail ons via info@zoetgebaar.be.', 500, $wantsJson);
}

$html = '<table cellpadding="8" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">';
$text = '';
foreach ($rows as [$label, $value]) {
    $html .= '<tr><th align="left" valign="top" style="border-bottom:1px solid #e2d2bd">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8')
        . '</th><td style="border-bottom:1px solid #e2d2bd">' . nl2br(htmlspecialchars($value, ENT_QUOTES, 'UTF-8')) . '</td></tr>';
    $text .= $label . ":\n" . $value . "\n\n";
}
$html .= '</table>';

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = (string) $config['smtp_host'];
    $mail->Port = (int) ($config['smtp_port'] ?? 465);
    $mail->SMTPAuth = true;
    $mail->Username = (string) $config['smtp_user'];
    $mail->Password = (string) $config['smtp_password'];
    $secure = $config['smtp_secure'] ?? 'ssl';
    if ($secure === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } elseif ($secure === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPSecure = '';
        $mail->SMTPAutoTLS = false;
    }
    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->setFrom((string) ($config['from'] ?? $config['smtp_user']), 'Website Zoet Gebaar');
    $mail->addAddress((string) ($config['to'] ?? 'info@zoetgebaar.be'));
    $mail->addReplyTo($email, $replyName);
    $mail->Subject = $subject;
    $mail->isHTML(true);
    $mail->Body = $html;
    $mail->AltBody = $text;
    if ($logo !== null) {
        $mail->addAttachment($logo['path'], $logo['name']);
    }
    $mail->send();
} catch (MailException $error) {
    error_log('Zoet Gebaar SMTP: ' . $error->getMessage());
    respond(false, 'Versturen lukte niet. Probeer het opnieuw of mail ons via info@zoetgebaar.be.', 502, $wantsJson);
}

respond(true, 'Bedankt, we hebben alles goed ontvangen.', 200, $wantsJson, $back);
