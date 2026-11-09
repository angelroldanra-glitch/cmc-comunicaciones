import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Aquí le decimos a React que busque exactamente la caja "root" que creamos en el HTML
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(<App />);
