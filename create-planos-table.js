const mysql = require('mysql2/promise');

async function createPlanosTable() {
  const pool = mysql.createPool({
    host: '157.230.211.234',
    user: 'filehub',
    password: 'Mel102424!@#',
    database: 'filehub',
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    // Criar tabela planos_plataforma
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS planos_plataforma (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        valor_original DECIMAL(10,2) DEFAULT NULL,
        recursos TEXT,
        cor_destaque VARCHAR(20) DEFAULT '#157f67',
        icone VARCHAR(50) DEFAULT 'star',
        is_popular TINYINT(1) DEFAULT 0,
        ordem INT DEFAULT 0,
        link_pagamento VARCHAR(500) DEFAULT NULL,
        status TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Tabela planos_plataforma criada com sucesso!');

    // Inserir os 4 planos iniciais
    const planos = [
      {
        nome: 'Plano GO!',
        descricao: 'Ideal para comecar sua jornada com acesso basico as ferramentas.',
        valor: 39.90,
        recursos: JSON.stringify([
          'Acesso a IAs basicas',
          'Suporte por email',
          '5 acessos simultaneos',
          'Atualizacoes mensais'
        ]),
        cor_destaque: '#3498db',
        icone: 'rocket',
        is_popular: 0,
        ordem: 1
      },
      {
        nome: 'Plano Lite',
        descricao: 'Para quem quer mais recursos e ferramentas avancadas.',
        valor: 59.90,
        recursos: JSON.stringify([
          'Tudo do Plano GO!',
          'Acesso a IAs intermediarias',
          'Suporte prioritario',
          '10 acessos simultaneos',
          'Materiais exclusivos'
        ]),
        cor_destaque: '#9b59b6',
        icone: 'zap',
        is_popular: 0,
        ordem: 2
      },
      {
        nome: 'Plano Hub+',
        descricao: 'O plano mais popular! Acesso completo com recursos premium.',
        valor: 89.90,
        recursos: JSON.stringify([
          'Tudo do Plano Lite',
          'Acesso a TODAS as IAs',
          'Acessos Premium inclusos',
          'Suporte VIP 24/7',
          '20 acessos simultaneos',
          'Canva Pro incluso'
        ]),
        cor_destaque: '#f39c12',
        icone: 'crown',
        is_popular: 1,
        ordem: 3
      },
      {
        nome: 'Plano HubPro+',
        descricao: 'O pacote definitivo para profissionais e empresas.',
        valor: 159.90,
        recursos: JSON.stringify([
          'Tudo do Plano Hub+',
          'Acesso ilimitado',
          'Gerente de conta dedicado',
          'API exclusiva',
          'Treinamentos personalizados',
          'White label disponivel'
        ]),
        cor_destaque: '#e74c3c',
        icone: 'gem',
        is_popular: 0,
        ordem: 4
      }
    ];

    for (const plano of planos) {
      await pool.execute(
        `INSERT INTO planos_plataforma (nome, descricao, valor, recursos, cor_destaque, icone, is_popular, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [plano.nome, plano.descricao, plano.valor, plano.recursos, plano.cor_destaque, plano.icone, plano.is_popular, plano.ordem]
      );
      console.log(`Plano "${plano.nome}" inserido!`);
    }

    console.log('\nTodos os planos foram criados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

createPlanosTable();
