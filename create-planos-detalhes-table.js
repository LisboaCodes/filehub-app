const mysql = require('mysql2/promise');

async function createPlanosDetalhesTable() {
  const pool = mysql.createPool({
    host: '157.230.211.234',
    user: 'filehub',
    password: 'Mel102424!@#',
    database: 'filehub',
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    // Criar tabela planos_detalhes
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS planos_detalhes (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        categoria ENUM('cotas', 'plataformas', 'recursos') NOT NULL DEFAULT 'cotas',
        nome_recurso VARCHAR(100) NOT NULL,
        icone TEXT,
        plano_1 VARCHAR(50) DEFAULT '❌',
        plano_2 VARCHAR(50) DEFAULT '❌',
        plano_3 VARCHAR(50) DEFAULT '❌',
        plano_4 VARCHAR(50) DEFAULT '❌',
        ordem INT DEFAULT 0,
        status TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Tabela planos_detalhes criada com sucesso!');

    // Inserir dados de COTAS DIARIAS / DOWNLOADS
    const cotas = [
      { nome: 'Licenca Comercial', icone: '📜', p1: '✓', p2: '✓', p3: '✓', p4: '✓ (Estendida)', ordem: 1 },
      { nome: 'Freepik', icone: 'freepik', p1: '10 /Dia', p2: '20 /Dia', p3: '30 /Dia', p4: '40 /Dia', ordem: 2 },
      { nome: 'Designi', icone: '🎯', p1: '10 /Dia', p2: '20 /Dia', p3: '35 /Dia', p4: '50 /Dia', ordem: 3 },
      { nome: 'Baixar Design', icone: '🎯', p1: '5 /Dia', p2: '10 /Dia', p3: '25 /Dia', p4: '50 /Dia', ordem: 4 },
      { nome: 'Envato', icone: 'envato', p1: '5 /Dia', p2: '15 /Dia', p3: '35 /Dia', p4: '50 /Dia', ordem: 5 },
      { nome: 'AdobeStock', icone: 'adobestock', p1: '❌', p2: '2 /Dia', p3: '10 /Dia', p4: '15 /Dia', ordem: 6 },
      { nome: 'Flaticon', icone: 'flaticon', p1: '5 /Dia', p2: '10 /Dia', p3: '35 /Dia', p4: '50 /Dia', ordem: 7 },
      { nome: 'Vecteezy', icone: 'vecteezy', p1: '❌', p2: '10 /Dia', p3: '25 /Dia', p4: '40 /Dia', ordem: 8 },
      { nome: 'Designbr', icone: '🎯', p1: '❌', p2: '2 /Dia', p3: '5 /Dia', p4: '10 /Dia', ordem: 9 },
      { nome: 'Pixeden', icone: 'pixeden', p1: '❌', p2: '10 /Dia', p3: '25 /Dia', p4: '50 /Dia', ordem: 10 },
      { nome: 'Artlist', icone: 'artlist', p1: '❌', p2: '10 /Dia', p3: '15 /Dia', p4: '30 /Dia', ordem: 11 },
      { nome: 'MockupCloud', icone: 'mockupcloud', p1: '❌', p2: '10 /Dia', p3: '15 /Dia', p4: '30 /Dia', ordem: 12 },
      { nome: 'Motion Array', icone: 'motionarray', p1: '❌', p2: '10 /Dia', p3: '15 /Dia', p4: '30 /Dia', ordem: 13 },
      { nome: 'Motion Elements', icone: '🎯', p1: '❌', p2: '❌', p3: '10 /Dia', p4: '20 /Dia', ordem: 14 },
      { nome: 'Shutterstock', icone: 'shutterstock', p1: '❌', p2: '2 /Dia', p3: '5 /Dia', p4: '10 /Dia', ordem: 15 },
      { nome: 'Istock', icone: 'istock', p1: '❌', p2: '❌', p3: '5 /Dia', p4: '10 /Dia', ordem: 16 },
      { nome: 'Epidemic Sound', icone: 'epidemic', p1: '❌', p2: '5 /Dia', p3: '10 /Dia', p4: '20 /Dia', ordem: 17 },
      { nome: 'Creative Fabrica', icone: 'creativefabrica', p1: '❌', p2: '5 /Dia', p3: '10 /Dia', p4: '30 /Dia', ordem: 18 },
      { nome: 'Lovepik', icone: '🎯', p1: '❌', p2: '10 /Dia', p3: '20 /Dia', p4: '40 /Dia', ordem: 19 },
      { nome: 'IconScout', icone: 'iconscout', p1: '❌', p2: '10 /Dia', p3: '15 /Dia', p4: '20 /Dia', ordem: 20 },
      { nome: 'RawPixel', icone: 'rawpixel', p1: '❌', p2: '10 /Dia', p3: '15 /Dia', p4: '30 /Dia', ordem: 21 },
      { nome: 'StoryBlocks', icone: 'storyblocks', p1: '❌', p2: '10 /Dia', p3: '20 /Dia', p4: '40 /Dia', ordem: 22 },
      { nome: 'Deeezy', icone: 'deeezy', p1: '❌', p2: '15 /Dia', p3: '25 /Dia', p4: '40 /Dia', ordem: 23 },
    ];

    // Inserir dados de ACESSOS / PLATAFORMAS
    const plataformas = [
      { nome: 'CANVA PRO', icone: '🎨', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 1 },
      { nome: 'CAPCUT', icone: '🎬', p1: '❌', p2: '❌', p3: '✓', p4: '✓', ordem: 2 },
      { nome: 'VECTORIZER', icone: '🔷', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 3 },
      { nome: 'REMINI', icone: '📷', p1: '❌', p2: '❌', p3: '✓', p4: '✓', ordem: 4 },
      { nome: 'YELLO MOCKUPS DRIVE', icone: '📁', p1: '❌', p2: '❌', p3: '✓', p4: '✓', ordem: 5 },
    ];

    // Inserir dados de INTELIGENCIA ARTIFICIAL
    const recursos = [
      { nome: 'CHAT GPT', icone: '🤖', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 1 },
      { nome: 'LEONARDO AI', icone: '🎨', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 2 },
      { nome: 'MIDJOURNEY', icone: '🖼️', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 3 },
      { nome: 'VOICECLONE', icone: '🎙️', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 4 },
      { nome: 'SORA *', icone: '🎥', p1: '❌', p2: '❌', p3: '✓', p4: '✓', ordem: 5 },
      { nome: 'IDEOGRAM *', icone: '✨', p1: '❌', p2: '❌', p3: '❌', p4: '✓', ordem: 6 },
      { nome: 'GEMINI', icone: '💎', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 7 },
      { nome: 'INNER AI', icone: '🧠', p1: '❌', p2: '❌', p3: '✓', p4: '✓', ordem: 8 },
      { nome: 'GAMMA', icone: '📊', p1: '❌', p2: '❌', p3: '✓', p4: '✓', ordem: 9 },
      { nome: 'CRAMLY AI', icone: '📝', p1: '❌', p2: '❌', p3: '✓', p4: '✓', ordem: 10 },
      { nome: 'GROK 3', icone: '🚀', p1: '❌', p2: '❌', p3: '✓', p4: '✓', ordem: 11 },
      { nome: 'CLAUDE AI *', icone: '🤖', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 12 },
      { nome: 'PERPLEXITY AI', icone: '🔍', p1: '✓', p2: '✓', p3: '✓', p4: '✓', ordem: 13 },
      { nome: 'DEEPL PRO', icone: '🌐', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 14 },
      { nome: 'TURBO SCRIBE', icone: '📝', p1: '❌', p2: '✓', p3: '✓', p4: '✓', ordem: 15 },
      { nome: 'RUNWAY *', icone: '🎬', p1: '❌', p2: '❌', p3: '❌', p4: '✓', ordem: 16 },
      { nome: 'KREA AI *', icone: '🎨', p1: '❌', p2: '❌', p3: '❌', p4: '✓', ordem: 17 },
      { nome: 'MANUS AI *', icone: '🤖', p1: '❌', p2: '❌', p3: '❌', p4: '✓', ordem: 18 },
      { nome: 'DREAMFACE *', icone: '👤', p1: '❌', p2: '❌', p3: '❌', p4: '✓', ordem: 19 },
      { nome: 'KLING AI *', icone: '🎥', p1: '❌', p2: '❌', p3: '❌', p4: '✓', ordem: 20 },
    ];

    // Inserir cotas
    for (const item of cotas) {
      await pool.execute(
        `INSERT INTO planos_detalhes (categoria, nome_recurso, icone, plano_1, plano_2, plano_3, plano_4, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['cotas', item.nome, item.icone, item.p1, item.p2, item.p3, item.p4, item.ordem]
      );
      console.log(`[COTAS] ${item.nome} inserido!`);
    }

    // Inserir plataformas
    for (const item of plataformas) {
      await pool.execute(
        `INSERT INTO planos_detalhes (categoria, nome_recurso, icone, plano_1, plano_2, plano_3, plano_4, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['plataformas', item.nome, item.icone, item.p1, item.p2, item.p3, item.p4, item.ordem]
      );
      console.log(`[PLATAFORMAS] ${item.nome} inserido!`);
    }

    // Inserir recursos IA
    for (const item of recursos) {
      await pool.execute(
        `INSERT INTO planos_detalhes (categoria, nome_recurso, icone, plano_1, plano_2, plano_3, plano_4, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['recursos', item.nome, item.icone, item.p1, item.p2, item.p3, item.p4, item.ordem]
      );
      console.log(`[RECURSOS] ${item.nome} inserido!`);
    }

    console.log('\nTodos os detalhes foram criados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

createPlanosDetalhesTable();
