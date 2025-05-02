// src/main.ts
import './styles/base.css';
import './styles/layout.css';
import './styles/quiz-elements.css';
import './styles/cat.css';
import './styles/ink.css';
import './styles/shop.css';
import './styles/cat_food.css';
import './styles/mainmenu.css';

// Importar GameManager
import { GameManager } from './game/GameManager';

// ... (resto del código de main.ts sin cambios) ...
console.log('DOM Cargado. Iniciando Quiz Felino...');

const appElement = document.getElementById('app');
const shopButtonElement = document.getElementById('shop-button');

if (!appElement) {
  console.error('Error: Elemento #app no encontrado en el DOM.');
} else {
  appElement.innerHTML = ''; // Limpiar contenedor principal

  console.log('Preparado para inicializar GameManager.');
  const gameManager = new GameManager(appElement);

  // Exponer gameManager globalmente para depuración desde la consola
  (window as any).gameManager = gameManager;
  console.log("GameManager expuesto como window.gameManager para depuración.");

  // Inicialización de Audio por Interacción del Usuario
  const initializeAudioOnInteraction = () => {
    const audioManager = gameManager.getAudioManager();
    if (!audioManager.isReady()) {
        console.log('User interaction detected, attempting to initialize audio...');
        audioManager.init(); // Llama a init() del AudioManager
    }
  };
  console.log('Adding one-time listeners for audio initialization...');
  document.body.addEventListener('click', initializeAudioOnInteraction, { once: true });
  document.body.addEventListener('touchstart', initializeAudioOnInteraction, { once: true });

  // Listener para el botón de la tienda
  if (shopButtonElement) {
      console.log("Añadiendo listener al botón de la tienda...");
      shopButtonElement.addEventListener('click', () => {
          console.log("Botón de tienda clickeado.");
          if (!gameManager.getAudioManager().isReady()) {
              gameManager.getAudioManager().init();
          }
          gameManager.openShop();
      });
  } else {
      console.warn("Elemento #shop-button no encontrado. El botón de la tienda no funcionará.");
  }

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
