// src/systems/PhysicsManager.ts

import Matter from 'matter-js';
import { CatManager } from './CatManager'; // Asegúrate que la ruta sea correcta

// Constantes de Colisión
const WALL_COLLISION_CATEGORY = 0x0001;
const CAT_COLLISION_CATEGORY = 0x0002;
const INK_COLLISION_CATEGORY = 0x0004; // Asegúrate que coincida con CatManager e InkManager
const WALL_THICKNESS = 60;

// *** CONSTANTE AÑADIDA DEL GDD ALPHA ***
const MAX_CAT_SPEED = 70;
// **************************************

/**
 * PhysicsManager: Encapsula la configuración y el control del motor de física Matter.js,
 * incluyendo los límites del mundo dinámicos, la detección de colisiones y el límite de velocidad.
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
  private catManager: CatManager;
  private mouseConstraint?: Matter.MouseConstraint;

  // Referencias a los handlers de eventos para poder removerlos
  private collisionHandler: (event: Matter.IEventCollision<Matter.Engine>) => void;
  private speedLimitHandler: () => void;

  constructor(catManager: CatManager) {
    console.log('PhysicsManager Creado');
    this.catManager = catManager;
    this.resizeListener = this.handleResize.bind(this);
    // Guardar referencia a los handlers BINDEADOS
    this.collisionHandler = this.handleCollisions.bind(this);
    this.speedLimitHandler = this.limitAllCatSpeeds.bind(this); // <-- Nuevo handler
  }

  public init(containerElement: HTMLElement): void {
    console.log('PhysicsManager: init');

    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.runner = Matter.Runner.create();

    this.engine.gravity.y = 0.8;
    this.engine.gravity.x = 0;
    this.engine.enableSleeping = true;

    console.log('Matter.js Engine, World, Runner creados.');

    this.createWalls();
    this.setupMouseConstraint(containerElement);

    // Añadir listeners de eventos usando los handlers guardados
    console.log("PhysicsManager: Añadiendo listeners...");
    Matter.Events.on(this.engine, 'collisionStart', this.collisionHandler);
    // *** AÑADIR LISTENER PARA LÍMITE DE VELOCIDAD ***
    Matter.Events.on(this.engine, 'beforeUpdate', this.speedLimitHandler);
    // *********************************************

    window.addEventListener('resize', this.resizeListener);
  }

  private createWalls(): void {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.ground = Matter.Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width, WALL_THICKNESS, { isStatic: true, label: 'ground', collisionFilter: { category: WALL_COLLISION_CATEGORY } });
      this.leftWall = Matter.Bodies.rectangle(-WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height, { isStatic: true, label: 'leftWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } });
      this.rightWall = Matter.Bodies.rectangle(width + WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height, { isStatic: true, label: 'rightWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } });
      this.topWall = Matter.Bodies.rectangle(width / 2, -WALL_THICKNESS / 2, width, WALL_THICKNESS, { isStatic: true, label: 'topWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } });
      Matter.World.add(this.world, [this.ground, this.leftWall, this.rightWall, this.topWall]);
  }

  private setupMouseConstraint(mouseElement: HTMLElement): void {
       const mouse = Matter.Mouse.create(mouseElement);
       this.mouseConstraint = Matter.MouseConstraint.create(this.engine, {
           mouse: mouse,
           constraint: { stiffness: 0.1, render: { visible: false } }
       });
       this.mouseConstraint.collisionFilter.mask = CAT_COLLISION_CATEGORY;
       Matter.World.add(this.world, this.mouseConstraint);
       this.updateMouseConstraintOffset();
  }

  private updateMouseConstraintOffset(): void {
      if (this.mouseConstraint && this.mouseConstraint.mouse.element) {
          const bounds = this.mouseConstraint.mouse.element.getBoundingClientRect();
          Matter.Mouse.setOffset(this.mouseConstraint.mouse, { x: -bounds.left, y: -bounds.top });
      }
  }

  // handleCollisions (Sin cambios)
  private handleCollisions(event: Matter.IEventCollision<Matter.Engine>): void {
      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i];
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;
          const isBodyACat = bodyA?.label === 'cat';
          const isBodyBCat = bodyB?.label === 'cat';

          if (isBodyACat && isBodyBCat) {
              const isDraggingA = this.mouseConstraint?.body === bodyA;
              const isDraggingB = this.mouseConstraint?.body === bodyB;
              if (isDraggingA !== isDraggingB) { // Solo procesar si uno está siendo arrastrado
                  if (typeof bodyA.id !== 'undefined' && typeof bodyB.id !== 'undefined') {
                      const draggerBodyId = isDraggingA ? bodyA.id : bodyB.id;
                      this.catManager.processPlayerInitiatedCollision(bodyA.id, bodyB.id, draggerBodyId);
                  } else { console.error("Error: IDs indefinidos en colisión gato-gato."); }
              }
          }
      }
  }

  // *** NUEVO MÉTODO PARA LIMITAR VELOCIDAD ***
  private limitAllCatSpeeds(): void {
      if (!this.world) return; // Asegurarse que el mundo existe

      const bodies = Matter.Composite.allBodies(this.world);
      for (let i = 0; i < bodies.length; i++) {
          const body = bodies[i];
          // Aplicar solo a cuerpos no estáticos y con etiqueta 'cat'
          if (!body.isStatic && body.label === 'cat') {
              const speed = Matter.Vector.magnitude(body.velocity);

              if (speed > MAX_CAT_SPEED) {
                  // Calcular velocidad normalizada (dirección)
                  const normalizedVelocity = Matter.Vector.normalise(body.velocity);
                  // Crear nuevo vector de velocidad con la magnitud máxima permitida
                  const cappedVelocity = Matter.Vector.mult(normalizedVelocity, MAX_CAT_SPEED);
                  // Establecer la nueva velocidad limitada
                  Matter.Body.setVelocity(body, cappedVelocity);
                   // Opcional: Limitar también velocidad angular si es necesario
                   // if (Math.abs(body.angularVelocity) > MAX_ANGULAR_SPEED) {
                   //    Matter.Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * MAX_ANGULAR_SPEED);
                   // }
              }
          }
      }
  }
  // ****************************************

  // handleResize (Sin cambios)
  private handleResize(): void {
    if (!this.ground || !this.leftWall || !this.rightWall || !this.topWall) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    try {
        Matter.Body.setPosition(this.ground, { x: width / 2, y: height + WALL_THICKNESS / 2 });
        Matter.Body.setVertices(this.ground, Matter.Vertices.fromPath(`L ${-width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${WALL_THICKNESS / 2} L ${-width / 2} ${WALL_THICKNESS / 2}`));
        Matter.Body.setPosition(this.leftWall, { x: -WALL_THICKNESS / 2, y: height / 2 });
        Matter.Body.setVertices(this.leftWall, Matter.Vertices.fromPath(`L ${-WALL_THICKNESS / 2} ${-height / 2} L ${WALL_THICKNESS / 2} ${-height / 2} L ${WALL_THICKNESS / 2} ${height / 2} L ${-WALL_THICKNESS / 2} ${height / 2}`));
        Matter.Body.setPosition(this.rightWall, { x: width + WALL_THICKNESS / 2, y: height / 2 });
        Matter.Body.setVertices(this.rightWall, Matter.Vertices.fromPath(`L ${-WALL_THICKNESS / 2} ${-height / 2} L ${WALL_THICKNESS / 2} ${-height / 2} L ${WALL_THICKNESS / 2} ${height / 2} L ${-WALL_THICKNESS / 2} ${height / 2}`));
        Matter.Body.setPosition(this.topWall, { x: width / 2, y: -WALL_THICKNESS / 2 });
        Matter.Body.setVertices(this.topWall, Matter.Vertices.fromPath(`L ${-width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${WALL_THICKNESS / 2} L ${-width / 2} ${WALL_THICKNESS / 2}`));
        this.updateMouseConstraintOffset();
    } catch (error) { console.error("PhysicsManager: Error actualizando límites en resize:", error); }
  }

  // start (Sin cambios)
  public start(): void {
     if (!this.engine || !this.runner) { console.error("PhysicsManager: init() debe ser llamado antes de start()."); return; }
     Matter.Runner.run(this.runner, this.engine);
  }

  // stop (Sin cambios)
  public stop(): void {
     if (!this.runner) { console.warn("PhysicsManager: Runner no inicializado, no se puede detener."); return; }
     Matter.Runner.stop(this.runner);
  }

  // MODIFICADO: Asegurar que se remuevan *ambos* listeners
  public shutdown(): void {
      console.log('PhysicsManager: shutdown');
      this.stop();

      // Remover listeners usando las referencias guardadas
      if (this.engine) {
          Matter.Events.off(this.engine, 'collisionStart', this.collisionHandler);
          Matter.Events.off(this.engine, 'beforeUpdate', this.speedLimitHandler); // <-- Remover nuevo listener
          console.log("PhysicsManager: Listeners de engine removidos.");
      } else {
          console.warn("PhysicsManager shutdown: Engine no encontrado para remover listeners.");
      }
      window.removeEventListener('resize', this.resizeListener);

      // Opcional: Limpiar mundo/engine
      // if (this.world) Matter.World.clear(this.world, false);
      // if (this.engine) Matter.Engine.clear(this.engine);
  }

  // Getters (Sin cambios)
  public getEngine(): Matter.Engine { if (!this.engine) throw new Error("PhysicsManager no inicializado."); return this.engine; }
  public getWorld(): Matter.World { if (!this.world) throw new Error("PhysicsManager no inicializado."); return this.world; }

} // Fin PhysicsManager