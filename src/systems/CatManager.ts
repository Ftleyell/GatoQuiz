// src/systems/CatManager.ts

import { CatEntity } from '../game/entities/CatEntity';
import { PhysicsComponent } from '../game/components/PhysicsComponent';
import { RenderComponent } from '../game/components/RenderComponent';
import { ValueComponent } from '../game/components/ValueComponent';
import { PhysicsManager } from './PhysicsManager';
// import { RenderManager } from './RenderManager'; // Futuro
import { CatTemplate } from '../types/CatTemplate'; // Importar interfaz
import Matter from 'matter-js';

// Constantes básicas
const CAT_COLLISION_CATEGORY = 0x0002;
const WALL_COLLISION_CATEGORY = 0x0001;

/**
 * CatManager: Sistema responsable de crear, destruir y gestionar
 * el ciclo de vida de las entidades CatEntity, basado en plantillas.
 */
export class CatManager {
  private cats: Map<string | number, CatEntity> = new Map();
  private physicsManager: PhysicsManager;
  // private renderManager: RenderManager;
  private nextCatIdCounter: number = 0;
  private catContainerElement: HTMLElement | null = null;
  private templates: Map<string, CatTemplate> = new Map();

  constructor(
      physicsManager: PhysicsManager
      // , renderManager?: RenderManager
  ) {
    this.physicsManager = physicsManager;
    this.catContainerElement = document.getElementById('cat-container');
    if (!this.catContainerElement) {
        console.error("CatManager: Elemento '#cat-container' no encontrado en el DOM!");
    }
    console.log('CatManager Creado.');
  }

  /**
   * Carga y almacena las plantillas de gato.
   */
  public loadTemplates(templateData: CatTemplate[]): void {
      this.templates.clear();
      if (!Array.isArray(templateData)) {
          console.error("CatManager: Formato de datos de plantilla inválido.");
          return;
      }
      templateData.forEach(template => {
          if (template && template.id) {
              this.templates.set(template.id, template);
          } else {
              console.warn("CatManager: Plantilla inválida o sin ID.", template);
          }
      });
      console.log(`CatManager: ${this.templates.size} plantillas de gato cargadas/registradas.`);
  }

