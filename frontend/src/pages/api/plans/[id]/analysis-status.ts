import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Função simplificada para obter o token da solicitação
const getTokenFromRequest = (req: NextApiRequest) => {
  // Tenta obter o token do cabeçalho Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Tenta obter o token do cookie - usando 'accessToken' que é o padrão usado pelo sistema
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  
  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Esta API só aceita solicitações GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Obter o token de autenticação da requisição
    const token = getTokenFromRequest(req);

    // Se não houver token, retornar erro de autenticação
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Extrair o ID do plano dos parâmetros da rota
    const { id } = req.query;

    // Configurar o URL do backend (usando variável de ambiente para o host)
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Garantir que a URL inclui o sufixo /api conforme esperado pelo backend
    if (!backendUrl.endsWith('/api')) {
      backendUrl = backendUrl + '/api';
    }
    const apiUrl = `${backendUrl}/plans/${id}/analysis-status`;

    // Fazer a solicitação para o backend com o token de autenticação
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Retornar a resposta do backend para o frontend
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro ao encaminhar solicitação de status da análise:', error);

    // Se o erro for do Axios, podemos extrair o status e a mensagem
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    // Caso contrário, retornamos um erro 500 genérico
    return res.status(500).json({
      error: 'Erro ao verificar o status da análise',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
