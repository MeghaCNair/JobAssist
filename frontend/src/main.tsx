import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Create root with test mode configuration
const root = createRoot(document.getElementById('root')!)

// Enable test mode by disabling strict mode and automatic batching
root.render(<App />);
