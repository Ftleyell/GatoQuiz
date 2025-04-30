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
    // Opcionalmente, podrías añadir un método render() si los estados manejan su propio renderizado
    // render?(): void;
  }
  
  /**
   * StateMachine: Gestiona una colección de estados y las transiciones entre ellos.
   * Diseñada para manejar los estados globales del juego, como se menciona
   * en Fase 1, paso 2 del flujo de trabajo.
   */
  export class StateMachine {
    private states: Map<string, IState> = new Map();
    private currentState: IState | null = null;
    private currentStateName: string | null = null;
  
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
     * Llama a exit() en el estado actual (si existe) y a enter() en el nuevo estado.
     * @param name - Nombre del estado al que se quiere cambiar.
     * @param enterParams - Parámetros opcionales para pasar al método enter() del nuevo estado.
     */
    public changeState(name: string, enterParams?: any): void {
      console.log(`StateMachine: Intentando cambiar a estado '${name}'...`);
      if (!this.states.has(name)) {
        console.error(`StateMachine: El estado '${name}' no existe.`);
        return;
      }
  
      if (this.currentState && this.currentState.exit) {
        console.log(`StateMachine: Saliendo del estado '${this.currentStateName}'`);
        this.currentState.exit();
      }
  
      this.currentStateName = name;
      this.currentState = this.states.get(name) ?? null;
  
      if (this.currentState && this.currentState.enter) {
        console.log(`StateMachine: Entrando al estado '${this.currentStateName}'`);
        this.currentState.enter(enterParams);
      }
    }
  
    /**
     * Llama al método update() del estado actualmente activo.
     * @param deltaTime - Tiempo transcurrido desde el último frame en segundos.
     */
    public update(deltaTime: number): void {
      if (this.currentState && this.currentState.update) {
        this.currentState.update(deltaTime);
      }
    }
  
    /**
     * Obtiene el nombre del estado actual.
     * @returns El nombre del estado activo o null si no hay ninguno.
     */
     public getCurrentStateName(): string | null {
      return this.currentStateName;
    }
  }