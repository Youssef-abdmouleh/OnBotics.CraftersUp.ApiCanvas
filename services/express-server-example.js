"use strict";
/**
 * Exemple d'API Express avec chargement dynamique de polices
 * Démontre comment utiliser le système sans installer les polices sur Windows Server
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
const express_1 = require("express");
const canvas_renderer_node_adapter_1 = require("./canvas-renderer-node.adapter");
const font_manager_1 = require("./font-manager");
const app = (0, express_1.default)();
const fabric = require('fabric').fabric;
// Middleware
app.use(express_1.default.json({ limit: '50mb' }));
/**
 * Middleware pour pré-charger les polices nécessaires
 * S'exécute AVANT le rendu pour s'assurer que toutes les polices sont disponibles
 */
const preloadFontsMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fonts, canvasData } = req.body;
        if (!fonts || !Array.isArray(fonts)) {
            return next();
        }
        console.log(`[API] Pré-chargement de ${fonts.length} polices...`);
        // Charger toutes les polices en parallèle
        const adapter = new canvas_renderer_node_adapter_1.CanvasRendererNodeAdapter();
        const fontPromises = fonts.map((font) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield adapter.loadFont(font);
                console.log(`[API] ✓ Police chargée: ${font.designation}`);
            }
            catch (error) {
                console.error(`[API] ❌ Échec chargement: ${font.designation}`, error.message);
                // Continue même si une police échoue
            }
        }));
        yield Promise.all(fontPromises);
        console.log('[API] ✓ Toutes les polices sont prêtes');
        console.log('[API] Polices enregistrées:', adapter.getRegisteredFonts());
        next();
    }
    catch (error) {
        console.error('[API] Erreur dans le middleware de polices:', error.message);
        next(error);
    }
});
/**
 * Route principale de rendu
 * POST /api/render
 * Body: {
 *   fonts: FontDefinition[],
 *   canvasData: any (JSON Fabric.js)
 * }
 */
app.post('/api/render', preloadFontsMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let adapter = null;
    try {
        console.log('[API] ========================================');
        console.log('[API] Nouvelle demande de rendu');
        console.log('[API] ========================================');
        const { canvasData, fonts } = req.body;
        if (!canvasData) {
            return res.status(400).json({ error: 'canvasData requis' });
        }
        // Créer l'adaptateur
        adapter = new canvas_renderer_node_adapter_1.CanvasRendererNodeAdapter();
        // Créer le canvas
        const width = canvasData.width || 800;
        const height = canvasData.height || 600;
        const canvas = adapter.createCanvas(width, height);
        console.log('[API] Canvas créé, chargement des données...');
        // Charger les données Fabric.js
        yield new Promise((resolve, reject) => {
            canvas.loadFromJSON(canvasData, () => {
                console.log('[API] ✓ Données canvas chargées');
                resolve();
            }, (error) => {
                console.error('[API] ❌ Erreur chargement canvas:', error);
                reject(new Error('Échec du chargement des données canvas'));
            });
        });
        // Attendre que tout soit chargé
        yield new Promise(resolve => setTimeout(resolve, 300));
        console.log('[API] Rendu du canvas...');
        // Exporter
        const result = yield adapter.exportCanvas(canvas);
        console.log('[API] ========================================');
        console.log('[API] ✓ RENDU REUSSI');
        console.log(`[API] Taille: ${result.width}x${result.height}`);
        console.log(`[API] Objets: ${result.objectCount}`);
        console.log(`[API] Buffer: ${(_a = result.buffer) === null || _a === void 0 ? void 0 : _a.length} octets`);
        console.log('[API] ========================================');
        // Statistiques du cache
        const stats = adapter.getCacheStats();
        console.log('[API] Stats cache:', stats);
        // Retourner l'image
        res.set('Content-Type', 'image/png');
        res.set('X-Canvas-Width', result.width.toString());
        res.set('X-Canvas-Height', result.height.toString());
        res.set('X-Object-Count', result.objectCount.toString());
        res.send(result.buffer);
    }
    catch (error) {
        console.error('[API] ❌ Erreur de rendu:', error.message);
        console.error('[API] Stack:', error.stack);
        res.status(500).json({
            error: 'Échec du rendu',
            message: error.message
        });
    }
    finally {
        if (adapter) {
            adapter.cleanup();
        }
    }
}));
/**
 * Route de test pour vérifier une police spécifique
 * POST /api/test-font
 */
app.post('/api/test-font', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { font } = req.body;
        if (!font) {
            return res.status(400).json({ error: 'font requis' });
        }
        const adapter = new canvas_renderer_node_adapter_1.CanvasRendererNodeAdapter();
        console.log(`[API] Test de la police: ${font.designation}`);
        // Charger la police
        yield adapter.loadFont(font);
        const fontInfo = font_manager_1.globalFontManager.getFontInfo(font.idFont);
        res.json({
            success: true,
            font: {
                id: font.idFont,
                designation: font.designation,
                internalName: fontInfo === null || fontInfo === void 0 ? void 0 : fontInfo.internalName,
                isRegistered: fontInfo === null || fontInfo === void 0 ? void 0 : fontInfo.isRegistered,
                filePath: fontInfo === null || fontInfo === void 0 ? void 0 : fontInfo.filePath
            },
            registeredFonts: adapter.getRegisteredFonts(),
            cacheStats: adapter.getCacheStats()
        });
    }
    catch (error) {
        console.error('[API] Erreur test police:', error.message);
        res.status(500).json({
            error: 'Échec du test',
            message: error.message
        });
    }
}));
/**
 * Route pour obtenir les statistiques du cache
 * GET /api/cache-stats
 */
app.get('/api/cache-stats', (req, res) => {
    const stats = font_manager_1.globalFontManager.getCacheStats();
    res.json(Object.assign(Object.assign({}, stats), { memorySizeMB: (stats.memorySize / (1024 * 1024)).toFixed(2), diskSizeMB: (stats.diskSize / (1024 * 1024)).toFixed(2) }));
});
/**
 * Route pour nettoyer le cache
 * POST /api/clear-cache
 */
app.post('/api/clear-cache', (req, res) => {
    try {
        font_manager_1.globalFontManager.clearAllCaches();
        res.json({
            success: true,
            message: 'Cache nettoyé avec succès'
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Échec du nettoyage',
            message: error.message
        });
    }
});
/**
 * Route de santé
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
    const stats = font_manager_1.globalFontManager.getCacheStats();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        cache: {
            fonts: stats.fontCount,
            registeredFonts: stats.registeredFonts,
            memoryMB: (stats.memorySize / (1024 * 1024)).toFixed(2),
            diskMB: (stats.diskSize / (1024 * 1024)).toFixed(2)
        }
    });
});
// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('========================================');
    console.log(`✓ Serveur démarré sur le port ${PORT}`);
    console.log('✓ Système de polices dynamiques activé');
    console.log('✓ AUCUNE installation système requise!');
    console.log('========================================');
    console.log('Routes disponibles:');
    console.log(`  POST http://localhost:${PORT}/api/render`);
    console.log(`  POST http://localhost:${PORT}/api/test-font`);
    console.log(`  GET  http://localhost:${PORT}/api/cache-stats`);
    console.log(`  POST http://localhost:${PORT}/api/clear-cache`);
    console.log(`  GET  http://localhost:${PORT}/api/health`);
    console.log('========================================');
});
exports.default = app;
//# sourceMappingURL=express-server-example.js.map