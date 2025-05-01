// src/systems/PhysicsManager.ts

import Matter from 'matter-js';

// Constantes para las paredes y colisiones
const WALL_THICKNESS = 60; // Grosor de las paredes invisibles fuera de la pantalla
const WALL_COLLISION_CATEGORY = 0x0001; // Categoría para paredes
const CAT_COLLISION_CATEGORY = 0x0002; // Categoría para gatos (asegúrate que sea la misma en CatManager)

/**
 * PhysicsManager: Encapsula la configuración y el control del motor de física Matter.js,
 * incluyendo los límites del mundo dinámicos.
 */
export class PhysicsManager {
  private engine!: Matter.Engine;
  private world!: Matter.World;
  private runner!: Matter.Runner;

  // Referencias a las paredes para poder actualizarlas
  private ground!: Matter.Body;
  private leftWall!: Matter.Body;
  private rightWall!: Matter.Body;
  private topWall!: Matter.Body;

  // Referencia al listener para poder quitarlo
  private resizeListener: () => void;

  constructor() {
    console.log('PhysicsManager Creado (sin inicializar)');
    // Inicializar la referencia del listener (importante para bind y removeEventListener)
    this.resizeListener = this.handleResize.bind(this);
  }

  public init(): void {
    console.log('PhysicsManager: init');

    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.runner = Matter.Runner.create();

    // Configuración del mundo (ej: gravedad, sleeping)
    this.engine.gravity.y = 0.8; // Gravedad estándar hacia abajo
    this.engine.gravity.x = 0;
    this.engine.enableSleeping = true; // Optimización importante!

    console.log('Matter.js Engine, World, Runner creados.');

    // Crear las paredes iniciales
    this.createWalls();

    // Añadir listener para resize
    window.addEventListener('resize', this.resizeListener);
    console.log('PhysicsManager: Listener de resize añadido.');
  }

  /**
   * Crea los cuerpos estáticos que definen los límites del mundo.
   */
  private createWalls(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Crear cuerpos rectangulares estáticos
    this.ground = Matter.Bodies.rectangle(
      width / 2, height + WALL_THICKNESS / 2, // Posición (debajo de la pantalla)
      width, WALL_THICKNESS, // Dimensiones
      { isStatic: true, label: 'ground', collisionFilter: { category: WALL_COLLISION_CATEGORY } }
    );
    this.leftWall = Matter.Bodies.rectangle(
      -WALL_THICKNESS / 2, height / 2, // Posición (izquierda de la pantalla)
      WALL_THICKNESS, height,
      { isStatic: true, label: 'leftWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } }
    );
    this.rightWall = Matter.Bodies.rectangle(
      width + WALL_THICKNESS / 2, height / 2, // Posición (derecha de la pantalla)
      WALL_THICKNESS, height,
      { isStatic: true, label: 'rightWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } }
    );
    this.topWall = Matter.Bodies.rectangle(
      width / 2, -WALL_THICKNESS / 2, // Posición (encima de la pantalla)
      width, WALL_THICKNESS,
      { isStatic: true, label: 'topWall', collisionFilter: { category: WALL_COLLISION_CATEGORY } }
    );

    // Añadir las paredes al mundo
    Matter.World.add(this.world, [this.ground, this.leftWall, this.rightWall, this.topWall]);
    console.log('PhysicsManager: Paredes estáticas creadas y añadidas al mundo.');

    // Configurar MouseConstraint (si se usa para arrastrar gatos)
    this.setupMouseConstraint();
  }

  /**
   * Configura el constraint del mouse para interacción.
   */
  private setupMouseConstraint(): void {
       // Asegúrate de que el elemento sobre el que se crea el mouse exista (ej: body o un canvas específico)
       const mouseElement = document.body; // O un canvas si lo usas para el render
       const mouse = Matter.Mouse.create(mouseElement);
       const mouseConstraint = Matter.MouseConstraint.create(this.engine, {
           mouse: mouse,
           constraint: {
               stiffness: 0.1, // Reducir un poco la rigidez para un arrastre más suave
               render: { visible: false } // No renderizar el constraint visualmente
           }
       });

       // Configurar el filtro de colisión del mouse para que SOLO interactúe con gatos
       mouseConstraint.collisionFilter.mask = CAT_COLLISION_CATEGORY;

       Matter.World.add(this.world, mouseConstraint);
       // Guardar referencia si necesitas accederla (ej: para saber si se está arrastrando algo)
       // this.mouseConstraint = mouseConstraint;
       console.log('PhysicsManager: MouseConstraint añadido (interactúa con gatos).');

       // Consideración: Si usas un canvas sobre el body, ajusta las coordenadas del mouse
       // Matter.Mouse.setOffset(mouse, { x: canvasRect.left, y: canvasRect.top });
  }


  /**
   * Maneja el evento de redimensionamiento de la ventana,
   * ajustando la posición y tamaño de las paredes.
   */
  private handleResize(): void {
    if (!this.ground || !this.leftWall || !this.rightWall || !this.topWall) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    console.log(`PhysicsManager: Redimensionando paredes a ${width}x${height}`);

    try {
        // Actualizar Suelo (Ground)
        Matter.Body.setPosition(this.ground, { x: width / 2, y: height + WALL_THICKNESS / 2 });
        // Recalcular vértices para el nuevo ancho
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

        // Actualizar Techo (Top Wall)
        Matter.Body.setPosition(this.topWall, { x: width / 2, y: -WALL_THICKNESS / 2 });
        Matter.Body.setVertices(this.topWall, Matter.Vertices.fromPath(
            `L ${-width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${-WALL_THICKNESS / 2} L ${width / 2} ${WALL_THICKNESS / 2} L ${-width / 2} ${WALL_THICKNESS / 2}`
        ));

        console.log("PhysicsManager: Límites del mundo actualizados.");

        // Si usas MouseConstraint, actualiza su offset si el elemento base cambió de tamaño/posición
        // const mouseConstraint = this.world.mouseConstraint;
        // if (mouseConstraint && mouseConstraint.mouse.element) {
        //      const bounds = mouseConstraint.mouse.element.getBoundingClientRect();
        //      Matter.Mouse.setOffset(mouseConstraint.mouse, { x: bounds.left, y: bounds.top });
        // }

    } catch (error) {
        console.error("PhysicsManager: Error actualizando límites en resize:", error);
    }
  }


  public start(): void {
    if (!this.engine || !this.runner) {
       console.error("PhysicsManager: init() debe ser llamado antes de start().");
       return;
     }
    console.log('PhysicsManager: Iniciando Runner...');
    Matter.Runner.run(this.runner, this.engine);
    console.log('PhysicsManager: Runner iniciado.');
  }

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
   * Limpia recursos, como el listener de resize.
   */
  public shutdown(): void {
      console.log('PhysicsManager: shutdown');
      this.stop();
      window.removeEventListener('resize', this.resizeListener);
      console.log('PhysicsManager: Listener de resize removido.');
      // Aquí podrías añadir limpieza adicional si es necesario, como limpiar el world.
      // Matter.World.clear(this.world, false); // false para no quitar el engine
      // Matter.Engine.clear(this.engine);
  }


  public getEngine(): Matter.Engine {
    if (!this.engine) throw new Error("PhysicsManager no inicializado.");
    return this.engine;
  }

  public getWorld(): Matter.World {
    if (!this.world) throw new Error("PhysicsManager no inicializado.");
    return this.world;
  }

} // Fin de la clase PhysicsManager