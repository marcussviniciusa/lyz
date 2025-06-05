// Script de teste para APIs de AI Configuration
const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAIConfigurations() {
  console.log('🧪 Testando APIs de AI Configuration...\n');
  
  try {
    // 1. Testar GET /admin/ai-configurations
    console.log('1. Listando todas as configurações de AI...');
    const allConfigs = await axios.get(`${API_BASE}/admin/ai-configurations`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
      }
    });
    console.log(`✅ ${allConfigs.data.data.configurations.length} configurações encontradas`);
    
    if (allConfigs.data.data.configurations.length > 0) {
      const firstConfig = allConfigs.data.data.configurations[0];
      console.log(`   Primeira configuração: ID ${firstConfig.id}, Page Key: ${firstConfig.page_key}\n`);
      
      // 2. Testar GET /admin/ai-configurations/:id
      console.log(`2. Buscando configuração por ID (${firstConfig.id})...`);
      const configById = await axios.get(`${API_BASE}/admin/ai-configurations/${firstConfig.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
        }
      });
      console.log(`✅ Configuração encontrada: ${configById.data.data.configuration.page_key}\n`);
      
      // 3. Testar GET /admin/ai-configurations/page/:pageKey
      console.log(`3. Buscando configuração por page_key (${firstConfig.page_key})...`);
      const configByPageKey = await axios.get(`${API_BASE}/admin/ai-configurations/page/${firstConfig.page_key}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
        }
      });
      console.log(`✅ Configuração encontrada: ${configByPageKey.data.data.configuration.page_key}\n`);
      
      // 4. Testar PUT /admin/ai-configurations/:id
      console.log(`4. Atualizando configuração por ID (${firstConfig.id})...`);
      const updateData = {
        model: firstConfig.model,
        prompt: firstConfig.prompt + '\n\n// Teste de atualização via ID',
        temperature: firstConfig.temperature,
        max_tokens: firstConfig.max_tokens,
        is_active: firstConfig.is_active
      };
      
      const updatedConfig = await axios.put(`${API_BASE}/admin/ai-configurations/${firstConfig.id}`, updateData, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Configuração atualizada com sucesso\n`);
    }
    
    console.log('🎉 Todos os testes passaram! A migração foi bem-sucedida.');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.response?.data || error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar testes
testAIConfigurations(); 