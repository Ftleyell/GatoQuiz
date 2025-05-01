// src/systems/PhysicsManager.ts

import Matter from 'matter-js';
import { CatManager } from './CatManager'; // Asegúrate que la ruta sea correcta

// Constantes de Colisión
const WALL_COLLISION_CATEGORY = 0x0001;
const CAT_COLLISION_CATEGORY = 0x0002;
const WALL_THICKNESS = 60;

/**
 * PhysicsManager: Encapsula la configuración y el control del motor de física Matter.js,
 * incluyendo los límites del mundo dinámicos y la detección de colisiones.
 */
export class PhysicsManager {
  private engine!: Matter.Engine;
  private world!: Matter.World;
  private runner!: Matter.Runner;
  private ground!: Matter.Body;
  private leftWall!: Matter.Body;
  private rightWall!: Matter.Body;
  private topWall!: Matter.Body;
  private resizeListener: () => void;

  private catManager: CatManager; // Referencia a CatManager
  private mouseConstraint?: Matter.MouseConstraint; // Referencia al constraint del mouse

  /**
   * Crea una instancia de PhysicsManager.
   * @param catManager - Instancia del CatManager para comunicar colisiones.
   */
  constructor(catManager: CatManager) {
    console.log('PhysicsManager Creado');
    this.catManager = catManager; // Guardar instancia
    this.resizeListener = this.handleResize.bind(this);
  }

  /**
   * Inicializa el motor de física, crea el mundo, las paredes,
   * el constraint del mouse y añade los listeners necesarios.
   * @param containerElement - El elemento HTML sobre el cual operará el MouseConstraint.
   */
  public init(containerElement: HTMLElement): void {
    console.log('PhysicsManager: init');

    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.runner = Matter.Runner.create();

    // Configuración del motor
    this.engine.gravity.y = 0.8;
    this.engine.gravity.x = 0;
    this.engine.enableSleeping = true; // Optimización importante

    console.log('Matter.js Engine, World, Runner creados.');

    this.createWalls(); // Crear límites del mundo
    this.setupMouseConstraint(containerElement); // Configurar interacción del mouse

    // Añadir listener para eventos de colisión
    console.log("PhysicsManager: Añadiendo listener 'collisionStart'...");
    Matter.Events.on(this.engine, 'collisionStart', (event) => this.handleCollisions(event));

    // Añadir listener para redimensionar ventana
    window.addEventListener('resize', this.resizeListener);
    // console.log('PhysicsManager: Listener de resize añadido.'); // Log menos verboso
  }

