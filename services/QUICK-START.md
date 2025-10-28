# 🚀 Guide de Démarrage Rapide

## Installation en 5 minutes

### Étape 1: Copier les fichiers dans votre projet

```bash
# Créer le dossier pour les nouveaux fichiers
mkdir -p src/font-system

# Copier les fichiers
cp font-manager.ts src/font-system/
cp canvas-renderer-node_adapter-improved.ts src/font-system/
```

### Étape 2: Installer les dépendances

```bash
npm install canvas fabric node-fetch opentype.js
npm install --save-dev @types/node @types/express @types/node-fetch
```

### Étape 3: Utiliser dans votre code

#### Option A: Remplacer votre ancien adapter

```typescript
// Remplacez votre ancien import
// import { CanvasRendererNodeAdapter } from './canvas-renderer-node_adapter';

// Par le nouveau
import { CanvasRendererNodeAdapter } from './font-system/canvas-renderer-node_adapter-improved';
```

#### Option B: Ajouter à votre API Express existante

```typescript
import express from 'express';
import { CanvasRendererNodeAdapter } from './font-system/canvas-renderer-node_adapter-improved';

const app = express();

// Ajoutez cette route à votre API existante
app.post('/api/render', async (req, res) => {
  const { fonts, canvasData } = req.body;
  const adapter = new CanvasRendererNodeAdapter();
  
  // Charger les polices
  for (const font of fonts) {
    await adapter.loadFont(font);
  }
  
  // Créer le canvas
  const canvas = adapter.createCanvas(
    canvasData.width || 800,
    canvasData.height || 600
  );
  
  // Charger et rendre
  canvas.loadFromJSON(canvasData, async () => {
    const result = await adapter.exportCanvas(canvas);
    res.set('Content-Type', 'image/png');
    res.send(result.buffer);
  });
});
```

### Étape 4: Tester

```bash
# Démarrer votre serveur
npm start

# Dans un autre terminal, tester
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "fonts": [{
      "idFont": "test-font",
      "designation": "Arial",
      "fontUrl": "https://votre-api.com/fonts/arial.ttf"
    }],
    "canvasData": {
      "width": 800,
      "height": 600,
      "objects": [{
        "type": "text",
        "text": "Hello World!",
        "fontFamily": "Arial",
        "fontSize": 40,
        "left": 100,
        "top": 100
      }]
    }
  }' \
  --output test.png
```

---

## ✅ Vérification

Si tout fonctionne, vous devriez voir:

```
[FontManager] Initialisé avec cache mémoire et disque
[NodeAdapter] Initialisé avec FontManager (chargement dynamique des polices)
[NodeAdapter] ✓ Aucune installation système requise!
[FontManager] Chargement de la police: test-font
[FontManager] Nom interne détecté: "Arial"
[FontManager] Police enregistrée avec node-canvas: "Arial"
[FontManager] ✓ Police prête à l'emploi: "Arial"
[NodeAdapter] ✓ POLICE PRETE: "Arial"
```

---

## 🔥 Points critiques

### 1. L'ordre est important!

```typescript
// ✅ BON
await adapter.loadFont(font);  // D'abord charger
canvas.loadFromJSON(data);     // Puis utiliser

// ❌ MAUVAIS
canvas.loadFromJSON(data);     // Trop tard!
await adapter.loadFont(font);  // La police ne sera pas utilisée
```

### 2. Nom de la police

Le `fontFamily` dans votre JSON Fabric doit correspondre au **nom interne** de la police:

```typescript
// Le système détecte automatiquement:
// Fichier: arial-bold.ttf
// Nom interne détecté: "Arial" 
// Utilisez dans Fabric: fontFamily: "Arial"
```

### 3. Format des polices

Seuls les formats suivants sont supportés:
- ✅ .ttf (TrueType)
- ✅ .otf (OpenType)
- ❌ .woff (non supporté par node-canvas)
- ❌ .woff2 (non supporté par node-canvas)

---

## 🐛 Problèmes courants

### "Police non trouvée"

**Vérifier:**
```typescript
const adapter = new CanvasRendererNodeAdapter();
await adapter.loadFont(font);

// Vérifier le nom détecté
console.log('Polices disponibles:', adapter.getRegisteredFonts());
```

### "Erreur de parsing"

**Solution:**
```bash
# Vérifier le fichier de police
file votre-police.ttf

# Doit afficher quelque chose comme:
# votre-police.ttf: TrueType Font data
```

### "Mémoire qui augmente"

**Solution:**
```typescript
// Nettoyer après chaque rendu
app.post('/api/render', async (req, res) => {
  const adapter = new CanvasRendererNodeAdapter();
  try {
    // ... votre code
  } finally {
    adapter.cleanup();  // Important!
  }
});
```

---

## 📖 Documentation complète

Pour plus d'informations, consultez:
- `README.md` - Documentation complète
- `GUIDE-MIGRATION.md` - Guide de migration détaillé
- `client-examples.ts` - Exemples d'utilisation

---

## 💡 Astuce Pro

Pour des performances optimales, pré-chargez vos polices courantes au démarrage:

```typescript
import { globalFontManager } from './font-system/font-manager';

// Au démarrage de votre app
async function preloadCommonFonts() {
  const commonFonts = [
    { id: '1', url: 'https://api.com/arial.ttf' },
    { id: '2', url: 'https://api.com/roboto.ttf' }
  ];
  
  for (const font of commonFonts) {
    const buffer = await fetchFont(font.url);
    await globalFontManager.loadAndRegisterFont(buffer, font.id);
  }
  
  console.log('✓ Polices communes pré-chargées');
}

preloadCommonFonts().then(() => {
  app.listen(3000);
});
```

---

## 🎉 C'est tout!

Vous êtes maintenant prêt à utiliser des polices personnalisées sans installation système!

**Questions?** Consultez le README.md pour plus de détails.
