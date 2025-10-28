"use strict";
/**
 * Exemple d'utilisation côté client
 * Démontre comment appeler l'API avec des polices personnalisées
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
exports.exemple5_AvecVotreAPI = exports.exemple4_CacheStats = exports.exemple3_TestFont = exports.exemple2_MultipleFonts = exports.exemple1_RenderSimple = void 0;
const node_fetch_1 = require("node-fetch");
// ========================================
// EXEMPLE 1: Rendu simple avec police personnalisée
// ========================================
function exemple1_RenderSimple() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n========================================');
        console.log('EXEMPLE 1: Rendu simple');
        console.log('========================================\n');
        // Définir la police à utiliser
        const fonts = [
            {
                idFont: '12345-abcde-67890',
                designation: 'Arial Bold',
                fontUrl: 'https://votre-api.com/fonts/arial-bold.ttf',
                expectedName: 'Arial',
                enabled: true
            }
        ];
        // Données Fabric.js
        const canvasData = {
            version: '5.3.0',
            width: 800,
            height: 600,
            backgroundColor: '#ffffff',
            objects: [
                {
                    type: 'text',
                    text: 'Bonjour avec police personnalisée!',
                    left: 100,
                    top: 100,
                    fontSize: 40,
                    fontFamily: 'Arial',
                    fill: '#000000'
                }
            ]
        };
        try {
            const response = yield (0, node_fetch_1.default)('http://localhost:3000/api/render', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fonts,
                    canvasData
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            // Sauvegarder l'image
            const buffer = yield response.buffer();
            const fs = require('fs');
            fs.writeFileSync('./output-exemple1.png', buffer);
            console.log('✓ Image sauvegardée: output-exemple1.png');
            console.log(`✓ Taille: ${buffer.length} octets`);
        }
        catch (error) {
            console.error('❌ Erreur:', error.message);
        }
    });
}
exports.exemple1_RenderSimple = exemple1_RenderSimple;
// ========================================
// EXEMPLE 2: Rendu avec plusieurs polices
// ========================================
function exemple2_MultipleFonts() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n========================================');
        console.log('EXEMPLE 2: Plusieurs polices');
        console.log('========================================\n');
        const fonts = [
            {
                idFont: 'font-1',
                designation: 'Roboto Regular',
                fontUrl: 'https://votre-api.com/fonts/roboto-regular.ttf',
                expectedName: 'Roboto'
            },
            {
                idFont: 'font-2',
                designation: 'Open Sans Bold',
                fontUrl: 'https://votre-api.com/fonts/opensans-bold.ttf',
                expectedName: 'Open Sans'
            },
            {
                idFont: 'font-3',
                designation: 'Montserrat',
                fontUrl: 'https://votre-api.com/fonts/montserrat.ttf',
                expectedName: 'Montserrat'
            }
        ];
        const canvasData = {
            version: '5.3.0',
            width: 1000,
            height: 400,
            backgroundColor: '#f0f0f0',
            objects: [
                {
                    type: 'text',
                    text: 'Titre avec Roboto',
                    left: 50,
                    top: 50,
                    fontSize: 48,
                    fontFamily: 'Roboto',
                    fill: '#333333'
                },
                {
                    type: 'text',
                    text: 'Sous-titre avec Open Sans',
                    left: 50,
                    top: 120,
                    fontSize: 32,
                    fontFamily: 'Open Sans',
                    fill: '#666666'
                },
                {
                    type: 'text',
                    text: 'Corps avec Montserrat',
                    left: 50,
                    top: 180,
                    fontSize: 24,
                    fontFamily: 'Montserrat',
                    fill: '#999999'
                }
            ]
        };
        try {
            const response = yield (0, node_fetch_1.default)('http://localhost:3000/api/render', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fonts,
                    canvasData
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const buffer = yield response.buffer();
            const fs = require('fs');
            fs.writeFileSync('./output-exemple2.png', buffer);
            console.log('✓ Image sauvegardée: output-exemple2.png');
        }
        catch (error) {
            console.error('❌ Erreur:', error.message);
        }
    });
}
exports.exemple2_MultipleFonts = exemple2_MultipleFonts;
// ========================================
// EXEMPLE 3: Tester une police
// ========================================
function exemple3_TestFont() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n========================================');
        console.log('EXEMPLE 3: Test de police');
        console.log('========================================\n');
        const font = {
            idFont: 'test-font-123',
            designation: 'Ma Police Test',
            fontUrl: 'https://votre-api.com/fonts/test.ttf',
            expectedName: 'Test Font'
        };
        try {
            const response = yield (0, node_fetch_1.default)('http://localhost:3000/api/test-font', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ font })
            });
            const result = yield response.json();
            console.log('✓ Police testée avec succès:');
            console.log(JSON.stringify(result, null, 2));
        }
        catch (error) {
            console.error('❌ Erreur:', error.message);
        }
    });
}
exports.exemple3_TestFont = exemple3_TestFont;
// ========================================
// EXEMPLE 4: Vérifier les statistiques du cache
// ========================================
function exemple4_CacheStats() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n========================================');
        console.log('EXEMPLE 4: Statistiques du cache');
        console.log('========================================\n');
        try {
            const response = yield (0, node_fetch_1.default)('http://localhost:3000/api/cache-stats');
            const stats = yield response.json();
            console.log('📊 Statistiques du cache:');
            console.log(`   Polices en cache: ${stats.fontCount}`);
            console.log(`   Mémoire utilisée: ${stats.memorySizeMB} MB`);
            console.log(`   Disque utilisé: ${stats.diskSizeMB} MB`);
            console.log(`   Polices enregistrées:`, stats.registeredFonts);
        }
        catch (error) {
            console.error('❌ Erreur:', error.message);
        }
    });
}
exports.exemple4_CacheStats = exemple4_CacheStats;
// ========================================
// EXEMPLE 5: Utilisation avec votre API existante
// ========================================
function exemple5_AvecVotreAPI() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n========================================');
        console.log('EXEMPLE 5: Intégration avec votre API');
        console.log('========================================\n');
        // Supposons que vous avez une fonction pour récupérer vos polices depuis votre API
        function getFontsFromYourAPI() {
            return __awaiter(this, void 0, void 0, function* () {
                // Remplacez par votre vraie logique d'API
                const response = yield (0, node_fetch_1.default)('https://votre-api.com/api/fonts/list');
                return yield response.json();
            });
        }
        try {
            // 1. Récupérer la liste des polices depuis votre API
            const yourFonts = yield getFontsFromYourAPI();
            // 2. Transformer au format attendu
            const fonts = yourFonts.map(f => ({
                idFont: f.id,
                designation: f.name,
                fontUrl: f.downloadUrl,
                expectedName: f.fontFamily,
                enabled: f.active
            }));
            // 3. Créer votre canvas data
            const canvasData = {
                version: '5.3.0',
                width: 800,
                height: 600,
                objects: [
                    {
                        type: 'text',
                        text: 'Utilisation avec votre API',
                        fontFamily: fonts[0].expectedName,
                        fontSize: 32,
                        left: 100,
                        top: 100
                    }
                ]
            };
            // 4. Faire le rendu
            const response = yield (0, node_fetch_1.default)('http://localhost:3000/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fonts, canvasData })
            });
            const buffer = yield response.buffer();
            console.log('✓ Rendu terminé avec vos polices API');
        }
        catch (error) {
            console.error('❌ Erreur:', error.message);
        }
    });
}
exports.exemple5_AvecVotreAPI = exemple5_AvecVotreAPI;
// ========================================
// EXECUTER LES EXEMPLES
// ========================================
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║  EXEMPLES D\'UTILISATION DU SYSTEME   ║');
        console.log('║  DE POLICES DYNAMIQUES                ║');
        console.log('╚════════════════════════════════════════╝');
        // Décommenter l'exemple que vous voulez tester
        // await exemple1_RenderSimple();
        // await exemple2_MultipleFonts();
        // await exemple3_TestFont();
        yield exemple4_CacheStats();
        // await exemple5_AvecVotreAPI();
        console.log('\n✓ Terminé!\n');
    });
}
// Exécuter si c'est le fichier principal
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=client-examples.js.map