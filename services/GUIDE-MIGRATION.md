# 📘 Guide de Migration - Système de Polices Dynamiques

## 🎯 Objectif
Éliminer complètement le besoin d'installer les polices sur Windows Server en utilisant le chargement dynamique avec `registerFont` de node-canvas.

---

## 🔄 Migration de votre code existant

### Étape 1: Installer le nouveau FontManager

```typescript
// Créez le fichier font-manager.ts dans votre projet
// Utilisez le code fourni dans font-manager.ts
```

### Étape 2: Modifier votre canvas-renderer-node_adapter.ts

#### **AVANT** (votre code actuel):
```typescript
// Ligne 404-405 - COMMENTÉ
// registerFont(tempPath, { family: internalName });
// console.log(`[NodeAdapter] Font registered with family name: "${internalName}"`);
```

#### **APRÈS** (nouveau code):
```typescript
import { FontManager, globalFontManager } from './font-manager';

export class CanvasRendererNodeAdapter {
  private fontManager: FontManager;

  constructor(fontManager?: FontManager) {
    this.fontManager = fontManager || globalFontManager;
  }

  async loadFont(font: FontDefinition): Promise<void> {
    // Simple! Le FontManager fait tout
    const fontBuffer = await this.fetchFontFromAPI(font.fontUrl);
    await this.fontManager.loadAndRegisterFont(fontBuffer, font.idFont);
  }
}
```

### Étape 3: Mettre à jour votre API Express

```typescript
import { CanvasRendererNodeAdapter } from './canvas-renderer-node_adapter-improved';

// Middleware pour pré-charger les polices
const preloadFontsMiddleware = async (req, res, next) => {
  const { fonts } = req.body;
  const adapter = new CanvasRendererNodeAdapter();
  
  // Charger toutes les polices en parallèle
  await Promise.all(
    fonts.map(font => adapter.loadFont(font))
  );
  
  next();
};

// Route de rendu
app.post('/api/render', preloadFontsMiddleware, async (req, res) => {
  const adapter = new CanvasRendererNodeAdapter();
  const canvas = adapter.createCanvas(800, 600);
  
  // Les polices sont déjà chargées par le middleware!
  canvas.loadFromJSON(req.body.canvasData, () => {
    const result = adapter.exportCanvas(canvas);
    res.send(result.buffer);
  });
});
```

---

## ✅ Avantages de cette solution

### 1. **Pas d'installation système**
❌ **AVANT**: Installer chaque police dans Windows Server  
✅ **APRÈS**: Les polices sont chargées dynamiquement à la demande

### 2. **Cache intelligent**
- Cache mémoire pour accès rapide
- Cache disque temporaire pour persistance
- Pas de rechargement inutile

### 3. **Isolation complète**
- Chaque application a ses propres polices
- Pas de conflits entre applications
- Facile à nettoyer

### 4. **Déploiement simplifié**
```bash
# AVANT
1. Copier les polices sur le serveur
2. Installer chaque police manuellement
3. Redémarrer le serveur
4. Vérifier que ça fonctionne

# APRÈS
1. Déployer le code
2. C'est tout! ✓
```

---

## 🧪 Comment tester

### Test 1: Vérifier qu'une police se charge
```bash
curl -X POST http://localhost:3000/api/test-font \
  -H "Content-Type: application/json" \
  -d '{
    "font": {
      "idFont": "test-123",
      "designation": "Arial",
      "fontUrl": "https://votre-api.com/fonts/arial.ttf"
    }
  }'
```

### Test 2: Faire un rendu
```bash
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "fonts": [
      {
        "idFont": "font-1",
        "designation": "Arial",
        "fontUrl": "https://votre-api.com/fonts/arial.ttf",
        "expectedName": "Arial"
      }
    ],
    "canvasData": {
      "width": 800,
      "height": 600,
      "objects": [
        {
          "type": "text",
          "text": "Test avec Arial",
          "fontFamily": "Arial",
          "fontSize": 40,
          "left": 100,
          "top": 100
        }
      ]
    }
  }' \
  --output test-output.png
```

### Test 3: Vérifier les statistiques
```bash
curl http://localhost:3000/api/cache-stats
```

---

## 🔧 Résolution de problèmes

