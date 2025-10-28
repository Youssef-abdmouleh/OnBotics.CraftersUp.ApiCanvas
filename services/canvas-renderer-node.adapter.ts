/**
 * Node.js Environment Adapter for Canvas Rendering - VERSION AMELIOREE
 * Utilise le FontManager pour le chargement dynamique des polices
 * PAS BESOIN D'INSTALLER LES POLICES DANS WINDOWS SERVER!
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import * as https from 'https';
import config from '../config';
import { FontManager, globalFontManager } from './font-manager';

// Import node-canvas et fabric
const { createCanvas, loadImage, Image: NodeImage } = require('canvas');
const fabric = require('fabric').fabric;

// Agent HTTPS pour développement
const httpsAgent = config.environment === 'development'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

// Interfaces
export interface ICanvasEnvironmentAdapter {
  createCanvas(width: number, height: number): any;
  loadFont(font: FontDefinition): Promise<void>;
  loadImage(url: string): Promise<any>;
  exportCanvas(canvas: any): Promise<RenderResult>;
  cleanup(): void;
}

export interface FontDefinition {
  idFont: string;
  designation: string;
  fontUrl: string;
  expectedName?: string;
  enabled?: boolean;
}

export interface RenderResult {
  dataUrl?: string;
  buffer?: Buffer;
  width: number;
  height: number;
  objectCount: number;
}

/**
 * Node.js Canvas Rendering Adapter - VERSION AMELIOREE
 * Utilise FontManager pour le chargement dynamique des polices
 */
export class CanvasRendererNodeAdapter implements ICanvasEnvironmentAdapter {
  private fabricCanvas: any = null;
  private fontManager: FontManager;
  private fabricPatchesApplied: boolean = false;

  constructor(fontManager?: FontManager) {
    // Utiliser le gestionnaire de polices fourni ou le singleton global
    this.fontManager = fontManager || globalFontManager;
    
    console.log('[NodeAdapter] Initialisé avec FontManager (chargement dynamique des polices)');
    console.log('[NodeAdapter] ✓ Aucune installation système requise!');
  }

