# 🎨 Système de Polices Dynamiques pour Node.js + Fabric.js

## 📋 Vue d'ensemble

Ce système permet d'utiliser des polices personnalisées dans une application Node.js/Express avec Fabric.js **sans avoir besoin de les installer sur Windows Server**.

### Problème résolu
❌ **AVANT**: Vous deviez installer chaque police manuellement dans Windows Server  
✅ **MAINTENANT**: Les polices sont chargées dynamiquement depuis votre API

---

## 🚀 Installation rapide

### 1. Installer les dépendances

```bash
npm install canvas fabric node-fetch opentype.js
npm install --save-dev @types/node
```

### 2. Ajouter les fichiers au projet

```
votre-projet/
├── src/
│   ├── font-manager.ts                    # Gestionnaire de polices
│   ├── canvas-renderer-node_adapter.ts    # Adaptateur amélioré
│   └── server.ts                          # Votre serveur Express
```

### 3. Utilisation de base

```typescript
import { CanvasRendererNodeAdapter } from './canvas-renderer-node_adapter';

const adapter = new CanvasRendererNodeAdapter();

// Charger une police depuis votre API
await adapter.loadFont({
  idFont: 'guid-123',
  designation: 'Arial Bold',
  fontUrl: 'https://votre-api.com/fonts/arial-bold.ttf',
  expectedName: 'Arial'
});

// Créer et rendre le canvas
const canvas = adapter.createCanvas(800, 600);
canvas.loadFromJSON(yourCanvasData, () => {
  const result = await adapter.exportCanvas(canvas);
  // result.buffer contient l'image PNG
});
```

---

## 🎯 Fonctionnalités principales

### ✅ Chargement dynamique
- Les polices sont chargées à la demande depuis votre API
- Pas besoin d'installation système
- Support .ttf et .otf

### ✅ Cache intelligent
- Cache mémoire pour accès rapide
- Cache disque pour persistance
- Évite les rechargements inutiles

### ✅ Détection automatique du nom
- Parse les métadonnées de la police avec opentype.js
- Détecte automatiquement le vrai nom de la police
- Fonctionne avec toutes les polices

### ✅ Gestion d'erreurs robuste
- Retry automatique
- Vérification d'enregistrement
- Logs détaillés

---

## 📚 Exemples d'utilisation

### Exemple 1: API Express complète

```typescript
import express from 'express';
import { CanvasRendererNodeAdapter } from './canvas-renderer-node_adapter';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Middleware de pré-chargement des polices
app.use('/api/render', async (req, res, next) => {
  const { fonts } = req.body;
  const adapter = new CanvasRendererNodeAdapter();
  
  // Charger toutes les polices en parallèle
  await Promise.all(fonts.map(f => adapter.loadFont(f)));
  
  next();
});

// Route de rendu
app.post('/api/render', async (req, res) => {
  const { canvasData } = req.body;
  const adapter = new CanvasRendererNodeAdapter();
  
  const canvas = adapter.createCanvas(
    canvasData.width || 800,
    canvasData.height || 600
  );
  
  canvas.loadFromJSON(canvasData, async () => {
    const result = await adapter.exportCanvas(canvas);
    res.set('Content-Type', 'image/png');
    res.send(result.buffer);
  });
});

app.listen(3000, () => {
  console.log('✓ Serveur démarré sur le port 3000');
  console.log('✓ Système de polices dynamiques activé');
});
```

### Exemple 2: Utilisation avec plusieurs polices

```typescript
const fonts = [
  {
    idFont: 'roboto-regular',
    designation: 'Roboto Regular',
    fontUrl: 'https://fonts.example.com/roboto-regular.ttf',
    expectedName: 'Roboto'
  },
  {
    idFont: 'opensans-bold',
    designation: 'Open Sans Bold',
    fontUrl: 'https://fonts.example.com/opensans-bold.ttf',
    expectedName: 'Open Sans'
  }
];

// Charger toutes les polices
const adapter = new CanvasRendererNodeAdapter();
await Promise.all(fonts.map(f => adapter.loadFont(f)));

// Maintenant, toutes les polices sont disponibles!
console.log('Polices disponibles:', adapter.getRegisteredFonts());
// Output: ['Roboto', 'Open Sans']
```

