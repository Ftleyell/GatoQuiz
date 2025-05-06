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
  console.log("[main.ts] Botón Tienda (#shop-button) ENCONTRADO. Añadiendo listeners...");

  let lastShopInteractionTime = 0;
  const SHOP_DEBOUNCE_THRESHOLD = 350; // Aumentar ligeramente el debounce
  let isProcessingShopClick = false; // Flag para evitar reentrada

  // Handler unificado
  const handleShopButtonInteraction = (event: MouseEvent | TouchEvent) => {
      // Prevenir comportamiento por defecto en touchstart
      if (event.type === 'touchstart') {
          event.preventDefault();
      }
      // Prevenir que el evento se propague y cause otros listeners (como el de audio)
      event.stopPropagation();

      const now = Date.now();
      // Verificar debounce Y flag de procesamiento
      if (isProcessingShopClick || (now - lastShopInteractionTime < SHOP_DEBOUNCE_THRESHOLD)) {
          console.log("[main.ts] Interacción tienda ignorada (debounce/processing).");
          return;
      }

      isProcessingShopClick = true; // Marcar como procesando
      lastShopInteractionTime = now;
      console.log(`[main.ts] Procesando interacción botón tienda (Tipo: ${event.type}).`);

      // Asegurar que gameManager exista
      if (!gameManager) {
          console.error("[main.ts] ERROR: gameManager no está definido al intentar abrir la tienda.");
          isProcessingShopClick = false; // Liberar flag
          return;
      }

      // Asegurar que audio esté inicializado
      const audioManager = gameManager.getAudioManager();
      if (!audioManager.isReady()) {
          console.log("[main.ts] Inicializando audio desde listener tienda...");
          audioManager.init();
      }

      // Llamar a openShop
      try {
          gameManager.openShop();
      } catch (error) {
          console.error("[main.ts] Error llamando a gameManager.openShop():", error);
      } finally {
          // Liberar el flag después de un pequeño delay para asegurar que no haya reentrada inmediata
          setTimeout(() => {
              isProcessingShopClick = false;
          }, 50);
      }
  };

  // Limpiar listeners anteriores por si acaso (buena práctica)
  shopButtonElement.removeEventListener('click', handleShopButtonInteraction);
  shopButtonElement.removeEventListener('touchstart', handleShopButtonInteraction);

  // Añadir nuevos listeners
  shopButtonElement.addEventListener('click', handleShopButtonInteraction);
  shopButtonElement.addEventListener('touchstart', handleShopButtonInteraction, { passive: false }); // Mantener passive: false

} else {
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