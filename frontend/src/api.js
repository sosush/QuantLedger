import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    return api.post('/api/login', formData);
  },
  register: (email, password) => api.post('/api/register', { email, password }),
};

export const portfolioAPI = {
  getPortfolio: () => api.get('/api/portfolio'),
  buyStock: (ticker, quantity, price) => api.post('/api/portfolio', { 
    ticker: ticker, 
    quantity: quantity, 
    average_buy_price: price 
  }),
  searchAssets: (query) => api.get(`/api/search?q=${query}`) // NEW LINE!
};

export const advisorAPI = {
  getPlan: (data) => api.post('/api/plan', data),
};


export default api;