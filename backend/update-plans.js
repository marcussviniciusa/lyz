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

async function updatePlans() {
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

    // Atualizar todos os planos para usar a empresa
    const [result] = await sequelize.query(`
      UPDATE patient_plans
      SET company_id = ${companyId}
      WHERE company_id IS NULL OR company_id = 0;
    `);

    console.log('Planos atualizados com sucesso!');
    console.log(`${result} planos foram atualizados para usar a empresa ID ${companyId}`);

    // Verificar planos atualizados
    const [plans] = await sequelize.query('SELECT id, company_id FROM patient_plans');
    console.log('Planos no sistema:');
    console.table(plans);

  } catch (error) {
    console.error('Erro ao atualizar planos:', error);
  } finally {
    await sequelize.close();
  }
}

updatePlans();