  /**
   * Crea los cuerpos estáticos que definen los límites del mundo.
   */
  private createWalls(): void {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Crear cuerpos rectangulares estáticos
      this.ground = Matter.Bodies.rectangle(
        width / 2, height + WALL_THICKNESS / 2, // Posición (debajo)
        width, WALL_THICKNESS, // Dimensiones
        { isStatic: true, label: 'ground', collisionFilter: { category: WALL_COLLISION_CATEGORY } }
      );
      this.leftWall = Matter.Bodies.rectangle(
        -WALL_THICKNESS / 2, height / 2, // Posición (izquierda)
        WALL_THICKNESS, height,
        { isStatic: true, label: 'leftWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } }
      );
      this.rightWall = Matter.Bodies.rectangle(
        width + WALL_THICKNESS / 2, height / 2, // Posición (derecha)
        WALL_THICKNESS, height,
        { isStatic: true, label: 'rightWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } }
      );
      this.topWall = Matter.Bodies.rectangle(
        width / 2, -WALL_THICKNESS / 2, // Posición (arriba)
        width, WALL_THICKNESS,
        { isStatic: true, label: 'topWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } }
      );

      // Añadir las paredes al mundo
      Matter.World.add(this.world, [this.ground, this.leftWall, this.rightWall, this.topWall]);
      // console.log('PhysicsManager: Paredes estáticas creadas.'); // Log menos verboso
  }

  /**
   * Configura el constraint del mouse para permitir arrastrar los gatos.
   * @param mouseElement - El elemento HTML que capturará los eventos del mouse.
   */
  private setupMouseConstraint(mouseElement: HTMLElement): void {
       const mouse = Matter.Mouse.create(mouseElement);
       this.mouseConstraint = Matter.MouseConstraint.create(this.engine, {
           mouse: mouse,
           constraint: {
               stiffness: 0.1, // Rigidez del "resorte" al arrastrar
               render: { visible: false } // No mostrar el constraint visualmente
           }
       });
       // Configurar para que el mouse solo interactúe con cuerpos de categoría CAT
       this.mouseConstraint.collisionFilter.mask = CAT_COLLISION_CATEGORY;

       Matter.World.add(this.world, this.mouseConstraint);
       // console.log('PhysicsManager: MouseConstraint añadido.'); // Log menos verboso
       this.updateMouseConstraintOffset(); // Calcular offset inicial
  }

  /**
   * Actualiza el offset del mouse para corregir coordenadas si el elemento base
   * no está en la esquina superior izquierda de la ventana.
   */
  private updateMouseConstraintOffset(): void {
      if (this.mouseConstraint && this.mouseConstraint.mouse.element) {
          const bounds = this.mouseConstraint.mouse.element.getBoundingClientRect();
          // El offset debe ser negativo para compensar la posición del elemento
          Matter.Mouse.setOffset(this.mouseConstraint.mouse, { x: -bounds.left, y: -bounds.top });
      }
  }

  /**
   * Manejador para el evento 'collisionStart' de Matter.js.
   * Detecta colisiones entre gatos y llama a CatManager si es una colisión
   * iniciada por el jugador (arrastrando un gato sobre otro).
   * @param event - El objeto del evento de colisión.
   */
  private handleCollisions(event: Matter.IEventCollision<Matter.Engine>): void {
      // LOG 1
      // console.log("PhysicsManager: CollisionStart event detectado!");
      const pairs = event.pairs;

      for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i];
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;

          // Verificar si ambos cuerpos existen y tienen la etiqueta 'cat'
          const labelA = bodyA?.label;
          const labelB = bodyB?.label;
          const isBodyACat = labelA === 'cat';
          const isBodyBCat = labelB === 'cat';

          if (isBodyACat && isBodyBCat) {
              // LOG 2
              // console.log(`  -> Cat-vs-Cat collision: Body ${bodyA.id} (label:${labelA}) vs Body ${bodyB.id} (label:${labelB})`);

              // Verificar si exactamente UNO de los gatos está siendo arrastrado
              const isDraggingA = this.mouseConstraint?.body === bodyA;
              const isDraggingB = this.mouseConstraint?.body === bodyB;

              // *** CONDICIÓN PRINCIPAL: Procesar solo si es un arrastre ***
              if (isDraggingA !== isDraggingB) {
                  // LOG 3
                  console.log(`    --> Processing collision (Player Drag Eat Attempt!) DraggingA: ${isDraggingA}, DraggingB: ${isDraggingB}`);

                  // Asegurar que los IDs existen antes de llamar a CatManager
                  if (typeof bodyA.id !== 'undefined' && typeof bodyB.id !== 'undefined') {
                      // Identificar cuál es el ID del cuerpo que está siendo arrastrado
                      const draggerBodyId = isDraggingA ? bodyA.id : bodyB.id;
                      // Llamar al método específico en CatManager
                      this.catManager.processPlayerInitiatedCollision(bodyA.id, bodyB.id, draggerBodyId);
                  } else {
                      console.error("    --> Error: Uno o ambos body IDs son undefined en la colisión gato-gato.");
                  }
              } else if (!isDraggingA && !isDraggingB) {
                  // LOG 4 - Colisión automática ignorada (comportamiento deseado ahora)
                   // console.log(`    --> Ignoring collision (Automatic collision, neither cat dragged).`);
              } else {
                  // LOG X - Ambos arrastrados (improbable)
                   // console.log(`    --> Ignoring collision (Both cats somehow dragged?).`);
              }
              // ********************************************************
          }
      }
  }

  /**
   * Manejador para el evento 'resize' de la ventana.
   * Ajusta la posición y tamaño de las paredes del mundo físico.
   */
  private handleResize(): void {
    if (!this.ground || !this.leftWall || !this.rightWall || !this.topWall) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    // console.log(`PhysicsManager: Redimensionando paredes a ${width}x${height}`); // Log menos verboso

    try {
        // Actualizar Suelo
        Matter.Body.setPosition(this.ground, { x: width / 2, y: height + WALL_THICKNESS / 2 });
        Matter.Body.setVertices(this.ground, Matter.Vertices.fromPath(
            `L ${-width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${WALL_THICKNESS / 2} L ${-width / 2} ${WALL_THICKNESS / 2}`
        ));
        // Actualizar Pared Izquierda
        Matter.Body.setPosition(this.leftWall, { x: -WALL_THICKNESS / 2, y: height / 2 });
        Matter.Body.setVertices(this.leftWall, Matter.Vertices.fromPath(
            `L ${-WALL_THICKNESS / 2} ${-height / 2} L ${WALL_THICKNESS / 2} ${-height / 2} L ${WALL_THICKNESS / 2} ${height / 2} L ${-WALL_THICKNESS / 2} ${height / 2}`
        ));
        // Actualizar Pared Derecha
        Matter.Body.setPosition(this.rightWall, { x: width + WALL_THICKNESS / 2, y: height / 2 });
        Matter.Body.setVertices(this.rightWall, Matter.Vertices.fromPath(
            `L ${-WALL_THICKNESS / 2} ${-height / 2} L ${WALL_THICKNESS / 2} ${-height / 2} L ${WALL_THICKNESS / 2} ${height / 2} L ${-WALL_THICKNESS / 2} ${height / 2}`
        ));
        // Actualizar Techo
        Matter.Body.setPosition(this.topWall, { x: width / 2, y: -WALL_THICKNESS / 2 });
        Matter.Body.setVertices(this.topWall, Matter.Vertices.fromPath(
            `L ${-width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${WALL_THICKNESS / 2} L ${-width / 2} ${WALL_THICKNESS / 2}`
        ));
        // console.log("PhysicsManager: Límites del mundo actualizados."); // Log menos verboso
        this.updateMouseConstraintOffset(); // Actualizar offset del mouse
    } catch (error) {
        console.error("PhysicsManager: Error actualizando límites en resize:", error);
    }
  }

  /**
   * Inicia el Runner de Matter.js para que la simulación física comience.
   */
  public start(): void {
     if (!this.engine || !this.runner) {
       console.error("PhysicsManager: init() debe ser llamado antes de start().");
       return;
     }
     // console.log('PhysicsManager: Iniciando Runner...'); // Log menos verboso
     Matter.Runner.run(this.runner, this.engine);
     // console.log('PhysicsManager: Runner iniciado.'); // Log menos verboso
  }

  /**
   * Detiene el Runner de Matter.js.
   */
  public stop(): void {
     if (!this.runner) {
       console.warn("PhysicsManager: Runner no inicializado, no se puede detener.");
       return;
     }
     // console.log('PhysicsManager: Deteniendo Runner...'); // Log menos verboso
     Matter.Runner.stop(this.runner);
     // console.log('PhysicsManager: Runner detenido.'); // Log menos verboso
  }

  /**
   * Limpia recursos y listeners al detener el juego.
   */
  public shutdown(): void {
      console.log('PhysicsManager: shutdown');
      this.stop(); // Detener el runner

      // Remover listeners
      if (this.engine) {
          // Remover el listener específico que añadimos
          const boundHandler = this.handleCollisions.bind(this); // Necesitamos la misma referencia
          Matter.Events.off(this.engine, 'collisionStart', boundHandler);
          // O, si es el único listener de 'collisionStart': Matter.Events.off(this.engine, 'collisionStart');
          console.log("PhysicsManager: Listener 'collisionStart' removido.");
      }
      window.removeEventListener('resize', this.resizeListener);
      // console.log('PhysicsManager: Listener de resize removido.'); // Log menos verboso

      // Opcional: Limpiar el mundo y el engine si es necesario
      // if (this.world) Matter.World.clear(this.world, false);
      // if (this.engine) Matter.Engine.clear(this.engine);
  }

  // --- Getters ---
  public getEngine(): Matter.Engine {
    if (!this.engine) throw new Error("PhysicsManager no inicializado.");
    return this.engine;
  }
  public getWorld(): Matter.World {
    if (!this.world) throw new Error("PhysicsManager no inicializado.");
    return this.world;
  }

} // Fin PhysicsManager
