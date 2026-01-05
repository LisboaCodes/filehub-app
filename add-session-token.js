const mysql = require('mysql2/promise');

const mysqlConfig = {
  host: '157.230.211.234',
  user: 'filehub',
  password: 'Mel102424!@#',
  database: 'filehub'
};

async function addSessionToken() {
  const connection = await mysql.createConnection(mysqlConfig);

  try {
    console.log('Conectado ao MySQL...');

    // Verifica se coluna existe
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'filehub' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'session_token'
    `);

    if (columns.length === 0) {
      await connection.execute(`ALTER TABLE users ADD COLUMN session_token VARCHAR(100) NULL`);
      console.log('Coluna session_token adicionada!');
    } else {
      console.log('Coluna session_token já existe.');
    }

    // Verifica session_updated_at
    const [columns2] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'filehub' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'session_updated_at'
    `);

    if (columns2.length === 0) {
      await connection.execute(`ALTER TABLE users ADD COLUMN session_updated_at TIMESTAMP NULL`);
      console.log('Coluna session_updated_at adicionada!');
    } else {
      console.log('Coluna session_updated_at já existe.');
    }

    console.log('Pronto!');

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await connection.end();
  }
}

addSessionToken();
