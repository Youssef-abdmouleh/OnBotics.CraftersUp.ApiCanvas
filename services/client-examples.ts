/**
 * Exemple d'utilisation côté client
 * Démontre comment appeler l'API avec des polices personnalisées
 */

import fetch from 'node-fetch';

// ========================================
// EXEMPLE 1: Rendu simple avec police personnalisée
// ========================================
async function exemple1_RenderSimple() {
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
        fontFamily: 'Arial',  // Correspond au nom interne de la police
        fill: '#000000'
      }
    ]
  };

  try {
    const response = await fetch('http://localhost:3000/api/render', {
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
    const buffer = await response.buffer();
    const fs = require('fs');
    fs.writeFileSync('./output-exemple1.png', buffer);

    console.log('✓ Image sauvegardée: output-exemple1.png');
    console.log(`✓ Taille: ${buffer.length} octets`);

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

// ========================================
// EXEMPLE 2: Rendu avec plusieurs polices
// ========================================
async function exemple2_MultipleFonts() {
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
    const response = await fetch('http://localhost:3000/api/render', {
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

    const buffer = await response.buffer();
    const fs = require('fs');
    fs.writeFileSync('./output-exemple2.png', buffer);

    console.log('✓ Image sauvegardée: output-exemple2.png');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

// ========================================
// EXEMPLE 3: Tester une police
// ========================================
async function exemple3_TestFont() {
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
    const response = await fetch('http://localhost:3000/api/test-font', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ font })
    });

    const result = await response.json();

    console.log('✓ Police testée avec succès:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

// ========================================
// EXEMPLE 4: Vérifier les statistiques du cache
// ========================================
async function exemple4_CacheStats() {
  console.log('\n========================================');
  console.log('EXEMPLE 4: Statistiques du cache');
  console.log('========================================\n');

  try {
    const response = await fetch('http://localhost:3000/api/cache-stats');
    const stats = await response.json();

    console.log('📊 Statistiques du cache:');
    console.log(`   Polices en cache: ${stats.fontCount}`);
    console.log(`   Mémoire utilisée: ${stats.memorySizeMB} MB`);
    console.log(`   Disque utilisé: ${stats.diskSizeMB} MB`);
    console.log(`   Polices enregistrées:`, stats.registeredFonts);

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

// ========================================
// EXEMPLE 5: Utilisation avec votre API existante
// ========================================
async function exemple5_AvecVotreAPI() {
  console.log('\n========================================');
  console.log('EXEMPLE 5: Intégration avec votre API');
  console.log('========================================\n');

  // Supposons que vous avez une fonction pour récupérer vos polices depuis votre API
  async function getFontsFromYourAPI(): Promise<any[]> {
    // Remplacez par votre vraie logique d'API
    const response = await fetch('https://votre-api.com/api/fonts/list');
    return await response.json();
  }

  try {
    // 1. Récupérer la liste des polices depuis votre API
    const yourFonts = await getFontsFromYourAPI();

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
          fontFamily: fonts[0].expectedName,  // Utiliser la première police
          fontSize: 32,
          left: 100,
          top: 100
        }
      ]
    };

    // 4. Faire le rendu
    const response = await fetch('http://localhost:3000/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fonts, canvasData })
    });

    const buffer = await response.buffer();
    console.log('✓ Rendu terminé avec vos polices API');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

// ========================================
// EXECUTER LES EXEMPLES
// ========================================
async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  EXEMPLES D\'UTILISATION DU SYSTEME   ║');
  console.log('║  DE POLICES DYNAMIQUES                ║');
  console.log('╚════════════════════════════════════════╝');

  // Décommenter l'exemple que vous voulez tester
  
  // await exemple1_RenderSimple();
  // await exemple2_MultipleFonts();
  // await exemple3_TestFont();
  await exemple4_CacheStats();
  // await exemple5_AvecVotreAPI();

  console.log('\n✓ Terminé!\n');
}

// Exécuter si c'est le fichier principal
if (require.main === module) {
  main().catch(console.error);
}

export {
  exemple1_RenderSimple,
  exemple2_MultipleFonts,
  exemple3_TestFont,
  exemple4_CacheStats,
  exemple5_AvecVotreAPI
};
