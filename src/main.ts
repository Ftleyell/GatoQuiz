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

  // --- INICIO: Inicialización de Audio por Interacción ---
  // Función para inicializar el audio con la primera interacción del usuario
  const initializeAudioOnInteraction = () => {
    // Comprobar si el audio manager ya está listo para evitar reintentos innecesarios
    if (!gameManager.getAudioManager().isReady()) {
        console.log('User interaction detected, attempting to initialize audio...');
        gameManager.getAudioManager().init(); // Llama a init del AudioManager
    } else {
        console.log('Audio already initialized, removing listeners.');
    }
    // Remover listeners después del primer intento, independientemente del éxito,
    // ya que init() maneja internamente el estado 'isInitialized'.
    // Usar { once: true } al añadir los listeners es aún mejor.
    // document.body.removeEventListener('click', initializeAudioOnInteraction);
    // document.body.removeEventListener('touchstart', initializeAudioOnInteraction);
  };

  // Añadir listeners para la primera interacción usando { once: true }
  console.log('Adding one-time listeners for audio initialization...');
  document.body.addEventListener('click', initializeAudioOnInteraction, { once: true });
  document.body.addEventListener('touchstart', initializeAudioOnInteraction, { once: true });
  // --- FIN: Inicialización de Audio por Interacción ---


  // Iniciar el juego (GameManager se inicializará, cargará datos, etc.)
  gameManager.init()
    .then(() => {
      gameManager.create(); // Esto debería llevar al MainMenuState
      gameManager.start(); // Inicia el bucle de juego
      console.log('GameManager inicializado y arrancado.');
    })
    .catch(error => {
      console.error("Error durante la inicialización del juego:", error);
      appElement.innerHTML = `Error al cargar el juego: ${error.message}. Revisa la consola.`; // Mostrar error
    });
}