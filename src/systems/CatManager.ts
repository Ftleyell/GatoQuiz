// src/systems/CatManager.ts

import { CatEntity } from '../game/entities/CatEntity';
import { PhysicsComponent } from '../game/components/PhysicsComponent';
import { RenderComponent } from '../game/components/RenderComponent';
import { ValueComponent } from '../game/components/ValueComponent';
import { PhysicsManager } from './PhysicsManager';
// import { RenderManager } from './RenderManager'; // Futuro
import { CatTemplate } from '../types/CatTemplate'; // <-- IMPORTAR interfaz
import Matter from 'matter-js';

// Constantes básicas (podrían moverse a un archivo de configuración)
const CAT_COLLISION_CATEGORY = 0x0002;
const WALL_COLLISION_CATEGORY = 0x0001;
// Podríamos definir aquí categorías para otros elementos (tinta, herramientas, etc.)
// const INK_COLLISION_CATEGORY = 0x0004;

/**
 * CatManager: Sistema responsable de crear, destruir y gestionar
 * el ciclo de vida de las entidades CatEntity, ahora basado en plantillas.
 */
export class CatManager {
  private cats: Map<string | number, CatEntity> = new Map();
  private physicsManager: PhysicsManager;
  // private renderManager: RenderManager;
  private nextCatIdCounter: number = 0; // Contador para IDs únicos de entidad
  private catContainerElement: HTMLElement | null = null;

  // Almacenamiento para las plantillas cargadas
  private templates: Map<string, CatTemplate> = new Map();

  constructor(
      physicsManager: PhysicsManager
      // , renderManager?: RenderManager
  ) {
    this.physicsManager = physicsManager;
    // this.renderManager = renderManager;
    this.catContainerElement = document.getElementById('cat-container');
    if (!this.catContainerElement) {
        console.error("CatManager: Elemento '#cat-container' no encontrado en el DOM!");
    }
    console.log('CatManager Creado.');
  }

  /**
   * Carga y almacena las plantillas de gato para su uso posterior.
   * Debería ser llamado durante la fase de carga del juego.
   * @param templateData - Un array de objetos CatTemplate.
   */
  public loadTemplates(templateData: CatTemplate[]): void {
      this.templates.clear(); // Limpiar plantillas anteriores si se recarga
      if (!Array.isArray(templateData)) {
          console.error("CatManager: Formato de datos de plantilla inválido. Se esperaba un array.");
          return;
      }
      templateData.forEach(template => {
          if (template && template.id) {
              this.templates.set(template.id, template);
          } else {
              console.warn("CatManager: Plantilla inválida o sin ID encontrada.", template);
          }
      });
      console.log(`CatManager: ${this.templates.size} plantillas de gato cargadas/registradas.`);
  }


  /**
   * Crea una nueva entidad Gato basada en el ID de una plantilla cargada.
   * @param templateId - El ID de la CatTemplate a usar (ej: 'common', 'rare_blue').
   * @param initialPosition - (Opcional) Posición inicial para sobreescribir la de la plantilla.
   * @returns La entidad CatEntity creada o null si falla la creación o la plantilla no existe.
   */
  public addCat(templateId: string, initialPosition?: { x: number; y: number }): CatEntity | null {
    if (!this.catContainerElement) {
        console.error("CatManager: No se puede añadir gato, falta #cat-container.");
        return null;
    }

    // 1. Buscar la plantilla
    const template = this.templates.get(templateId);
    if (!template) {
        console.error(`CatManager: Plantilla con ID '${templateId}' no encontrada.`);
        return null;
    }

    // 2. Generar ID único para la *entidad*
    const entityId = `cat_entity_${this.nextCatIdCounter++}`;
    const size = template.initialSize; // Tamaño definido por la plantilla
    const rarity = template.rarity;
    const scoreValue = template.scoreValue ?? 0; // Usar 0 si no está definido

    // Usar posición proporcionada o calcular una por defecto si no se da
    const x = initialPosition?.x ?? window.innerWidth / 2;
    const y = initialPosition?.y ?? size / 2 + 10;


    // 3. Crear Cuerpo Físico (PhysicsComponent) usando la plantilla
    const defaultPhysics: Matter.IBodyDefinition = { // Valores por defecto robustos
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.005,
    };
    const bodyOptions: Matter.IBodyDefinition = {
        ...defaultPhysics, // Empezar con defaults
        ...(template.physicsOptions ?? {}), // Sobrescribir con opciones de plantilla si existen
        label: 'cat', // Etiqueta fija
        collisionFilter: { // Filtro de colisión fijo (o configurable en plantilla?)
            category: CAT_COLLISION_CATEGORY,
            mask: WALL_COLLISION_CATEGORY | CAT_COLLISION_CATEGORY /* | INK_COLLISION_CATEGORY etc */
        },
        // Añadir datos personalizados al cuerpo si son útiles para colisiones/queries
        plugin: {
             entityId: entityId, // Asociar ID de entidad al cuerpo físico
             rarity: rarity,     // Guardar rareza para lógica de fusión/interacción
             templateId: templateId
        }
    };
    const body = Matter.Bodies.circle(x, y, size / 2, bodyOptions);
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2); // Velocidad angular inicial
    const physicsComp = new PhysicsComponent(body);


