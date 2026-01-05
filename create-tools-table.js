// Script para criar a tabela tools no MySQL
const mysql = require('mysql2/promise');

async function createToolsTable() {
  const pool = mysql.createPool({
    host: '157.230.211.234',
    user: 'filehub',
    password: 'Mel102424!@#',
    database: 'filehub',
    waitForConnections: true,
    connectionLimit: 5
  });

  try {
    console.log('Conectando ao MySQL...');

    // Cria tabela tools
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT DEFAULT NULL,
        label VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT NULL,
        url TEXT DEFAULT NULL,
        ordem INT DEFAULT 0,
        show_app TINYINT(1) DEFAULT 1 COMMENT '1=mostrar no app, 0=nao mostrar',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Tabela tools criada com sucesso!');

    // Insere alguns dados de exemplo
    const [existing] = await pool.execute('SELECT COUNT(*) as count FROM tools');
    if (existing[0].count === 0) {
      console.log('Inserindo dados de exemplo...');

      // Menu pai exemplo
      const [result1] = await pool.execute(
        "INSERT INTO tools (label, icon, ordem, show_app) VALUES (?, ?, ?, ?)",
        ['Redes Sociais', 'share-2', 1, 1]
      );
      const parentId = result1.insertId;

      // Submenus
      await pool.execute(
        "INSERT INTO tools (parent_id, label, icon, url, ordem, show_app) VALUES (?, ?, ?, ?, ?, ?)",
        [parentId, 'Instagram', 'instagram', 'https://instagram.com', 1, 1]
      );
      await pool.execute(
        "INSERT INTO tools (parent_id, label, icon, url, ordem, show_app) VALUES (?, ?, ?, ?, ?, ?)",
        [parentId, 'Facebook', 'facebook', 'https://facebook.com', 2, 1]
      );
      await pool.execute(
        "INSERT INTO tools (parent_id, label, icon, url, ordem, show_app) VALUES (?, ?, ?, ?, ?, ?)",
        [parentId, 'YouTube', 'youtube', 'https://youtube.com', 3, 1]
      );

      console.log('Dados de exemplo inseridos!');
    }

    console.log('Script concluido com sucesso!');
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

createToolsTable();
