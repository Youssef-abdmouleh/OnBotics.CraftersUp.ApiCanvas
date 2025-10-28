/**
 * Gestionnaire de polices avec cache et chargement dynamique
 * Évite l'installation système en utilisant registerFont de node-canvas
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as opentype from 'opentype.js';

const { registerFont } = require('canvas');

export interface FontDefinition {
  idFont: string;          // GUID pour l'API
  designation: string;     // Nom d'affichage
  fontUrl: string;         // URL de téléchargement
  expectedName?: string;   // Nom attendu par fabric
  enabled?: boolean;
}

export interface FontInfo {
  idFont: string;
  internalName: string;    // Nom réel dans le fichier
  filePath: string;        // Chemin du fichier temporaire
  isRegistered: boolean;   // Statut d'enregistrement
  buffer: Buffer;          // Buffer en mémoire
}

/**
 * Gestionnaire centralisé de polices
 */
export class FontManager {
  private fontCache: Map<string, FontInfo> = new Map();
  private tempFontDir: string;
  private registeredFonts: Set<string> = new Set(); // Tracking des polices enregistrées

  constructor(tempDir: string = '/tmp/canvas-fonts') {
    this.tempFontDir = tempDir;

    // Créer le répertoire temporaire si nécessaire
    if (!fs.existsSync(this.tempFontDir)) {
      fs.mkdirSync(this.tempFontDir, { recursive: true });
      console.log(`[FontManager] Répertoire temporaire créé: ${this.tempFontDir}`);
    }

    console.log('[FontManager] Initialisé avec cache mémoire et disque');
  }

  /**
   * Charge et enregistre une police de manière dynamique
   * @param fontBuffer Buffer contenant la police (.ttf/.otf)
   * @param fontId Identifiant unique de la police
   * @returns Nom interne de la police pour utilisation dans fabric
   */
  async loadAndRegisterFont(fontBuffer: Buffer, fontId: string): Promise<string> {
    console.log(`[FontManager] Chargement de la police: ${fontId}`);

    // Vérifier si déjà en cache
    const cached = this.fontCache.get(fontId);
    if (cached && cached.isRegistered) {
      console.log(`[FontManager] Police trouvée en cache: ${cached.internalName}`);
      return cached.internalName;
    }

    try {
      // Étape 1: Parser le fichier de police pour obtenir le nom interne
      const arrayBuffer = fontBuffer.buffer.slice(
        fontBuffer.byteOffset,
        fontBuffer.byteOffset + fontBuffer.byteLength
      );
      const fontData = opentype.parse(arrayBuffer);
      
      // Extraire le nom interne de la police
      const internalName = this.extractFontName(fontData);
      console.log(`[FontManager] Nom interne détecté: "${internalName}"`);

      if (!internalName) {
        throw new Error('Impossible d\'extraire le nom de la police');
      }

      // Vérifier si déjà enregistrée par nom
      if (this.registeredFonts.has(internalName)) {
        console.log(`[FontManager] Police déjà enregistrée: ${internalName}`);
        
        // Mettre à jour le cache
        const fontInfo: FontInfo = {
          idFont: fontId,
          internalName,
          filePath: cached?.filePath || this.getTempPath(fontId),
          isRegistered: true,
          buffer: fontBuffer
        };
        this.fontCache.set(fontId, fontInfo);
        
        return internalName;
      }

      // Étape 2: Sauvegarder le fichier temporairement
      const tempPath = this.getTempPath(fontId);
      
      if (!fs.existsSync(tempPath)) {
        fs.writeFileSync(tempPath, new Uint8Array(fontBuffer));
        console.log(`[FontManager] Police sauvegardée: ${tempPath}`);
      }

      // Étape 3: Enregistrer avec node-canvas
      registerFont(tempPath, { family: internalName });
      console.log(`[FontManager] Police enregistrée avec node-canvas: "${internalName}"`);

      // Marquer comme enregistrée
      this.registeredFonts.add(internalName);

      // Étape 4: Vérifier l'enregistrement
      await this.verifyFontRegistration(internalName);

      // Mettre en cache
      const fontInfo: FontInfo = {
        idFont: fontId,
        internalName,
        filePath: tempPath,
        isRegistered: true,
        buffer: fontBuffer
      };
      this.fontCache.set(fontId, fontInfo);

      console.log(`[FontManager] ✓ Police prête à l'emploi: "${internalName}"`);
      return internalName;

    } catch (error: any) {
      console.error(`[FontManager] Erreur lors du chargement de la police ${fontId}:`, error.message);
      throw error;
    }
  }

