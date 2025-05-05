import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Si estás usando algún framework como React, Vue, Svelte, etc.,
  // necesitarás importar y añadir su plugin aquí.
  // Ejemplo: import react from '@vitejs/plugin-react';
  plugins: [
    // react() // Descomenta o añade el plugin de tu framework si aplica
  ],
  // Establece la ruta base para el despliegue en GitHub Pages
  base: '/GatoQuiz/',
  build: {
    // Asegura que la salida de la compilación sea la carpeta 'dist'
    outDir: 'dist',
  },
});