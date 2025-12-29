<?php
/**
 * FileHub API - Backend para o PWA
 * Coloque este arquivo em seu servidor PHP (ex: filehub.space/api/api.php)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuracao do banco de dados
$dbConfig = [
    'host' => '157.230.211.234',
    'user' => 'filehub',
    'password' => 'Mel102424!@#',
    'database' => 'filehub'
];

// Conecta ao banco
try {
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};dbname={$dbConfig['database']};charset=utf8mb4",
        $dbConfig['user'],
        $dbConfig['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro de conexao com o banco de dados']);
    exit;
}

// Roteamento
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin($pdo);
        break;
    case 'ferramentas':
        handleFerramentas($pdo);
        break;
    case 'decrypt':
        handleDecrypt();
        break;
    default:
        echo json_encode(['error' => 'Acao invalida', 'actions' => ['login', 'ferramentas', 'decrypt']]);
}

// === HANDLERS ===

function handleLogin($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        echo json_encode(['success' => false, 'error' => 'E-mail e senha sao obrigatorios']);
        return;
    }

    // Busca usuario
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'error' => 'E-mail ou senha incorretos']);
        return;
    }

    // Verifica senha (bcrypt)
    if (!password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'error' => 'E-mail ou senha incorretos']);
        return;
    }

    // Verifica status
    $statusMessages = [
        'desativado' => 'Sua conta foi desativada. Entre em contato com o suporte.',
        'banido' => 'Sua conta foi banida por violacao dos termos de uso.',
        'inadimplente' => 'Sua conta esta inadimplente. Regularize seu pagamento.',
        'trial' => 'Seu periodo de teste expirou. Assine um plano para continuar.'
    ];

    if (isset($user['status']) && $user['status'] !== 'ativo') {
        $msg = $statusMessages[$user['status']] ?? 'Sua conta nao esta ativa.';
        echo json_encode(['success' => false, 'error' => $msg, 'statusBlocked' => true]);
        return;
    }

    // Verifica expiracao
    if ($user['data_expiracao']) {
        $expiry = strtotime($user['data_expiracao']);
        if ($expiry < strtotime('today')) {
            echo json_encode([
                'success' => false,
                'error' => 'Sua assinatura expirou em ' . date('d/m/Y', $expiry),
                'expired' => true
            ]);
            return;
        }
    }

    // Atualiza last_seen_at
    $stmt = $pdo->prepare('UPDATE users SET last_seen_at = NOW() WHERE id = ?');
    $stmt->execute([$user['id']]);

    // Nomes dos planos
    $planoNames = [
        1 => 'Basico', 2 => 'Premium', 3 => 'Plus', 4 => 'Elite',
        5 => 'Colaborador', 6 => 'Gratuito', 7 => 'Desativado',
        8 => 'Admin', 9 => 'Start', 10 => 'Go'
    ];

    // Remove senha e retorna
    unset($user['password']);
    $user['plano_nome'] = $planoNames[$user['plano_id']] ?? 'Desconhecido';

    // Gera token simples (em producao, use JWT)
    $token = base64_encode(json_encode([
        'user_id' => $user['id'],
        'plano_id' => $user['plano_id'],
        'nivel_acesso' => $user['nivel_acesso'],
        'exp' => time() + 86400 // 24 horas
    ]));

    echo json_encode([
        'success' => true,
        'user' => $user,
        'token' => $token
    ]);
}

function handleFerramentas($pdo) {
    // Verifica token
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? '';
    $token = str_replace('Bearer ', '', $token);

    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Token nao fornecido']);
        return;
    }

    $tokenData = json_decode(base64_decode($token), true);
    if (!$tokenData || $tokenData['exp'] < time()) {
        http_response_code(401);
        echo json_encode(['error' => 'Token invalido ou expirado']);
        return;
    }

    $userId = $tokenData['user_id'];
    $planoId = $tokenData['plano_id'];
    $nivelAcesso = $tokenData['nivel_acesso'];

    // Admin, colaborador ou moderador tem acesso total
    $isAdmin = $nivelAcesso === 'admin' || $planoId == 8;
    $isColaborador = $nivelAcesso === 'colaborador' || $planoId == 5;
    $isModerador = $nivelAcesso === 'moderador';

    // Busca todas as ferramentas
    $stmt = $pdo->query('SELECT * FROM ferramentas ORDER BY titulo');
    $ferramentas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($isAdmin || $isColaborador || $isModerador) {
        // Acesso total
        foreach ($ferramentas as &$f) {
            $f['temAcesso'] = true;
        }
    } else {
        // Busca acessos do plano
        $stmt = $pdo->prepare('SELECT ferramenta_id FROM ferramenta_plano WHERE plano_id = ?');
        $stmt->execute([$planoId]);
        $acessos = $stmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($ferramentas as &$f) {
            $f['temAcesso'] = in_array($f['id'], $acessos);
        }
    }

    echo json_encode(['success' => true, 'ferramentas' => $ferramentas]);
}

function handleDecrypt() {
    $input = json_decode(file_get_contents('php://input'), true);
    $data = $input['data'] ?? '';

    if (!$data) {
        echo json_encode(['success' => false, 'error' => 'Dados nao fornecidos']);
        return;
    }

    // Remove prefixos
    if (strpos($data, 'filehub ') === 0) {
        $data = trim(substr($data, 8));
    } elseif (strpos($data, 'session_paste ') === 0) {
        $data = trim(substr($data, 14));
    }

    // Se ja for JSON, retorna direto
    if ($data[0] === '[' || $data[0] === '{') {
        $parsed = json_decode($data, true);
        if ($parsed) {
            echo json_encode([
                'success' => true,
                'url' => $parsed['url'] ?? null,
                'cookies' => $parsed['cookies'] ?? $parsed
            ]);
            return;
        }
    }

    // Descriptografa com AES
    $key = 'iLFB0yJSLsObtH6tNcfXMqo7L8qcEHqZ';

    try {
        // Decodifica base64
        $encrypted = base64_decode($data);

        // OpenSSL decrypt (compativel com CryptoJS)
        // CryptoJS usa formato: Salted__ + salt (8 bytes) + ciphertext
        if (substr($encrypted, 0, 8) === 'Salted__') {
            $salt = substr($encrypted, 8, 8);
            $ciphertext = substr($encrypted, 16);

            // Deriva key e IV usando EVP_BytesToKey (compativel com CryptoJS)
            $keyAndIv = evp_bytes_to_key($key, $salt, 32, 16);
            $derivedKey = $keyAndIv['key'];
            $iv = $keyAndIv['iv'];

            $decrypted = openssl_decrypt($ciphertext, 'AES-256-CBC', $derivedKey, OPENSSL_RAW_DATA, $iv);

            if ($decrypted) {
                $parsed = json_decode($decrypted, true);
                if ($parsed) {
                    echo json_encode([
                        'success' => true,
                        'url' => $parsed['url'] ?? null,
                        'cookies' => $parsed['cookies'] ?? $parsed
                    ]);
                    return;
                }
            }
        }

        echo json_encode(['success' => false, 'error' => 'Nao foi possivel descriptografar']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Erro ao descriptografar: ' . $e->getMessage()]);
    }
}

// EVP_BytesToKey - compativel com CryptoJS
function evp_bytes_to_key($password, $salt, $keyLen, $ivLen) {
    $key = '';
    $iv = '';
    $block = '';

    while (strlen($key) < $keyLen || strlen($iv) < $ivLen) {
        $block = md5($block . $password . $salt, true);
        $key .= $block;
    }

    return [
        'key' => substr($key, 0, $keyLen),
        'iv' => substr($key, $keyLen, $ivLen)
    ];
}
