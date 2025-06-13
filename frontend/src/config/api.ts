export const API_BASE_URL = 'https://jobassist-backend-46294121978.us-central1.run.app';

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
    return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}; 