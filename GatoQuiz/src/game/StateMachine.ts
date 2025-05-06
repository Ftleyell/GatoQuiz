// src/game/StateMachine.ts

/**
 * Interfaz que deben implementar todos los objetos de estado
 * gestionados por la StateMachine.
 */
export interface IState {
  /** Se ejecuta al entrar en este estado. */
  enter(params?: any): void;
  /** Se ejecuta al salir de este estado. */
  exit(): void;
  /** Se ejecuta en cada frame mientras este estado esté activo. */
  update(deltaTime: number): void;
}

/**
 * StateMachine: Gestiona una colección de estados y las transiciones entre ellos.
 */
export class StateMachine {
  private states: Map<string, IState> = new Map();
  private currentState: IState | null = null;
  private currentStateName: string | null = null;

// Dentro de la clase StateMachine en StateMachine.ts
/* // ELIMINADO - Esta era la definición duplicada
public getCurrentState(): IState | null {
  return this.currentState;
}
*/
  /**
   * Añade un nuevo estado a la máquina.
   * @param name - Nombre único para identificar el estado.
   * @param stateObject - Instancia de un objeto que implementa IState.
   */
  public addState(name: string, stateObject: IState): void {
    if (this.states.has(name)) {
      console.warn(`StateMachine: El estado '${name}' ya existe. Sobrescribiendo.`);
    }
    this.states.set(name, stateObject);
    console.log(`StateMachine: Estado '${name}' añadido.`);
  }

  /**
   * Cambia el estado activo de la máquina.
   * @param name - Nombre del estado al que se quiere cambiar.
   * @param enterParams - Parámetros opcionales para pasar al método enter() del nuevo estado.
   */
  public changeState(name: string, enterParams?: any): void {
    console.log(`StateMachine: Intentando cambiar a estado '${name}'...`);

    // *** AÑADIDO DEBUG LOG ***
    // Muestra las claves (nombres de estado) que la máquina conoce AHORA MISMO
    console.log(`StateMachine: Verificando estado '${name}'. Estados actuales registrados:`, Array.from(this.states.keys()));
    // ***********************

    if (!this.states.has(name)) {
      // El error que estás viendo
      console.error(`StateMachine: El estado '${name}' no existe.`);
      // Mostrar el mapa completo para más detalles
      console.error(`StateMachine: Detalle del mapa de estados:`, this.states);
      return; // Detener la transición si no se encuentra
    }

    // Salir del estado actual (con manejo de errores)
    if (this.currentState?.exit) { // Usar optional chaining
      console.log(`StateMachine: Saliendo del estado '${this.currentStateName}'`);
      try {
           this.currentState.exit();
      } catch (e) {
          console.error(`StateMachine: Error durante exit() del estado '${this.currentStateName}':`, e);
      }
    }

    // Actualizar estado actual
    this.currentStateName = name;
    this.currentState = this.states.get(name) ?? null;

    // Entrar al nuevo estado (con manejo de errores)
    if (this.currentState?.enter) { // Usar optional chaining
      console.log(`StateMachine: Entrando al estado '${this.currentStateName}'`);
       try {
          this.currentState.enter(enterParams);
      } catch (e) {
          console.error(`StateMachine: Error durante enter() del estado '${this.currentStateName}':`, e);
          // Considerar cambiar a un estado de error o manejar de otra forma
      }
    }
  }

  /**
   * Llama al método update() del estado actualmente activo (con manejo de errores).
   * @param deltaTime - Tiempo transcurrido desde el último frame en segundos.
   */
  public update(deltaTime: number): void {
    if (this.currentState?.update) { // Usar optional chaining
       try {
          this.currentState.update(deltaTime);
      } catch (e) {
          console.error(`StateMachine: Error durante update() del estado '${this.currentStateName}':`, e);
          // Considerar cambiar a un estado de error o manejar de otra forma
      }
    }
  }

  /**
   * Obtiene el nombre del estado actual.
   * @returns El nombre del estado activo o null si no hay ninguno.
   */
   public getCurrentStateName(): string | null {
    return this.currentStateName;
  }
      // *** MÉTODO MANTENIDO *** (La definición duplicada fue eliminada)
    /**
     * Obtiene la instancia del estado actualmente activo.
     * @returns La instancia de IState activa o null si no hay ninguna.
     */
    public getCurrentState(): IState | null {
      return this.currentState;
  }
  // *********************
}