  /**
   * Crea una nueva entidad Gato basada en el ID de una plantilla cargada.
   * @param templateId - El ID de la CatTemplate a usar.
   * @param initialPosition - (Opcional) Posición inicial para sobreescribir la de la plantilla.
   * @returns La entidad CatEntity creada o null si falla.
   */
  public addCat(templateId: string, initialPosition?: { x: number; y: number }): CatEntity | null {
    if (!this.catContainerElement) {
        console.error("CatManager: No se puede añadir gato, falta #cat-container.");
        return null;
    }

    const template = this.templates.get(templateId);
    if (!template) {
        console.error(`CatManager: Plantilla con ID '${templateId}' no encontrada.`);
        return null;
    }

    const entityId = `cat_entity_${this.nextCatIdCounter++}`;
    const size = template.initialSize;
    const rarity = template.rarity;
    const scoreValue = template.scoreValue ?? 0;

    const x = initialPosition?.x ?? window.innerWidth / 2;
    const y = initialPosition?.y ?? size / 2 + 10;


    // 1. Crear Cuerpo Físico (PhysicsComponent)
    const defaultPhysics: Matter.IBodyDefinition = { restitution: 0.6, friction: 0.1, frictionAir: 0.01, density: 0.005 };
    const bodyOptions: Matter.IBodyDefinition = {
        ...defaultPhysics,
        ...(template.physicsOptions ?? {}),
        label: 'cat',
        collisionFilter: { category: CAT_COLLISION_CATEGORY, mask: WALL_COLLISION_CATEGORY | CAT_COLLISION_CATEGORY },
        plugin: { entityId: entityId, rarity: rarity, templateId: templateId }
    };
    const body = Matter.Bodies.circle(x, y, size / 2, bodyOptions);
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
    const physicsComp = new PhysicsComponent(body);


    // 2. Crear Elemento Visual (RenderComponent) *** CON FALLBACK A CATAAS ***
    const element = document.createElement('div');
    element.id = entityId;
    element.classList.add('cat'); // Clase base CSS
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;

    // Aplicar opciones de renderizado de la plantilla
    const renderOpts = template.renderOptions ?? {};

    // Aplicar Glow Class si existe
    if (renderOpts.glowClass) {
        element.classList.add(renderOpts.glowClass);
    }

    // Determinar URL de imagen y color de fallback
    let finalImageUrl = renderOpts.imageUrl; // Usar URL de plantilla si existe
    const fallbackColor = renderOpts.backgroundColor ?? '#cccccc'; // Color de plantilla o default gris

    // *** LÓGICA ACTUALIZADA: Usar Cataas si no hay imageUrl en la plantilla ***
    if (!finalImageUrl) {
        // console.log(`CatManager: No hay imageUrl para plantilla '${templateId}'. Usando Cataas.`); // Log opcional
        // Construir URL de Cataas con timestamp y tamaño para evitar caché y obtener tamaño aprox.
        finalImageUrl = `https://cataas.com/cat?${Date.now()}&width=${Math.round(size)}&height=${Math.round(size)}`;
    }
    // *********************************************************************

    // Aplicar imagen o color
    if (finalImageUrl) {
        // Intentar cargar la imagen (sea de plantilla o de Cataas)
        element.style.backgroundImage = `url('${finalImageUrl}')`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';

        // Pre-cargar imagen para manejar errores
        const img = new Image();
        img.onerror = () => {
            console.warn(`CatManager: Fallo al cargar imagen: ${finalImageUrl} para gato ${entityId}. Usando color de fallback: ${fallbackColor}`);
            element.style.backgroundImage = 'none'; // Quitar imagen fallida
            element.style.backgroundColor = fallbackColor; // Aplicar color de fallback
        };
        img.src = finalImageUrl; // Iniciar carga
    } else {
        // Si por alguna razón no hay URL (improbable ahora), usar color de fondo
        element.style.backgroundColor = fallbackColor;
    }

    this.catContainerElement.appendChild(element);
    const renderComp = new RenderComponent(element);
    // *** FIN MODIFICACIÓN VISUAL ***


    // 3. Crear otros Componentes (ValueComponent)
    const valueComp = new ValueComponent(rarity, scoreValue);


    // 4. Crear la Entidad CatEntity
    const newCat = new CatEntity(entityId, physicsComp, renderComp, valueComp);


    // 5. Añadir cuerpo físico al mundo de Matter.js
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


    // 6. Añadir entidad al mapa del manager
    this.cats.set(entityId, newCat);
    // console.log(`CatManager: Gato '${templateId}' añadido con ID de entidad ${entityId}`); // Log menos verboso
    return newCat;
  }


  // --- Métodos removeCat, updateCats, getCat, getAllCats, removeAllCats (Sin cambios) ---

   public removeCat(catId: string | number): void {
    const cat = this.cats.get(catId);
    if (cat) {
      if (cat.physics.body) {
          try { Matter.World.remove(this.physicsManager.getWorld(), cat.physics.body); }
          catch(error) { console.warn(`Error eliminando cuerpo físico gato ${catId}:`, error); }
      }
      if (cat.render.element && cat.render.element.parentNode) {
        cat.render.element.parentNode.removeChild(cat.render.element);
      }
      this.cats.delete(catId);
    }
  }

  public updateCats(deltaTime: number): void {
    this.cats.forEach((cat) => {
      const body = cat.physics.body;
      const element = cat.render.element;
      if (!body || !element) return;

      if (cat.render.isVisible) {
         if (element.style.display === 'none') element.style.display = '';
         const size = parseFloat(element.style.width || '0');
         const halfSize = size / 2;
         element.style.transform = `translate(${body.position.x - halfSize}px, ${body.position.y - halfSize}px) rotate(${body.angle}rad)`;
      } else {
        if (element.style.display !== 'none') element.style.display = 'none';
      }
    });
  }

  public getCat(catId: string | number): CatEntity | undefined { return this.cats.get(catId); }
  public getAllCats(): CatEntity[] { return Array.from(this.cats.values()); }
  public removeAllCats(): void {
       console.log(`CatManager: Eliminando ${this.cats.size} gatos...`);
       const catIds = Array.from(this.cats.keys());
       catIds.forEach(catId => this.removeCat(catId));
       if (this.cats.size > 0) { console.warn("CatManager: Faltaron gatos por eliminar."); this.cats.clear(); }
       this.nextCatIdCounter = 0;
       console.log("CatManager: Todos los gatos eliminados.");
   }

} // Fin de la clase CatManager
