// src/systems/CatManager.ts

import { CatEntity } from '../game/entities/CatEntity';
import { PhysicsComponent } from '../game/components/PhysicsComponent';
import { RenderComponent } from '../game/components/RenderComponent';
import { ValueComponent } from '../game/components/ValueComponent';
import { PhysicsManager } from './PhysicsManager';
// import { RenderManager } from './RenderManager'; // Futuro
import Matter from 'matter-js';

// Constantes básicas (podrían venir de un archivo de config o plantillas)
const INITIAL_CAT_SIZE = 45; // px
const CAT_COLLISION_CATEGORY = 0x0002; // Ejemplo de categoría de colisión para gatos

// Interfaz placeholder para la configuración de un gato
interface CatConfig {
    id?: string | number;
    templateId?: string; // Por ahora no se usa, pero podría definir tamaño/apariencia/etc.
    initialPosition?: { x: number; y: number };
    size?: number;
    rarity?: number;
    scoreValue?: number;
    // ...otras opciones de plantilla
}


export class CatManager {
  private cats: Map<string | number, CatEntity> = new Map();
  private physicsManager: PhysicsManager;
  // private renderManager: RenderManager;
  private nextCatId: number = 0;
  private catContainerElement: HTMLElement | null = null; // Referencia al contenedor DOM

  constructor(
      physicsManager: PhysicsManager
      // , renderManager?: RenderManager
  ) {
    this.physicsManager = physicsManager;
    // this.renderManager = renderManager;
    this.catContainerElement = document.getElementById('cat-container'); // Obtener contenedor
    if (!this.catContainerElement) {
        console.error("CatManager: Elemento '#cat-container' no encontrado en el DOM!");
    }
    console.log('CatManager Creado.');
  }