  /**
   * Apply Fabric.js patches for Node.js environment
   */
  private applyFabricNodePatches(): void {
    if (this.fabricPatchesApplied) return;

    console.log('[NodeAdapter] Application des patches Fabric.js...');

    // Patch fabric.util.loadImage pour gérer data URLs et URLs distantes
    fabric.util.loadImage = function(url: string, callback: Function, context?: any) {
      if (!url) {
        console.warn('[NodeAdapter] loadImage appelé avec URL vide');
        if (typeof callback === 'function') callback.call(context, null, true);
        return null;
      }

      // Data URL (base64)
      if (url.startsWith('data:')) {
        console.log('[NodeAdapter] Chargement data URL...');
        
        try {
          const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          
          if (!matches || matches.length !== 3) {
            throw new Error('Format data URL invalide');
          }
          
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          const img = new NodeImage();
          img.src = buffer;
          
          if (typeof callback === 'function') {
            callback.call(context, img, false);
          }
          
          return img;
          
        } catch (error: any) {
          console.error('[NodeAdapter] Échec chargement base64:', error.message);
          if (typeof callback === 'function') callback.call(context, null, true);
          return null;
        }
      }
      
      // URL distante
      console.log('[NodeAdapter] Chargement URL distante...');
      fetch(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'CraftersUp-Canvas-Renderer/1.0' },
        agent: httpsAgent,
      } as any)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.buffer();
        })
        .then((buffer) => {
          const img = new NodeImage();
          img.src = buffer;
          if (typeof callback === 'function') {
            callback.call(context, img, false);
          }
        })
        .catch((err: any) => {
          console.error(`[NodeAdapter] Échec chargement image:`, err.message);
          if (typeof callback === 'function') callback.call(context, null, true);
        });
      
      try {
        return new NodeImage();
      } catch {
        return null;
      }
    };

    this.fabricPatchesApplied = true;
    console.log('[NodeAdapter] Patches Fabric.js appliqués');
  }

  /**
   * Patch node-canvas pour compatibilité Fabric.js
   */
  private patchNodeCanvasForFabric(canvas: any): any {
    if (!canvas.style) canvas.style = {};
    if (!canvas.style.setProperty) canvas.style.setProperty = function(p: string, v: string) { (this as any)[p] = v; };
    
    if (!canvas.ownerDocument) {
      canvas.ownerDocument = {
        defaultView: {
          getComputedStyle: () => ({
            getPropertyValue: (prop: string) => (prop === 'font-family' ? 'sans-serif' : '')
          })
        }
      };
    }

    if (!canvas.hasAttribute) canvas.hasAttribute = (n: string) => (n === 'width' || n === 'height');
    if (!canvas.setAttribute) canvas.setAttribute = (n: string, v: string) => {};
    if (!canvas.addEventListener) canvas.addEventListener = () => {};
    if (!canvas.removeEventListener) canvas.removeEventListener = () => {};

    return canvas;
  }

  /**
   * Créer fabric canvas avec backend node-canvas
   */
  createCanvas(width: number, height: number): any {
    console.log(`[NodeAdapter] Création canvas: ${width}x${height}`);

    this.applyFabricNodePatches();

    const self = this;
    
    fabric.util.createCanvasElement = function() {
      const canvas = createCanvas(width, height);
      
      const mockStyle = {
        width: `${width}px`,
        height: `${height}px`,
        position: 'absolute',
        userSelect: 'none',
        touchAction: 'none',
        cursor: 'default',
        setProperty: function(propertyName: string, value: string, priority?: string) {
          (this as any)[propertyName] = value;
        },
        getPropertyValue: function(propertyName: string) {
          return (this as any)[propertyName] || '';
        },
        removeProperty: function(propertyName: string) {
          delete (this as any)[propertyName];
        }
      };

      canvas.style = mockStyle;

      if (!canvas.ownerDocument) {
        canvas.ownerDocument = {
          defaultView: {
            getComputedStyle: () => ({
              getPropertyValue: (prop: string) => (prop === 'font-family' ? 'sans-serif' : '')
            })
          },
          createElement: (tag: string) => {
            if (tag === 'canvas') {
              return createCanvas(width, height);
            }
            return {};
          }
        };
      }

      if (!canvas.hasAttribute) canvas.hasAttribute = (n: string) => (n === 'width' || n === 'height');
      if (!canvas.setAttribute) canvas.setAttribute = (n: string, v: string) => {};
      if (!canvas.addEventListener) canvas.addEventListener = () => {};
      if (!canvas.removeEventListener) canvas.removeEventListener = () => {};
      if (!canvas.getBoundingClientRect) {
        canvas.getBoundingClientRect = () => ({
          left: 0, top: 0, width, height, right: width, bottom: height
        });
      }

      return canvas;
    };

    const fabricCanvas = new fabric.StaticCanvas(null, {
      width,
      height,
      enableRetinaScaling: false,
      renderOnAddRemove: true,
      skipOffscreen: false,
    });

    this.fabricCanvas = fabricCanvas;
    console.log('[NodeAdapter] ✓ Canvas créé avec succès');

    return fabricCanvas;
  }

  /**
   * METHODE AMELIOREE: Charger une police dynamiquement
   * Utilise le FontManager - PAS D'INSTALLATION SYSTEME REQUISE!
   */
  async loadFont(font: FontDefinition): Promise<void> {
    console.log(`[NodeAdapter] ========================================`);
    console.log(`[NodeAdapter] Chargement de la police: ${font.designation}`);
    console.log(`[NodeAdapter] ID: ${font.idFont}`);
    console.log(`[NodeAdapter] ========================================`);

    try {
      // Vérifier si déjà chargée
      if (this.fontManager.isFontLoaded(font.idFont)) {
        const fontInfo = this.fontManager.getFontInfo(font.idFont);
        console.log(`[NodeAdapter] ✓ Police déjà en cache: "${fontInfo?.internalName}"`);
        return;
      }

      // Télécharger la police depuis l'API
      console.log(`[NodeAdapter] Téléchargement depuis: ${font.fontUrl}`);
      const fontBuffer = await this.fetchFontFromAPI(font.fontUrl);
      console.log(`[NodeAdapter] Police téléchargée: ${fontBuffer.length} octets`);

      // Utiliser le FontManager pour charger et enregistrer
      const internalName = await this.fontManager.loadAndRegisterFont(fontBuffer, font.idFont);

      console.log(`[NodeAdapter] ========================================`);
      console.log(`[NodeAdapter] ✓ POLICE PRETE: "${internalName}"`);
      console.log(`[NodeAdapter] ✓ Utilisable dans fabric.js!`);
      console.log(`[NodeAdapter] ========================================`);

    } catch (error: any) {
      console.error(`[NodeAdapter] ❌ Échec du chargement de la police ${font.idFont}:`, error.message);
      throw error;
    }
  }

  /**
   * Télécharger une police depuis l'API
   */
  private async fetchFontFromAPI(fontUrl: string): Promise<Buffer> {
    const response = await fetch(fontUrl, {
      timeout: 30000,
      headers: { 'User-Agent': 'CraftersUp-Canvas-Renderer/1.0' },
      agent: httpsAgent,
    } as any);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.buffer();
  }

  /**
   * Charger une image
   */
  async loadImage(url: string): Promise<any> {
    try {
      const img = await loadImage(url);
      return img;
    } catch (error: any) {
      console.error(`[NodeAdapter] Échec chargement image:`, error.message);
      throw new Error(`Échec chargement image: ${error.message}`);
    }
  }

  /**
   * Exporter le canvas en PNG
   */
  async exportCanvas(canvas: any): Promise<RenderResult> {
    if (!canvas) {
      throw new Error('Canvas non initialisé');
    }

    console.log('[NodeAdapter] Début de l\'export avec vérification...');
    
    // Vérifier l'image de fond
    if (canvas.backgroundImage) {
      console.log('[NodeAdapter] Image de fond détectée');
      const bgImg = canvas.backgroundImage;
      if (bgImg._element && !bgImg._element.complete) {
        console.log('[NodeAdapter] Attente du chargement de l\'image de fond...');
        await new Promise<void>((resolve) => {
          bgImg._element.onload = () => resolve();
          setTimeout(() => resolve(), 2000);
        });
      }
    } else if (canvas.backgroundColor) {
      console.log(`[NodeAdapter] Couleur de fond: ${canvas.backgroundColor}`);
    }
    
    // Vérifier tous les objets
    const objects = canvas.getObjects();
    console.log(`[NodeAdapter] Vérification de ${objects.length} objets...`);
    
    for (const obj of objects) {
      if (obj.type === 'image' && obj._element) {
        if (!obj._element.complete && obj._element.width === 0) {
          console.warn('[NodeAdapter] Image non complètement chargée, attente...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    
    // Forcer le rendu
    console.log('[NodeAdapter] Rendu du canvas...');
    canvas.renderAll();
    
    // Délai pour s'assurer que le pipeline de rendu est terminé
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Export
    console.log('[NodeAdapter] Export en PNG...');
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    
    const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log(`[NodeAdapter] ✓ Export terminé: ${buffer.length} octets`);

    return {
      buffer,
      dataUrl: dataURL,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      objectCount: objects.length,
    };
  }

  /**
   * Nettoyer les ressources
   */
  cleanup(): void {
    console.log('[NodeAdapter] Nettoyage des ressources');

    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
      this.fabricCanvas = null;
    }

    // Le FontManager gère son propre nettoyage
  }

  /**
   * Statistiques du cache
   */
  getCacheStats() {
    return this.fontManager.getCacheStats();
  }

  /**
   * Obtenir les polices enregistrées
   */
  getRegisteredFonts(): string[] {
    return this.fontManager.getRegisteredFonts();
  }
}
