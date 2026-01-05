const mysql = require('mysql2/promise');

async function createTables() {
  const connection = await mysql.createConnection({
    host: '157.230.211.234',
    user: 'filehub',
    password: 'Mel102424!@#',
    database: 'filehub'
  });

  try {
    // Tabela de categorias do Canva
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS canva_categorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        ordem INT DEFAULT 0,
        status TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela canva_categorias criada!');

    // Tabela de arquivos do Canva
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS canva_arquivos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        legenda_sugerida TEXT,
        categoria_id INT,
        capa VARCHAR(500),
        download VARCHAR(500) NOT NULL,
        status TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES canva_categorias(id) ON DELETE SET NULL
      )
    `);
    console.log('Tabela canva_arquivos criada!');

    // Tabela de acessos do Canva
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS canva_acessos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        url VARCHAR(500) NOT NULL,
        capa VARCHAR(500),
        status TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela canva_acessos criada!');

    // Mostra as tabelas criadas
    const [tables] = await connection.execute("SHOW TABLES LIKE 'canva%'");
    console.log('\nTabelas criadas:');
    tables.forEach(t => console.log('-', Object.values(t)[0]));

    // Inserir categorias de exemplo
    await connection.execute(`
      INSERT IGNORE INTO canva_categorias (id, nome, descricao, ordem) VALUES
      (1, 'Stories', 'Templates para stories do Instagram', 1),
      (2, 'Feed', 'Posts para feed do Instagram', 2),
      (3, 'Carrossel', 'Posts em carrossel', 3),
      (4, 'Reels', 'Templates para Reels', 4),
      (5, 'Logotipos', 'Logos e identidade visual', 5)
    `);
    console.log('\nCategorias de exemplo inseridas!');

    // Inserir acesso Canva de exemplo
    await connection.execute(`
      INSERT IGNORE INTO canva_acessos (id, titulo, descricao, url) VALUES
      (1, 'Canva Pro', 'Acesso ao Canva Pro', 'https://www.canva.com/')
    `);
    console.log('Acesso Canva inserido!');

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await connection.end();
  }
}

createTables();
