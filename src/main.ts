// src/main.ts
import './style.css';
import { GameManager } from './game/GameManager';

console.log('DOM Cargado. Iniciando Quiz Felino...');

const appElement = document.getElementById('app');
const shopButtonElement = document.getElementById('shop-button'); // <-- Obtener botón tienda

if (!appElement) {
  console.error('Error: Elemento #app no encontrado en el DOM.');
} else {
  appElement.innerHTML = ''; // Limpiar

  console.log('Preparado para inicializar GameManager.');
  const gameManager = new GameManager(appElement);

  // Inicialización de Audio por Interacción (sin cambios)
  const initializeAudioOnInteraction = () => {
    if (!gameManager.getAudioManager().isReady()) {
        console.log('User interaction detected, attempting to initialize audio...');
        gameManager.getAudioManager().init();
    }
    // Listeners se remueven solos con { once: true }
  };
  console.log('Adding one-time listeners for audio initialization...');
  document.body.addEventListener('click', initializeAudioOnInteraction, { once: true });
  document.body.addEventListener('touchstart', initializeAudioOnInteraction, { once: true });
  // Fin Inicialización Audio

  // *** AÑADIDO: Listener para el botón de la tienda ***
  if (shopButtonElement) {
      console.log("Añadiendo listener al botón de la tienda...");
      shopButtonElement.addEventListener('click', () => {
          console.log("Botón de tienda clickeado.");
          gameManager.openShop(); // Llamar al método del GameManager
      });
  } else {
      console.warn("Elemento #shop-button no encontrado. El botón de la tienda no funcionará.");
  }
  // **************************************************

  // Iniciar el juego
  gameManager.init()
    .then(() => {
      gameManager.create();
      gameManager.start();
      console.log('GameManager inicializado y arrancado.');
    })
    .catch(error => {
      console.error("Error durante la inicialización del juego:", error);
      appElement.innerHTML = `Error al cargar el juego: ${error.message}. Revisa la consola.`;
    });
}