    // 4. Crear Elemento Visual (RenderComponent) usando la plantilla
    const element = document.createElement('div');
    element.id = entityId;
    element.classList.add('cat'); // Clase base
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;

    // Aplicar opciones de renderizado de la plantilla
    const renderOpts = template.renderOptions ?? {};
    if (renderOpts.glowClass) {
        element.classList.add(renderOpts.glowClass); // Añadir clase de brillo
    }
    // Usar imagen de Cataas si no hay spriteKey ni imageUrl (como antes)
    const imageUrl = renderOpts.imageUrl ?? `https://cataas.com/cat?${Date.now()}&width=${Math.round(size)}&height=${Math.round(size)}`; // Añadir tamaño a cataas
    if (imageUrl && !renderOpts.spriteKey) { // Priorizar spriteKey si existe
        element.style.backgroundImage = `url('${imageUrl}')`;
        // Fallback de color si la imagen falla
        const img = new Image();
        img.onerror = () => {
            console.warn(`Fallo al cargar imagen ${imageUrl} para gato ${entityId}. Usando color de fondo.`);
            element.style.backgroundImage = 'none';
            if (renderOpts.backgroundColor) {
                element.style.backgroundColor = renderOpts.backgroundColor;
            }
        };
        img.src = imageUrl;
    } else if (renderOpts.backgroundColor) {
         element.style.backgroundColor = renderOpts.backgroundColor; // Usar color si no hay imagen
    }
    // TODO: Lógica para usar spriteKey si se implementa un sistema de spritesheets

    this.catContainerElement.appendChild(element);
    const renderComp = new RenderComponent(element);


    // 5. Crear otros Componentes (ValueComponent)
    const valueComp = new ValueComponent(rarity, scoreValue);


    // 6. Crear la Entidad CatEntity
    const newCat = new CatEntity(entityId, physicsComp, renderComp, valueComp);


    // 7. Añadir cuerpo físico al mundo de Matter.js
    if (physicsComp.body) {
        try {
            Matter.World.add(this.physicsManager.getWorld(), physicsComp.body);
        } catch (error) {
            console.error(`CatManager: Error al añadir cuerpo físico ${entityId} al mundo:`, error);
            if (element.parentNode) element.parentNode.removeChild(element);
            return null;
        }
    } else {
        console.error(`CatManager: No se pudo crear el cuerpo físico para ${entityId}.`);
         if (element.parentNode) element.parentNode.removeChild(element);
        return null;
    }


    // 8. Añadir entidad al mapa del manager
    this.cats.set(entityId, newCat);
    console.log(`CatManager: Gato '${templateId}' añadido con ID de entidad ${entityId}`);
    return newCat;
  }


  // --- Métodos removeCat, updateCats, getCat, getAllCats, removeAllCats (Sin cambios respecto a la versión anterior) ---

  /**
   * Elimina una entidad Gato por su ID del manager, del mundo físico y del DOM.
   * @param catId - El ID de la entidad Gato a eliminar.
   */
   public removeCat(catId: string | number): void {
    // console.log(`CatManager: Intentando eliminar gato ${catId}`);
    const cat = this.cats.get(catId);

    if (cat) {
      // 1. Quitar cuerpo físico del mundo
      if (cat.physics.body) {
          try {
             Matter.World.remove(this.physicsManager.getWorld(), cat.physics.body);
          } catch(error) {
              console.warn(`CatManager: Error al intentar eliminar cuerpo físico del gato ${catId}:`, error);
          }
      }

      // 2. Quitar elemento visual del DOM
      if (cat.render.element && cat.render.element.parentNode) {
        cat.render.element.parentNode.removeChild(cat.render.element);
      }

      // 3. Eliminar la entidad del mapa del manager
      this.cats.delete(catId);
    }
  }


  /**
   * Actualiza la representación visual de todos los gatos gestionados
   * basándose en el estado de sus cuerpos físicos.
   * @param deltaTime - Tiempo transcurrido desde el último frame (en segundos).
   */
  public updateCats(deltaTime: number): void {
    this.cats.forEach((cat) => {
      const body = cat.physics.body;
      const element = cat.render.element;

      if (!body || !element) return;

      if (cat.render.isVisible) {
         if (element.style.display === 'none') {
             element.style.display = '';
         }
         const size = parseFloat(element.style.width || '0');
         const halfSize = size / 2;
         element.style.transform = `translate(${body.position.x - halfSize}px, ${body.position.y - halfSize}px) rotate(${body.angle}rad)`;

         // TODO: Actualizar tamaño visual si cambia en body.plugin.currentSize o body.circleRadius?

      } else {
        if (element.style.display !== 'none') {
            element.style.display = 'none';
        }
      }
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
       this.nextCatIdCounter = 0; // Resetear contador de IDs
       console.log("CatManager: Todos los gatos eliminados.");
   }

} // Fin de la clase CatManager