// Redirecionador de API para transcrição
// Este arquivo funciona como um proxy para encaminhar requisições para o endpoint correto

import axios from 'axios';
import formidable from 'formidable';
import { createReadStream } from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

// Desativar o parsing de corpo padrão do Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Fazer o parsing do formulário com formidable
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // Obter o arquivo de áudio do formulário
    const audioFile = files.audio;
    if (!audioFile) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
    }

    // Criar um FormData para enviar ao backend
    const formData = new FormData();
    const stream = createReadStream(audioFile.filepath);
    const blob = new Blob([await stream.arrayBuffer()]);
    formData.append('audio', blob, audioFile.originalFilename || 'recording.wav');

    // Obter o token de autenticação do cookie
    const authCookie = req.headers.cookie?.split(';')
      .find(c => c.trim().startsWith('authToken='));
    const authToken = authCookie ? authCookie.split('=')[1] : null;

    // Configurar cabeçalhos para a requisição ao backend
    const headers = {
      'Content-Type': 'multipart/form-data',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Enviar a requisição para o backend
    const backendUrl = 'https://apilyz.marcussviniciusa.cloud/api/transcribe';
    console.log(`Encaminhando transcrição para: ${backendUrl}`);
    
    const response = await axios.post(backendUrl, formData, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Retornar a resposta do backend
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Erro ao processar transcrição:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar a solicitação',
      details: error.message 
    });
  }
}