  /**
   * Charge une police depuis une API et l'enregistre
   */
  async loadFontFromAPI(fontDefinition: FontDefinition, fetchFunction: (url: string) => Promise<Buffer>): Promise<string> {
    console.log(`[FontManager] Chargement depuis API: ${fontDefinition.designation}`);

    // Vérifier le cache d'abord
    const cached = this.fontCache.get(fontDefinition.idFont);
    if (cached && cached.isRegistered) {
      console.log(`[FontManager] Police en cache: ${cached.internalName}`);
      return cached.internalName;
    }

    try {
      // Télécharger la police
      const fontBuffer = await fetchFunction(fontDefinition.fontUrl);
      console.log(`[FontManager] Police téléchargée: ${fontBuffer.length} octets`);

      // Charger et enregistrer
      return await this.loadAndRegisterFont(fontBuffer, fontDefinition.idFont);

    } catch (error: any) {
      console.error(`[FontManager] Échec du chargement de la police:`, error.message);
      throw error;
    }
  }

  /**
   * Extrait le nom interne de la police depuis les métadonnées opentype
   */
  private extractFontName(fontData: any): string {
    const names = fontData.names;

    // Priorité: fontFamily > fullName > postScriptName
    const preferredName = 
      this.getPreferredStringName(names.fontFamily) ||
      this.getPreferredStringName(names.fullName) ||
      this.getPreferredStringName(names.postScriptName);

    if (!preferredName) {
      throw new Error('Impossible de trouver un nom valide dans les métadonnées de la police');
    }

    return preferredName;
  }

  /**
   * Extrait une chaîne de caractères depuis un champ de nom opentype
   */
  private getPreferredStringName(nameField: any): string | undefined {
    if (nameField && typeof nameField === 'object' && nameField.en && typeof nameField.en === 'string') {
      return nameField.en.trim();
    }
    if (nameField && typeof nameField === 'string') {
      return nameField.trim();
    }
    return undefined;
  }

  /**
   * Génère le chemin temporaire pour une police
   */
  private getTempPath(fontId: string): string {
    const hash = crypto.createHash('md5').update(fontId).digest('hex').substring(0, 8);
    return path.join(this.tempFontDir, `font-${hash}.ttf`);
  }

  /**
   * Vérifie qu'une police est bien enregistrée et utilisable
   */
  private async verifyFontRegistration(fontFamily: string, maxRetries: number = 3): Promise<void> {
    const { createCanvas } = require('canvas');
    
    console.log(`[FontManager] Vérification de l'enregistrement: "${fontFamily}"`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const testCanvas = createCanvas(100, 50);
        const ctx = testCanvas.getContext('2d');
        
        ctx.font = `20px "${fontFamily}"`;
        ctx.fillText('Test', 10, 30);
        
        console.log(`[FontManager] ✓ Vérification réussie (tentative ${attempt})`);
        return;
        
      } catch (error: any) {
        console.warn(`[FontManager] Tentative ${attempt} échouée:`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw new Error(`Échec de la vérification après ${maxRetries} tentatives`);
        }
      }
    }
  }

  /**
   * Obtient les informations d'une police en cache
   */
  getFontInfo(fontId: string): FontInfo | undefined {
    return this.fontCache.get(fontId);
  }

  /**
   * Vérifie si une police est déjà chargée
   */
  isFontLoaded(fontId: string): boolean {
    const cached = this.fontCache.get(fontId);
    return cached !== undefined && cached.isRegistered;
  }

  /**
   * Liste toutes les polices enregistrées
   */
  getRegisteredFonts(): string[] {
    return Array.from(this.registeredFonts);
  }

  /**
   * Statistiques du cache
   */
  getCacheStats(): { fontCount: number; memorySize: number; diskSize: number; registeredFonts: string[] } {
    let memorySize = 0;
    let diskSize = 0;

    this.fontCache.forEach((info) => {
      memorySize += info.buffer.length;
      
      try {
        if (fs.existsSync(info.filePath)) {
          const stats = fs.statSync(info.filePath);
          diskSize += stats.size;
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    });

    return {
      fontCount: this.fontCache.size,
      memorySize,
      diskSize,
      registeredFonts: this.getRegisteredFonts()
    };
  }

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    console.log('[FontManager] Nettoyage des ressources');
    this.fontCache.clear();
  }

  /**
   * Nettoie complètement (mémoire + fichiers temporaires)
   */
  clearAllCaches(): void {
    console.log('[FontManager] Nettoyage complet du cache');

    this.fontCache.forEach((info) => {
      try {
        if (fs.existsSync(info.filePath)) {
          fs.unlinkSync(info.filePath);
          console.log(`[FontManager] Fichier supprimé: ${info.filePath}`);
        }
      } catch (error) {
        console.warn(`[FontManager] Échec de la suppression:`, error);
      }
    });

    this.fontCache.clear();
    this.registeredFonts.clear();
  }
}

// Export singleton pour utilisation globale
export const globalFontManager = new FontManager();
