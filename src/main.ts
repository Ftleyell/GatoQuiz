// src/main.ts
import './game/components/ui/test-element'; // Importa para registrar el custom element
import './styles/base.css';
import './styles/layout.css';
import './styles/quiz-elements.css';
import './styles/cat.css';
import './styles/ink.css';
import './styles/shop.css';
import './styles/cat_food.css';
import './styles/mainmenu.css';
import './styles/themes.css'; // Asegurarse que themes.css se importa

// Importar GameManager
import { GameManager } from './game/GameManager';

console.log('DOM Cargado. Iniciando Quiz Felino...');

const appElement = document.getElementById('app');
const shopButtonElement = document.getElementById('shop-button'); // Botón Tienda

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
    // Remover estos listeners generales después del primer uso
    document.body.removeEventListener('click', initializeAudioOnInteraction, { capture: true });
    document.body.removeEventListener('touchstart', initializeAudioOnInteraction, { capture: true });
    console.log("One-time audio init listeners removed.");
  };
  console.log('Adding one-time listeners for audio initialization...');
  document.body.addEventListener('click', initializeAudioOnInteraction, { once: true, capture: true });
  document.body.addEventListener('touchstart', initializeAudioOnInteraction, { once: true, capture: true, passive: false }); // Passive false por si acaso

  // --- Listener específico y dual para el botón de tienda CON VERIFICACIÓN Y DEBOUNCE ---
  if (shopButtonElement) {
      // <<< LOG AÑADIDO >>>
      console.log("[main.ts] Botón Tienda (#shop-button) ENCONTRADO. Añadiendo listeners...");

      let lastShopInteractionTime = 0; // Timestamp local para este botón
      const SHOP_DEBOUNCE_THRESHOLD = 300; // ms

      // Handler unificado para el botón de tienda
      const handleShopButtonInteraction = (event: MouseEvent | TouchEvent) => {
          // <<< LOG AÑADIDO >>>
          console.log(`[main.ts] INTERACCIÓN con Botón Tienda detectada! Tipo: ${event.type}`);

          const now = Date.now();
          if (now - lastShopInteractionTime < SHOP_DEBOUNCE_THRESHOLD) {
               // <<< LOG AÑADIDO >>>
               console.log("[main.ts] Interacción tienda debounced.");
              return;
          }
          lastShopInteractionTime = now;

          console.log(`[main.ts] Procesando interacción botón tienda (Tipo: ${event.type}).`); // Log para saber que pasó el debounce

          if (event.type === 'touchstart') {
              event.preventDefault();
          }
          // Asegurar que audio esté inicializado
          if (!gameManager.getAudioManager().isReady()) {
              console.log("[main.ts] Inicializando audio desde listener tienda..."); // Log extra
              gameManager.getAudioManager().init();
          }
          // Abrir la tienda
          gameManager.openShop();
      };

      shopButtonElement.addEventListener('click', handleShopButtonInteraction);
      shopButtonElement.addEventListener('touchstart', handleShopButtonInteraction, { passive: false });

  } else {
      // <<< LOG AÑADIDO >>>
      console.error("[main.ts] Botón Tienda (#shop-button) NO ENCONTRADO. Listeners no añadidos.");
  }
  // --- Fin Listener Tienda ---

  // Iniciar el juego (sin cambios)
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