### Exemple 3: Gestion d'erreurs

```typescript
async function renderWithFallback(fonts, canvasData) {
  const adapter = new CanvasRendererNodeAdapter();
  
  // Charger les polices avec gestion d'erreur
  const results = await Promise.allSettled(
    fonts.map(f => adapter.loadFont(f))
  );
  
  // Vérifier les échecs
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`${failed.length} polices n'ont pas pu être chargées`);
    // Continuer avec les polices système comme fallback
  }
  
  // Faire le rendu normalement
  const canvas = adapter.createCanvas(800, 600);
  canvas.loadFromJSON(canvasData, async () => {
    return await adapter.exportCanvas(canvas);
  });
}
```

### Exemple 4: Statistiques et monitoring

```typescript
import { globalFontManager } from './font-manager';

// Route de monitoring
app.get('/api/font-stats', (req, res) => {
  const stats = globalFontManager.getCacheStats();
  
  res.json({
    totalFonts: stats.fontCount,
    registeredFonts: stats.registeredFonts,
    memory: {
      bytes: stats.memorySize,
      megabytes: (stats.memorySize / 1024 / 1024).toFixed(2)
    },
    disk: {
      bytes: stats.diskSize,
      megabytes: (stats.diskSize / 1024 / 1024).toFixed(2)
    }
  });
});

// Exemple de réponse:
// {
//   "totalFonts": 5,
//   "registeredFonts": ["Arial", "Roboto", "Open Sans"],
//   "memory": { "bytes": 2048000, "megabytes": "1.95" },
//   "disk": { "bytes": 2048000, "megabytes": "1.95" }
// }
```

### Exemple 5: Nettoyage périodique

```typescript
import { globalFontManager } from './font-manager';

// Nettoyer le cache toutes les heures
setInterval(() => {
  const statsBefore = globalFontManager.getCacheStats();
  console.log(`Cache avant: ${statsBefore.fontCount} polices`);
  
  globalFontManager.clearAllCaches();
  
  console.log('✓ Cache nettoyé');
}, 3600000); // 1 heure
```

---

## 🔧 API Reference

### FontManager

#### `loadAndRegisterFont(buffer: Buffer, fontId: string): Promise<string>`
Charge et enregistre une police depuis un buffer.
- **Retourne**: Le nom interne de la police
- **Throws**: Erreur si le chargement échoue

#### `loadFontFromAPI(font: FontDefinition, fetchFunction): Promise<string>`
Charge une police depuis une URL.
- **Retourne**: Le nom interne de la police

#### `isFontLoaded(fontId: string): boolean`
Vérifie si une police est déjà chargée.

#### `getRegisteredFonts(): string[]`
Liste toutes les polices enregistrées.

#### `getCacheStats()`
Obtient les statistiques du cache.

### CanvasRendererNodeAdapter

#### `createCanvas(width: number, height: number)`
Crée un canvas Fabric.js.

#### `loadFont(font: FontDefinition): Promise<void>`
Charge une police pour utilisation dans le canvas.

#### `exportCanvas(canvas): Promise<RenderResult>`
Exporte le canvas en image PNG.

#### `cleanup(): void`
Nettoie les ressources.

---

## 🐛 Résolution de problèmes

### La police n'apparaît pas dans le rendu

**Diagnostic:**
```typescript
// 1. Vérifier que la police est chargée
const adapter = new CanvasRendererNodeAdapter();
console.log(adapter.getRegisteredFonts());

// 2. Vérifier le nom interne
const fontInfo = globalFontManager.getFontInfo('votre-font-id');
console.log('Nom interne:', fontInfo?.internalName);

