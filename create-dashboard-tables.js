const mysql = require('mysql2/promise');

const mysqlConfig = {
  host: '157.230.211.234',
  user: 'filehub',
  password: 'Mel102424!@#',
  database: 'filehub'
};

async function createTables() {
  const connection = await mysql.createConnection(mysqlConfig);

  try {
    console.log('Conectado ao MySQL...');

    // Tabela dashboard_banners
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dashboard_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image VARCHAR(500) NOT NULL,
        url VARCHAR(500) NULL,
        \`order\` INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Tabela dashboard_banners criada/verificada!');

    // Tabela dashboard_covers
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dashboard_covers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image VARCHAR(500) NOT NULL,
        title VARCHAR(255) NULL,
        url VARCHAR(500) NULL,
        \`order\` INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Tabela dashboard_covers criada/verificada!');

    // Tabela menu_items
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        icon VARCHAR(100) NULL,
        page VARCHAR(100) NULL,
        parent_id INT NULL,
        \`order\` INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Tabela menu_items criada/verificada!');

    // Verifica se menu_items esta vazia e insere itens padrao
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM menu_items');
    if (rows[0].count === 0) {
      console.log('Inserindo itens de menu padrao...');

      const menuItems = [
        { label: 'Dashboard', icon: '&#127968;', page: 'dashboard', order: 1 },
        { label: 'Ferramentas', icon: '&#128736;', page: 'ferramentas', order: 2 },
        { label: 'Acessos Premium', icon: '&#128272;', page: 'acessos', order: 3 },
        { label: 'Canva', icon: '&#127912;', page: 'canva', order: 4 },
        { label: 'Materiais', icon: '&#128218;', page: 'materiais', order: 5 },
        { label: 'IA', icon: '&#129302;', page: 'ia', order: 6 },
        { label: 'Meu Perfil', icon: '&#128100;', page: 'profile', order: 7 },
        { label: 'Planos', icon: '&#128176;', page: 'planos', order: 8 }
      ];

      for (const item of menuItems) {
        await connection.execute(
          'INSERT INTO menu_items (label, icon, page, `order`, is_active) VALUES (?, ?, ?, ?, 1)',
          [item.label, item.icon, item.page, item.order]
        );
      }
      console.log('Itens de menu inseridos!');
    }

    console.log('\nTodas as tabelas foram criadas com sucesso!');

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await connection.end();
    console.log('Conexao fechada.');
  }
}

createTables();
