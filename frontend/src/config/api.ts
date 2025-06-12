export const API_BASE_URL = 'http://localhost:8080';

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
    return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}; 