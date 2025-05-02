// src/systems/PhysicsManager.ts

import Matter from 'matter-js';
import { CatManager } from './CatManager';
import { CatFoodManager } from './CatFoodManager'; // <-- NUEVO: Importar CatFoodManager
import { GameManager } from '../game/GameManager'; // <-- NUEVO: Importar GameManager

// --- Constantes de Colisión ---
const WALL_COLLISION_CATEGORY = 0x0001;
const CAT_COLLISION_CATEGORY = 0x0002;
const INK_COLLISION_CATEGORY = 0x0004; // Asegúrate que coincida
const FOOD_PELLET_COLLISION_CATEGORY = 0x0008; // Asegúrate que coincida
const WALL_THICKNESS = 60;
const MAX_CAT_SPEED = 70;
// ----------------------------

/**
 * PhysicsManager: Encapsula Matter.js, límites, colisiones y límite de velocidad.
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
  private catFoodManager!: CatFoodManager; // <-- NUEVO: Referencia a CatFoodManager
  private mouseConstraint?: Matter.MouseConstraint;

  private collisionHandler: (event: Matter.IEventCollision<Matter.Engine>) => void;
  private speedLimitHandler: () => void;

  /**
   * Crea una instancia de PhysicsManager.
   * @param catManager - Instancia del CatManager para colisiones gato-gato.
   * @param catFoodManager - Instancia del CatFoodManager para colisiones gato-comida. // <-- NUEVO PARÁMETRO
   */
  constructor(catManager: CatManager, catFoodManager: CatFoodManager) { // <-- NUEVO PARÁMETRO
    console.log('PhysicsManager Creado');
    this.catManager = catManager;
    this.catFoodManager = catFoodManager; // <-- GUARDAR REFERENCIA
    this.resizeListener = this.handleResize.bind(this);
    this.collisionHandler = this.handleCollisions.bind(this);
    this.speedLimitHandler = this.limitAllCatSpeeds.bind(this);
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
    console.log("PhysicsManager: Añadiendo listeners...");
    Matter.Events.on(this.engine, 'collisionStart', this.collisionHandler);
    Matter.Events.on(this.engine, 'beforeUpdate', this.speedLimitHandler);
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

  /**
   * Manejador para el evento 'collisionStart' de Matter.js.
   * Detecta colisiones gato-gato (iniciadas por jugador) y gato-comida.
   * @param event - El objeto del evento de colisión.
   */
  // MODIFICADO: Añade detección de colisión gato-comida
  private handleCollisions(event: Matter.IEventCollision<Matter.Engine>): void {
      const pairs = event.pairs;

      for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i];
          const bodyA = pair.bodyA;
          const bodyB = pair.bodyB;

          // Identificar etiquetas
          const labelA = bodyA?.label;
          const labelB = bodyB?.label;

          // --- Lógica Gato vs Gato (para comer/fusionar por arrastre) ---
          if (labelA === 'cat' && labelB === 'cat') {
              const isDraggingA = this.mouseConstraint?.body === bodyA;
              const isDraggingB = this.mouseConstraint?.body === bodyB;
              // Solo procesar si exactamente uno está siendo arrastrado
              if (isDraggingA !== isDraggingB) {
                  if (typeof bodyA.id !== 'undefined' && typeof bodyB.id !== 'undefined') {
                      const draggerBodyId = isDraggingA ? bodyA.id : bodyB.id;
                      this.catManager.processPlayerInitiatedCollision(bodyA.id, bodyB.id, draggerBodyId);
                  } else { console.error("Error: IDs indefinidos en colisión gato-gato."); }
              }
          }
          // --- Lógica Gato vs Comida ---
          else if ((labelA === 'cat' && labelB === 'foodPellet') || (labelA === 'foodPellet' && labelB === 'cat')) {
              const catBody = (labelA === 'cat') ? bodyA : bodyB;
              const foodBody = (labelA === 'foodPellet') ? bodyA : bodyB;

              // Verificar que los IDs existan y llamar al CatFoodManager
              if (typeof catBody.id !== 'undefined' && foodBody) {
                   // Pasar el ID del cuerpo del gato y el cuerpo completo de la comida
                   this.catFoodManager.processCatFoodCollision(catBody.id, foodBody);
              } else {
                   console.warn("Colisión Gato-Comida detectada pero falta ID de gato o cuerpo de comida.");
              }
          }
          // --- Podrías añadir más tipos de colisión aquí (ej: gato vs tinta) ---
          // else if ((labelA === 'cat' && labelB === 'inkLine') || (labelA === 'inkLine' && labelB === 'cat')) {
          //    // Lógica para interacción gato-tinta si es necesaria
          // }
      }
  }

  // limitAllCatSpeeds (Sin cambios)
  private limitAllCatSpeeds(): void {
      if (!this.world) return;
      const bodies = Matter.Composite.allBodies(this.world);
      for (let i = 0; i < bodies.length; i++) {
          const body = bodies[i];
          if (!body.isStatic && body.label === 'cat') {
              const speed = Matter.Vector.magnitude(body.velocity);
              if (speed > MAX_CAT_SPEED) {
                  const normalizedVelocity = Matter.Vector.normalise(body.velocity);
                  const cappedVelocity = Matter.Vector.mult(normalizedVelocity, MAX_CAT_SPEED);
                  Matter.Body.setVelocity(body, cappedVelocity);
              }
          }
      }
  }

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
     if (!this.runner) { console.warn("PhysicsManager: Runner no inicializado."); return; }
     Matter.Runner.stop(this.runner);
  }

  // shutdown (Sin cambios respecto a la versión anterior)
  public shutdown(): void {
      console.log('PhysicsManager: shutdown');
      this.stop();
      if (this.engine) {
          Matter.Events.off(this.engine, 'collisionStart', this.collisionHandler);
          Matter.Events.off(this.engine, 'beforeUpdate', this.speedLimitHandler);
          console.log("PhysicsManager: Listeners de engine removidos.");
      } else { console.warn("PhysicsManager shutdown: Engine no encontrado."); }
      window.removeEventListener('resize', this.resizeListener);
  }

  // Getters (Sin cambios)
  public getEngine(): Matter.Engine { if (!this.engine) throw new Error("PhysicsManager no inicializado."); return this.engine; }
  public getWorld(): Matter.World { if (!this.world) throw new Error("PhysicsManager no inicializado."); return this.world; }

} // Fin PhysicsManager
