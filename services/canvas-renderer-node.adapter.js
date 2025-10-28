"use strict";
/**
 * Node.js Environment Adapter for Canvas Rendering - VERSION AMELIOREE
 * Utilise le FontManager pour le chargement dynamique des polices
 * PAS BESOIN D'INSTALLER LES POLICES DANS WINDOWS SERVER!
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasRendererNodeAdapter = void 0;
const node_fetch_1 = require("node-fetch");
const https = require("https");
const config_1 = require("../config");
const font_manager_1 = require("./font-manager");
// Import node-canvas et fabric
const { createCanvas, loadImage, Image: NodeImage } = require('canvas');
const fabric = require('fabric').fabric;
// Agent HTTPS pour développement
const httpsAgent = config_1.default.environment === 'development'
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;
/**
 * Node.js Canvas Rendering Adapter - VERSION AMELIOREE
 * Utilise FontManager pour le chargement dynamique des polices
 */
class CanvasRendererNodeAdapter {
    constructor(fontManager) {
        this.fabricCanvas = null;
        this.fabricPatchesApplied = false;
        // Utiliser le gestionnaire de polices fourni ou le singleton global
        this.fontManager = fontManager || font_manager_1.globalFontManager;
        console.log('[NodeAdapter] Initialisé avec FontManager (chargement dynamique des polices)');
        console.log('[NodeAdapter] ✓ Aucune installation système requise!');
    }
    /**
     * Apply Fabric.js patches for Node.js environment
     */
    applyFabricNodePatches() {
        if (this.fabricPatchesApplied)
            return;
        console.log('[NodeAdapter] Application des patches Fabric.js...');
        // Patch fabric.util.loadImage pour gérer data URLs et URLs distantes
        fabric.util.loadImage = function (url, callback, context) {
            if (!url) {
                console.warn('[NodeAdapter] loadImage appelé avec URL vide');
                if (typeof callback === 'function')
                    callback.call(context, null, true);
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
                }
                catch (error) {
                    console.error('[NodeAdapter] Échec chargement base64:', error.message);
                    if (typeof callback === 'function')
                        callback.call(context, null, true);
                    return null;
                }
            }
            // URL distante
            console.log('[NodeAdapter] Chargement URL distante...');
            (0, node_fetch_1.default)(url, {
                timeout: 15000,
                headers: { 'User-Agent': 'CraftersUp-Canvas-Renderer/1.0' },
                agent: httpsAgent,
            })
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
                .catch((err) => {
                console.error(`[NodeAdapter] Échec chargement image:`, err.message);
                if (typeof callback === 'function')
                    callback.call(context, null, true);
            });
            try {
                return new NodeImage();
            }
            catch (_a) {
                return null;
            }
        };
        this.fabricPatchesApplied = true;
        console.log('[NodeAdapter] Patches Fabric.js appliqués');
    }
    /**
     * Patch node-canvas pour compatibilité Fabric.js
     */
    patchNodeCanvasForFabric(canvas) {
        if (!canvas.style)
            canvas.style = {};
        if (!canvas.style.setProperty)
            canvas.style.setProperty = function (p, v) { this[p] = v; };
        if (!canvas.ownerDocument) {
            canvas.ownerDocument = {
                defaultView: {
                    getComputedStyle: () => ({
                        getPropertyValue: (prop) => (prop === 'font-family' ? 'sans-serif' : '')
                    })
                }
            };
        }
        if (!canvas.hasAttribute)
            canvas.hasAttribute = (n) => (n === 'width' || n === 'height');
        if (!canvas.setAttribute)
            canvas.setAttribute = (n, v) => { };
        if (!canvas.addEventListener)
            canvas.addEventListener = () => { };
        if (!canvas.removeEventListener)
            canvas.removeEventListener = () => { };
        return canvas;
    }
    /**
     * Créer fabric canvas avec backend node-canvas
     */
    createCanvas(width, height) {
        console.log(`[NodeAdapter] Création canvas: ${width}x${height}`);
        this.applyFabricNodePatches();
        const self = this;
        fabric.util.createCanvasElement = function () {
            const canvas = createCanvas(width, height);
            const mockStyle = {
                width: `${width}px`,
                height: `${height}px`,
                position: 'absolute',
                userSelect: 'none',
                touchAction: 'none',
                cursor: 'default',
                setProperty: function (propertyName, value, priority) {
                    this[propertyName] = value;
                },
                getPropertyValue: function (propertyName) {
                    return this[propertyName] || '';
                },
                removeProperty: function (propertyName) {
                    delete this[propertyName];
                }
            };
            canvas.style = mockStyle;
            if (!canvas.ownerDocument) {
                canvas.ownerDocument = {
                    defaultView: {
                        getComputedStyle: () => ({
                            getPropertyValue: (prop) => (prop === 'font-family' ? 'sans-serif' : '')
                        })
                    },
                    createElement: (tag) => {
                        if (tag === 'canvas') {
                            return createCanvas(width, height);
                        }
                        return {};
                    }
                };
            }
            if (!canvas.hasAttribute)
                canvas.hasAttribute = (n) => (n === 'width' || n === 'height');
            if (!canvas.setAttribute)
                canvas.setAttribute = (n, v) => { };
            if (!canvas.addEventListener)
                canvas.addEventListener = () => { };
            if (!canvas.removeEventListener)
                canvas.removeEventListener = () => { };
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
    loadFont(font) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[NodeAdapter] ========================================`);
            console.log(`[NodeAdapter] Chargement de la police: ${font.designation}`);
            console.log(`[NodeAdapter] ID: ${font.idFont}`);
            console.log(`[NodeAdapter] ========================================`);
            try {
                // Vérifier si déjà chargée
                if (this.fontManager.isFontLoaded(font.idFont)) {
                    const fontInfo = this.fontManager.getFontInfo(font.idFont);
                    console.log(`[NodeAdapter] ✓ Police déjà en cache: "${fontInfo === null || fontInfo === void 0 ? void 0 : fontInfo.internalName}"`);
                    return;
                }
                // Télécharger la police depuis l'API
                console.log(`[NodeAdapter] Téléchargement depuis: ${font.fontUrl}`);
                const fontBuffer = yield this.fetchFontFromAPI(font.fontUrl);
                console.log(`[NodeAdapter] Police téléchargée: ${fontBuffer.length} octets`);
                // Utiliser le FontManager pour charger et enregistrer
                const internalName = yield this.fontManager.loadAndRegisterFont(fontBuffer, font.idFont);
                console.log(`[NodeAdapter] ========================================`);
                console.log(`[NodeAdapter] ✓ POLICE PRETE: "${internalName}"`);
                console.log(`[NodeAdapter] ✓ Utilisable dans fabric.js!`);
                console.log(`[NodeAdapter] ========================================`);
            }
            catch (error) {
                console.error(`[NodeAdapter] ❌ Échec du chargement de la police ${font.idFont}:`, error.message);
                throw error;
            }
        });
    }
    /**
     * Télécharger une police depuis l'API
     */
    fetchFontFromAPI(fontUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield (0, node_fetch_1.default)(fontUrl, {
                timeout: 30000,
                headers: { 'User-Agent': 'CraftersUp-Canvas-Renderer/1.0' },
                agent: httpsAgent,
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return yield response.buffer();
        });
    }
    /**
     * Charger une image
     */
    loadImage(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const img = yield loadImage(url);
                return img;
            }
            catch (error) {
                console.error(`[NodeAdapter] Échec chargement image:`, error.message);
                throw new Error(`Échec chargement image: ${error.message}`);
            }
        });
    }
    /**
     * Exporter le canvas en PNG
     */
    exportCanvas(canvas) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    yield new Promise((resolve) => {
                        bgImg._element.onload = () => resolve();
                        setTimeout(() => resolve(), 2000);
                    });
                }
            }
            else if (canvas.backgroundColor) {
                console.log(`[NodeAdapter] Couleur de fond: ${canvas.backgroundColor}`);
            }
            // Vérifier tous les objets
            const objects = canvas.getObjects();
            console.log(`[NodeAdapter] Vérification de ${objects.length} objets...`);
            for (const obj of objects) {
                if (obj.type === 'image' && obj._element) {
                    if (!obj._element.complete && obj._element.width === 0) {
                        console.warn('[NodeAdapter] Image non complètement chargée, attente...');
                        yield new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
            }
            // Forcer le rendu
            console.log('[NodeAdapter] Rendu du canvas...');
            canvas.renderAll();
            // Délai pour s'assurer que le pipeline de rendu est terminé
            yield new Promise(resolve => setTimeout(resolve, 150));
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
        });
    }
    /**
     * Nettoyer les ressources
     */
    cleanup() {
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
    getRegisteredFonts() {
        return this.fontManager.getRegisteredFonts();
    }
}
exports.CanvasRendererNodeAdapter = CanvasRendererNodeAdapter;
//# sourceMappingURL=canvas-renderer-node.adapter.js.map