// src/systems/PhysicsManager.ts

// Importar Matter.js - Asegúrate de que esté instalado y configurado en tsconfig si es necesario
import Matter from 'matter-js';

/**
 * PhysicsManager: Encapsula la configuración y el control del motor de física Matter.js.
 * Sigue las directrices de las secciones 1 (Arquitectura) y 2.4 (Sistema de Física)
 * del gdd_tecnico_quiz_felino_v2.
 */
export class PhysicsManager {
  private engine!: Matter.Engine; // Se inicializa en init()
  private world!: Matter.World;   // Se inicializa en init()
  private runner!: Matter.Runner; // Se inicializa en init()

  constructor() {
    console.log('PhysicsManager Creado (sin inicializar)');
    // El motor se crea en init() para controlar el momento exacto.
  }

  /**
   * Inicializa el motor de física Matter.js, el mundo y el corredor.
   * Debe llamarse antes de usar cualquier funcionalidad de física.
   */
  public init(): void {
    console.log('PhysicsManager: init');

    // 1. Crear el motor de física
    // Referencia: GDD Sección 1 y 2.4
    this.engine = Matter.Engine.create();
    console.log('Matter.js Engine creado.');

    // Opcional: Configurar gravedad u otras propiedades del mundo aquí si es necesario
    // this.engine.world.gravity.y = 1.0; // Ejemplo: Gravedad estándar
    // Referencia: GDD Sección 2.4 (Propiedades específicas del mundo)

    // 2. Obtener referencia al mundo
    this.world = this.engine.world;
    console.log('Referencia a Matter.js World obtenida.');

    // 3. Crear el corredor (Runner)
    // El Runner es responsable de ejecutar el Engine a intervalos regulares (tick).
    // Referencia: GDD Sección 2.4 (Uso de Runner para el bucle de física)
    this.runner = Matter.Runner.create();
    console.log('Matter.js Runner creado.');

    // Configuración adicional del Runner si es necesaria (ej: isFixed, delta)
    // this.runner.isFixed = false; // Para usar un deltaTime variable (más suave con requestAnimationFrame)
    // this.runner.delta = 1000 / 60; // Si se prefiere un paso de tiempo fijo (ej: 60 FPS)
  }

  /**
   * Inicia la simulación física ejecutando el Runner con el Engine.
   */
  public start(): void {
    if (!this.engine || !this.runner) {
       console.error("PhysicsManager: init() debe ser llamado antes de start().");
       return;
     }
    console.log('PhysicsManager: Iniciando Runner...');
    Matter.Runner.run(this.runner, this.engine);
    console.log('PhysicsManager: Runner iniciado.');
  }

  /**
   * Detiene la simulación física deteniendo el Runner.
   */
  public stop(): void {
     if (!this.runner) {
       console.warn("PhysicsManager: Runner no inicializado, no se puede detener.");
       return;
     }
    console.log('PhysicsManager: Deteniendo Runner...');
    Matter.Runner.stop(this.runner);
    console.log('PhysicsManager: Runner detenido.');
  }

  /**
   * Devuelve la instancia del motor de física Matter.js.
   * @returns {Matter.Engine} La instancia del motor.
   */
  public getEngine(): Matter.Engine {
    if (!this.engine) throw new Error("PhysicsManager no inicializado.");
    return this.engine;
  }

  /**
   * Devuelve la instancia del mundo de física Matter.js.
   * @returns {Matter.World} La instancia del mundo.
   */
  public getWorld(): Matter.World {
    if (!this.world) throw new Error("PhysicsManager no inicializado.");
    return this.world;
  }

  /**
   * Opcional: Método para limpieza si fuera necesario (ej: quitar listeners específicos)
   */
  // public shutdown(): void {
  //   console.log('PhysicsManager: shutdown');
  //   this.stop();
  //   // Cualquier otra limpieza específica de Matter.js aquí
  // }
}