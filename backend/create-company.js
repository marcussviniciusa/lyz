require('dotenv').config();
const { Sequelize } = require('sequelize');

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

async function createCompany() {
  try {
    // Conectar ao banco de dados
    await sequelize.authenticate();
    console.log('Conexão estabelecida com sucesso.');

    // Criar a empresa
    const [results, metadata] = await sequelize.query(`
      INSERT INTO companies (name, token_limit, created_at) 
      VALUES ('Lyz Health', 100000, NOW())
      RETURNING id;
    `);

    console.log('Empresa criada com sucesso!');
    console.log('ID da empresa:', results[0].id);

    return results[0].id;
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
  } finally {
    await sequelize.close();
  }
}

createCompany();