// 3. Comparer avec le nom dans fabric
console.log('Fabric utilise:', canvasData.objects[0].fontFamily);
```

**Solution:**
Le nom dans `fontFamily` doit correspondre au nom interne de la police, pas au GUID ou au designation.

### Erreur "Font file parsing failed"

**Causes:**
- Fichier de police corrompu
- Format non supporté
- Problème de téléchargement

**Solution:**
```typescript
try {
  await adapter.loadFont(font);
} catch (error) {
  console.error('Échec:', error.message);
  // Utiliser une police de secours
  canvasData.objects.forEach(obj => {
    if (obj.fontFamily === font.expectedName) {
      obj.fontFamily = 'Arial'; // Fallback
    }
  });
}
```

### Performance lente

**Solutions:**

1. **Pré-charger les polices:**
```typescript
// Charger une fois au démarrage
const commonFonts = [...];
await Promise.all(commonFonts.map(f => adapter.loadFont(f)));
```

2. **Utiliser le cache:**
```typescript
// Le FontManager met automatiquement en cache
// Les chargements suivants sont instantanés
```

3. **Nettoyer régulièrement:**
```typescript
// Éviter l'accumulation en mémoire
app.post('/api/render', async (req, res) => {
  const adapter = new CanvasRendererNodeAdapter();
  try {
    // ... rendu
  } finally {
    adapter.cleanup(); // Important!
  }
});
```

---

## 📊 Comparaison des performances

| Opération | Première fois | Depuis le cache |
|-----------|--------------|----------------|
| Chargement police | ~200-500ms | ~1-5ms |
| Enregistrement | ~50ms | 0ms (skip) |
| Rendu canvas | ~100-300ms | ~100-300ms |

---

## 🔒 Sécurité

### Recommandations

1. **Valider les URLs:**
```typescript
function isValidFontUrl(url: string): boolean {
  return url.startsWith('https://') && 
         url.includes('votre-domaine.com');
}
```

2. **Limiter la taille:**
```typescript
const MAX_FONT_SIZE = 5 * 1024 * 1024; // 5MB

if (fontBuffer.length > MAX_FONT_SIZE) {
  throw new Error('Police trop volumineuse');
}
```

3. **Nettoyer les fichiers temporaires:**
```typescript
// Le FontManager nettoie automatiquement
// Mais vous pouvez forcer le nettoyage
globalFontManager.clearAllCaches();
```

---

## 📈 Monitoring en production

```typescript
// Métriques à surveiller
app.get('/api/health', (req, res) => {
  const stats = globalFontManager.getCacheStats();
  
  res.json({
    status: 'healthy',
    fonts: {
      count: stats.fontCount,
      memoryMB: (stats.memorySize / 1024 / 1024).toFixed(2),
      diskMB: (stats.diskSize / 1024 / 1024).toFixed(2)
    },
    alerts: {
      highMemory: stats.memorySize > 100 * 1024 * 1024, // > 100MB
      tooManyFonts: stats.fontCount > 50
    }
  });
});
```

---

## 🎓 Best Practices

### ✅ À faire

- Pré-charger les polices courantes au démarrage
- Utiliser le cache autant que possible
- Nettoyer après chaque rendu
- Gérer les erreurs gracieusement
- Logger les opérations importantes

### ❌ À éviter

- Charger les polices après `loadFromJSON`
- Ignorer les erreurs de chargement
- Accumuler les polices en mémoire
- Oublier de cleanup après le rendu
- Utiliser des polices non validées

---

## 📞 Support et contribution

### Questions fréquentes

**Q: Puis-je utiliser ce système avec d'autres frameworks que Fabric.js?**  
R: Oui, le FontManager est indépendant de Fabric.js. Vous pouvez l'utiliser avec n'importe quel framework qui utilise node-canvas.

**Q: Que se passe-t-il si une police n'est pas disponible?**  
R: Le système utilise automatiquement une police de secours (généralement sans-serif). Vous pouvez aussi définir vos propres polices de secours.

**Q: Combien de polices puis-je charger?**  
R: Techniquement illimité, mais surveiller l'utilisation mémoire. En pratique, 20-30 polices suffisent pour la plupart des applications.

---

## 📝 Licence

Ce code est fourni comme exemple d'implémentation. Adaptez-le selon vos besoins.

---

## 🎉 Conclusion

Avec ce système, vous pouvez:

✅ Utiliser n'importe quelle police sans installation système  
✅ Déployer facilement sur Windows Server  
✅ Avoir un contrôle total sur vos polices  
✅ Bénéficier d'un cache intelligent  
✅ Scaler facilement votre application  

**Pas besoin d'installer les polices dans Windows Server - tout est géré dynamiquement!** 🚀