### Problème: "La police n'apparaît pas dans le rendu"

**Diagnostic:**
```typescript
// Vérifier les polices enregistrées
const adapter = new CanvasRendererNodeAdapter();
console.log('Polices disponibles:', adapter.getRegisteredFonts());
```

**Solutions:**
1. Vérifier que le nom dans `fontFamily` correspond au nom interne
2. S'assurer que `loadFont()` est appelé AVANT `loadFromJSON()`
3. Vérifier les logs pour voir le nom interne détecté

### Problème: "Erreur lors du parsing de la police"

**Causes possibles:**
- Fichier de police corrompu
- Format non supporté (doit être .ttf ou .otf)
- URL invalide

**Solution:**
```typescript
try {
  await adapter.loadFont(font);
} catch (error) {
  console.error('Détails:', error.message);
  // Utiliser une police de secours
}
```

### Problème: "Mémoire qui augmente"

**Solution:**
```typescript
// Nettoyer périodiquement
setInterval(() => {
  globalFontManager.cleanup();
}, 3600000); // Chaque heure
```

---

## 📊 Comparaison des approches

| Aspect | Installation Système | Chargement Dynamique (Notre Solution) |
|--------|---------------------|---------------------------------------|
| Setup initial | ⚠️ Complexe | ✅ Simple |
| Déploiement | ⚠️ Manuel | ✅ Automatique |
| Maintenance | ⚠️ Difficile | ✅ Facile |
| Isolation | ❌ Global | ✅ Par application |
| Performance | ✅ Rapide | ✅ Rapide (avec cache) |
| Flexibilité | ❌ Limitée | ✅ Totale |
| Permissions requises | ❌ Admin | ✅ Aucune |

---

## 🚀 Checklist de migration

- [ ] Créer `font-manager.ts` dans votre projet
- [ ] Mettre à jour `canvas-renderer-node_adapter.ts`
- [ ] Ajouter le middleware de pré-chargement
- [ ] Tester avec une police
- [ ] Tester avec plusieurs polices
- [ ] Vérifier les performances
- [ ] Déployer sur le serveur de test
- [ ] Valider en production

---

## 💡 Bonnes pratiques

### 1. Pré-charger les polices
```typescript
// BON: Charger avant le rendu
await adapter.loadFont(font);
canvas.loadFromJSON(data, callback);

// MAUVAIS: Charger après
canvas.loadFromJSON(data, callback);
await adapter.loadFont(font); // Trop tard!
```

### 2. Gérer les erreurs
```typescript
const loadedFonts = await Promise.allSettled(
  fonts.map(f => adapter.loadFont(f))
);

// Vérifier les échecs
const failures = loadedFonts.filter(r => r.status === 'rejected');
if (failures.length > 0) {
  console.warn('Certaines polices ont échoué:', failures);
}
```

### 3. Optimiser le cache
```typescript
// Nettoyer le cache après chaque rendu si nécessaire
app.post('/api/render', async (req, res) => {
  const adapter = new CanvasRendererNodeAdapter();
  
  try {
    // ... faire le rendu
  } finally {
    // Nettoyer seulement les ressources de ce rendu
    adapter.cleanup();
  }
});
```

### 4. Monitorer l'utilisation
```typescript
// Endpoint de monitoring
app.get('/api/metrics', (req, res) => {
  const stats = globalFontManager.getCacheStats();
  
  res.json({
    fonts: stats.fontCount,
    memoryMB: (stats.memorySize / 1024 / 1024).toFixed(2),
    diskMB: (stats.diskSize / 1024 / 1024).toFixed(2),
    registered: stats.registeredFonts
  });
});
```

---

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifier les logs pour les messages `[FontManager]`
2. Tester avec l'endpoint `/api/test-font`
3. Vérifier que node-canvas est correctement installé
4. S'assurer que les polices sont au format .ttf ou .otf

---

## 🎉 Résultat final

Avec cette solution, vous avez:

✅ **Aucune installation système nécessaire**  
✅ **Chargement automatique des polices**  
✅ **Cache intelligent**  
✅ **Déploiement simplifié**  
✅ **Isolation complète**  
✅ **Gestion d'erreurs robuste**  

**Votre application peut maintenant utiliser n'importe quelle police sans toucher au système Windows Server!**