  /**
   * Crea una nueva entidad Gato con cuerpo físico y elemento DOM.
   * @param config - Configuración inicial (posición, tamaño, etc.).
   * @returns La entidad CatEntity creada o null si falla la creación.
   */
  public addCat(config: CatConfig = {}): CatEntity | null {
    if (!this.catContainerElement) {
        console.error("CatManager: No se puede añadir gato, falta #cat-container.");
        return null;
    }

    const catId = config.id ?? `cat_${this.nextCatId++}`;
    const size = config.size ?? INITIAL_CAT_SIZE;
    const rarity = config.rarity ?? 0;
    const scoreValue = config.scoreValue ?? 1; // Valor base ejemplo

    // Posición inicial (centro de la pantalla arriba, o según config)
    const initialX = config.initialPosition?.x ?? window.innerWidth / 2;
    // Asegurar que no spawnee demasiado arriba (ej: justo debajo del borde superior + su radio)
    const initialY = config.initialPosition?.y ?? size / 2 + 10;


    // 1. Crear Cuerpo Físico (PhysicsComponent)
    // Opciones básicas de física (ajustar según GDD/sensación deseada)
    const bodyOptions: Matter.IBodyDefinition = {
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.005, // Afecta la masa basada en el tamaño
        label: 'cat', // Etiqueta para identificar en colisiones
        collisionFilter: {
            category: CAT_COLLISION_CATEGORY,
            // Define con qué PUEDE colisionar (ej: paredes, otros gatos, líneas de tinta)
            mask: 0x0001 | CAT_COLLISION_CATEGORY /* | INK_LINE_CATEGORY etc */
        },
        // Propiedades personalizadas que podemos añadir al cuerpo si es útil
        // customData: { entityId: catId }
    };
    const body = Matter.Bodies.circle(initialX, initialY, size / 2, bodyOptions);
    // Añadir una velocidad angular inicial aleatoria (como en consola ok.html)
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
    const physicsComp = new PhysicsComponent(body);


    // 2. Crear Elemento Visual (RenderComponent)
    const element = document.createElement('div');
    element.id = catId.toString(); // Asignar ID al elemento DOM
    element.classList.add('cat'); // Clase CSS base
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    // Posición inicial se establecerá en updateCats basado en la física
    // Placeholder de apariencia (se puede mejorar con plantillas)
    element.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 70%)`;
    // TODO: Cargar imagen de cataas.com o sprite basado en plantilla/rarity
    // TODO: Aplicar clase de glow basada en rarity si corresponde

    // Añadir al contenedor DOM
    this.catContainerElement.appendChild(element);
    const renderComp = new RenderComponent(element);


    // 3. Crear otros Componentes (ValueComponent)
    const valueComp = new ValueComponent(rarity, scoreValue);


    // 4. Crear la Entidad CatEntity
    const newCat = new CatEntity(catId, physicsComp, renderComp, valueComp);


    // 5. Añadir cuerpo físico al mundo de Matter.js
    if (physicsComp.body) {
        try {
            Matter.World.add(this.physicsManager.getWorld(), physicsComp.body);
        } catch (error) {
            console.error(`CatManager: Error al añadir cuerpo físico del gato ${catId} al mundo:`, error);
            // Limpiar elemento DOM si falla la física
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            return null;
        }
    } else {
        console.error(`CatManager: No se pudo crear el cuerpo físico para el gato ${catId}.`);
         if (element.parentNode) {
             element.parentNode.removeChild(element);
         }
        return null;
    }


    // 6. Añadir entidad al mapa del manager
    this.cats.set(catId, newCat);
    console.log(`CatManager: Gato añadido con ID ${catId}`);
    return newCat;
  }


  /**
   * Elimina una entidad Gato por su ID del manager, del mundo físico y del DOM.
   * @param catId - El ID de la entidad Gato a eliminar.
   */
  public removeCat(catId: string | number): void {
    // console.log(`CatManager: Intentando eliminar gato ${catId}`); // Log más útil
    const cat = this.cats.get(catId);

    if (cat) {
      // 1. Quitar cuerpo físico del mundo
      if (cat.physics.body) {
          try {
             Matter.World.remove(this.physicsManager.getWorld(), cat.physics.body);
             // console.log(`CatManager: Cuerpo físico del gato ${catId} eliminado.`);
          } catch(error) {
              console.warn(`CatManager: Error al intentar eliminar cuerpo físico del gato ${catId}:`, error);
          }
      }

      // 2. Quitar elemento visual del DOM
      if (cat.render.element && cat.render.element.parentNode) {
        cat.render.element.parentNode.removeChild(cat.render.element);
        // console.log(`CatManager: Elemento visual del gato ${catId} eliminado.`);
      }

      // 3. Eliminar la entidad del mapa del manager
      this.cats.delete(catId);
      // console.log(`CatManager: Entidad gato ${catId} eliminada del manager.`);
    } else {
        // console.warn(`CatManager: No se encontró el gato con ID ${catId} para eliminar.`); // Menos verboso
    }
  }


  /**
   * Actualiza la representación visual de todos los gatos gestionados
   * basándose en el estado de sus cuerpos físicos.
   * @param deltaTime - Tiempo transcurrido desde el último frame (en segundos).
   */
  public updateCats(deltaTime: number): void {
    // Iterar sobre todos los gatos gestionados
    this.cats.forEach((cat) => {
      const body = cat.physics.body;
      const element = cat.render.element;

      // Si no hay cuerpo o elemento, o no es visible, no hacer nada para este gato
      if (!body || !element) return;

      if (cat.render.isVisible) {
        // Asegurar que sea visible si corresponde
         if (element.style.display === 'none') {
             element.style.display = '';
         }
         // Actualizar posición y rotación del elemento DOM
         // La posición de Matter.js es el centro; CSS transform-origin suele ser el centro por defecto para rotate,
         // pero translate se aplica desde la esquina superior izquierda.
         const size = parseFloat(element.style.width || '0'); // Obtener tamaño actual
         const halfSize = size / 2;
         // Aplicar transformación para centrar el elemento en la posición del cuerpo
         element.style.transform = `translate(${body.position.x - halfSize}px, ${body.position.y - halfSize}px) rotate(${body.angle}rad)`;

         // Aquí se podría actualizar el tamaño visual si cambia (ej: por comer otros gatos)
         // const currentBodyRadius = body.circleRadius || size / 2; // Matter v0.19+ tiene circleRadius
         // const currentVisualSize = size;
         // if (Math.abs(currentBodyRadius * 2 - currentVisualSize) > 1) { // Si hay diferencia notable
         //     const newSize = currentBodyRadius * 2;
         //     element.style.width = `${newSize}px`;
         //     element.style.height = `${newSize}px`;
         // }

      } else {
        // Ocultar si no es visible
        if (element.style.display !== 'none') {
            element.style.display = 'none';
        }
      }

      // TODO: Podría añadirse lógica para limitar velocidad máxima aquí también
      // limitCatSpeed(body); // Función helper
    });
  }


  /**
   * Obtiene una referencia a una entidad Gato gestionada por su ID.
   * @param catId - El ID de la entidad Gato.
   * @returns La instancia de CatEntity si se encuentra, o undefined.
   */
  public getCat(catId: string | number): CatEntity | undefined {
    return this.cats.get(catId);
  }

  /**
   * Obtiene un array con todas las entidades Gato actualmente gestionadas.
   * @returns Un array de instancias de CatEntity.
   */
  public getAllCats(): CatEntity[] {
    return Array.from(this.cats.values());
  }

  /**
   * Elimina todos los gatos gestionados. Útil para reiniciar el nivel.
   */
  public removeAllCats(): void {
      console.log(`CatManager: Eliminando ${this.cats.size} gatos...`);
      const catIds = Array.from(this.cats.keys());
      catIds.forEach(catId => this.removeCat(catId));
      if (this.cats.size > 0) {
          console.warn("CatManager: No se eliminaron todos los gatos correctamente.");
          this.cats.clear();
      }
      this.nextCatId = 0;
      console.log("CatManager: Todos los gatos eliminados.");
  }

  // --- Métodos Helper Futuros ---
  // loadTemplates(url: string) { /* ... Cargar JSON de plantillas ... */ }
  // applyTemplate(cat: CatEntity, templateId: string) { /* ... Configurar componentes basado en plantilla ... */ }
  // limitCatSpeed(body: Matter.Body) { /* ... Lógica para limitar velocidad ... */ }

} // Fin de la clase CatManager