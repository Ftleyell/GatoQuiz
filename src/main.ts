// src/main.ts
import './style.css';
import { GameManager } from './game/GameManager'; // Asegúrate que la ruta sea correcta

console.log('DOM Cargado. Iniciando Quiz Felino...');

const appElement = document.getElementById('app');

if (!appElement) {
  console.error('Error: Elemento #app no encontrado en el DOM.');
} else {
  appElement.innerHTML = ''; // Limpia el mensaje de "Cargando..."

  console.log('Preparado para inicializar GameManager.');
  const gameManager = new GameManager(appElement);

  // Iniciar el juego
  gameManager.init()
    .then(() => {
      gameManager.create();
      gameManager.start(); // Inicia el bucle de juego
      console.log('GameManager inicializado y arrancado.');
    })
    .catch(error => {
      console.error("Error durante la inicialización del juego:", error);
      appElement.innerHTML = 'Error al cargar el juego. Revisa la consola.';
    });
}