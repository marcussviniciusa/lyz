require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

// Configurações do banco de dados a partir do .env
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres'
};

// Criar conexão com o banco de dados
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: console.log
});

async function createSuperadmin() {
  try {
    // Conectar ao banco de dados
    await sequelize.authenticate();
    console.log('Conexão estabelecida com sucesso.');

    // Verificar se a empresa existe
    const [companies] = await sequelize.query('SELECT id FROM companies LIMIT 1');
    
    if (companies.length === 0) {
      console.error('Nenhuma empresa encontrada. Crie uma empresa primeiro.');
      return;
    }
    
    const companyId = companies[0].id;
    console.log(`Usando empresa com ID: ${companyId}`);

    // Hashear a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Criar o superadmin
    const [results, metadata] = await sequelize.query(`
      INSERT INTO users (
        name, 
        email, 
        password, 
        role, 
        company_id, 
        created_at
      ) 
      VALUES (
        'Admin Lyz', 
        'admin@lyz.ai', 
        '${hashedPassword}', 
        'superadmin', 
        ${companyId}, 
        NOW()
      )
      RETURNING id;
    `);

    console.log('Superadmin criado com sucesso!');
    console.log('ID do superadmin:', results[0].id);
    console.log('Credenciais do superadmin:');
    console.log('Email: admin@lyz.ai');
    console.log('Senha: admin123');

    return results[0].id;
  } catch (error) {
    console.error('Erro ao criar superadmin:', error);
  } finally {
    await sequelize.close();
  }
}

createSuperadmin();
