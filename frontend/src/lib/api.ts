import axios from 'axios';

// Garantir que a URL da API termina com /api
let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
if (!baseUrl.endsWith('/api')) {
  baseUrl = baseUrl + '/api';
}
const API_URL = baseUrl;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    let token = '';
    
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // First try localStorage
      token = localStorage.getItem('accessToken') || '';
      
      // If not in localStorage, try cookies
      if (!token) {
        try {
          const cookies = document.cookie.split(';');
          const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
          if (tokenCookie) {
            token = tokenCookie.split('=')[1].trim();
          }
        } catch (err) {
          console.error('Error reading cookie:', err);
        }
      }
      
      // Log token for debugging (remove in production)
      console.log('Auth token being used:', token ? 'Present' : 'Missing');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 (Unauthorized) and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        let refreshToken = '';
        
        // Check if we're in the browser
        if (typeof window !== 'undefined') {
          refreshToken = localStorage.getItem('refreshToken') || '';
          
          // Try to get from cookie as fallback
          if (!refreshToken) {
            const cookies = document.cookie.split(';');
            const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('refreshToken='));
            if (tokenCookie) {
              refreshToken = tokenCookie.split('=')[1];
            }
          }
        }
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });
        
        const { accessToken } = response.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          
          // Also set as cookie for SSR
          document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
        }
        
        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, log out user
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          // Also remove cookies
          document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        
        // Redirect to login page if in browser
        if (typeof window !== 'undefined') {
          // Usar URL relativa para funcionar em qualquer ambiente
          window.location.href = '/auth/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  validateEmail: (email: string) => api.get(`/auth/validate-email?email=${email}`),
  register: (userData: any) => api.post('/auth/register', userData),
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),
  refreshToken: (refreshToken: string) => 
    api.post('/auth/refresh', { refreshToken }),
};

// Plan API calls
export const planAPI = {
  startPlan: (planData: any) => api.post('/plans/start', planData),

  uploadLabResults: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/plans/${id}/lab-results`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  analyzeLabResults: (id: string, data: any) => api.post(`/plans/${id}/analyze-labs`, { lab_results: data }),
  
  // Salvar permanentemente os resultados da análise (para garantir persistência)
  saveLabAnalysisResults: (id: string, data: any) => api.post(`/plans/${id}/save-lab-analysis`, { lab_results: data }),
  
  // Verificar o status da análise em andamento
  getAnalysisStatus: (id: string) => api.get(`/plans/${id}/analysis-status`),
  
  updateLabNotes: (id: string, notes: string) => api.post(`/plans/${id}/lab-notes`, { notes }),
  
  // TCM operations
  updateTCM: (id: string, data: any) => api.post(`/plans/${id}/tcm`, { tcm_observations: data }),
  // API para análise TCM
  // De acordo com a estrutura do sistema Lyz, o endpoint correto é /analyze-tcm
  // E os dados precisam estar no formato { tcm_observations: data }
  analyzeTCM: (id: string, data: any) => {
    console.log('Enviando dados de TCM para API:', { endpoint: `/plans/${id}/analyze-tcm`, data });
    // Usamos diretamente o endpoint analyze-tcm que espera o formato { tcm_observations: data }
    return api.post(`/plans/${id}/analyze-tcm`, { tcm_observations: data });
  },
  
  // API para análise da matriz IFM
  // Envia todos os dados coletados até o momento para gerar uma matriz IFM com valores sugeridos
  // Seguindo a estrutura do sistema Lyz, enviamos os dados no formato { ifm_matrix: data }
  analyzeIFMMatrix: (id: string, options: { focus?: string, contextData?: any }) => {
    return api.post(`/plans/${id}/ifm-matrix?analysis=true`, { 
      ifm_matrix: {
        analysis_request: true,
        focus: options.focus || '',
        context_data: options.contextData || {}
      }
    });
  },
  updateTimeline: (id: string, data: any) => api.post(`/plans/${id}/timeline`, { timeline_data: data }),
  updateIFMMatrix: (id: string, data: any) => api.post(`/plans/${id}/ifm-matrix`, { ifm_matrix: data }),
  updateFinalPlan: (id: string, data: any) => api.post(`/plans/${id}/final`, { final_plan: data }),
  generatePlan: (id: string) => api.post(`/plans/${id}/generate`),
  exportPlan: (id: string, format = 'pdf') => 
    api.get(`/plans/${id}/export?format=${format}`),
    
  // Funções de compartilhamento
  sharePlanViaEmail: (id: string, data: { 
    recipientEmail: string, 
    recipientName?: string, 
    senderName?: string, 
    customMessage?: string 
  }) => api.post(`/plans/${id}/share/email`, data),
  
  generateShareLink: (id: string, expirationHours: number = 72) => 
    api.post(`/plans/${id}/share/link`, { expirationHours }),
  getUserPlans: () => api.get('/plans'),
  getPlanById: (id: string) => api.get(`/plans/${id}`),
  deletePlan: (id: string) => api.delete(`/plans/${id}`),
};

// Admin API calls
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Companies
  getCompanies: () => api.get('/admin/companies'),
  getCompanyById: (id: string) => api.get(`/admin/companies/${id}`),
  createCompany: (data: any) => api.post('/admin/companies', data),
  updateCompany: (id: string, data: any) => api.put(`/admin/companies/${id}`, data),
  deleteCompany: (id: string) => api.delete(`/admin/companies/${id}`),
  
  // Users
  getUsers: (companyId?: string) => 
    api.get(`/admin/users${companyId ? `?company_id=${companyId}` : ''}`),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  
  // Prompts
  getPrompts() {
    return api.get('/admin/prompts');
  },
  getPromptById(id: string) {
    return api.get(`/admin/prompts/${id}`);
  },
  updatePrompt(id: string, data: any) {
    return api.put(`/admin/prompts/${id}`, data);
  },
  
  // Google Speech Configuration
  getGoogleSpeechConfig() {
    return api.get('/admin/settings/google-speech');
  },
  updateGoogleSpeechConfig(data: { config: string | null }) {
    return api.put('/admin/settings/google-speech', data);
  },
  
  // OpenAI API Configuration
  getOpenAIApiKey() {
    return api.get('/admin/settings/openai-api');
  },
  updateOpenAIApiKey(data: { apiKey: string }) {
    return api.put('/admin/settings/openai-api', data);
  },
  
  // Token usage
  getTokenUsage: (params: any = {}) => 
    api.get('/admin/tokens/usage', { params }),
};

export default api;
