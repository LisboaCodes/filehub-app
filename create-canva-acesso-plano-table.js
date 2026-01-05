const mysql = require('mysql2/promise');

async function createTable() {
  const connection = await mysql.createConnection({
    host: '157.230.211.234',
    user: 'filehub',
    password: 'Mel102424!@#',
    database: 'filehub'
  });

  try {
    // Cria tabela canva_acesso_plano
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS canva_acesso_plano (
        id INT AUTO_INCREMENT PRIMARY KEY,
        canva_acesso_id INT NOT NULL,
        plano_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_canva_acesso_plano (canva_acesso_id, plano_id)
      )
    `);
    console.log('Tabela canva_acesso_plano criada com sucesso!');

  } catch (error) {
    console.error('Erro ao criar tabela:', error.message);
  } finally {
    await connection.end();
  }
}

createTable();
