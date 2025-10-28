# 🏗️ Architecture du Système de Polices Dynamiques

## 📊 Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT / FRONTEND                         │
│  (Angular, React, Vue, ou API REST Client)                      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ HTTP POST /api/render
                             │ Body: { fonts: [...], canvasData: {...} }
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS SERVER                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Middleware: preloadFontsMiddleware           │    │
│  │  • Reçoit la liste des polices                        │    │
│  │  • Charge toutes les polices en parallèle            │    │
│  │  • Passe au prochain middleware                       │    │
│  └─────────────────────┬──────────────────────────────────┘    │
│                        │                                         │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            Route Handler: /api/render                  │    │
│  │  • Crée le CanvasRendererNodeAdapter                  │    │
│  │  • Crée le canvas Fabric.js                          │    │
│  │  • Charge les données JSON                           │    │
│  │  • Exporte en PNG                                     │    │
│  │  • Retourne le buffer image                          │    │
│  └─────────────────────┬──────────────────────────────────┘    │
└────────────────────────┼──────────────────────────────────────┬─┘
                         │                                       │
                         ▼                                       │
┌──────────────────────────────────────────────────────────────┐ │
│          CanvasRendererNodeAdapter                           │ │
│                                                              │ │
│  Responsabilités:                                           │ │
│  ✓ Créer le canvas Fabric.js avec node-canvas             │ │
│  ✓ Appliquer les patches pour Node.js                     │ │
│  ✓ Charger les polices via FontManager                    │ │
│  ✓ Gérer le cycle de vie du canvas                        │ │
│  ✓ Exporter en PNG/Buffer                                 │ │
│                                                              │ │
│  Méthodes principales:                                       │ │
│  • createCanvas(width, height)                             │ │
│  • loadFont(fontDefinition)                                │ │
│  • exportCanvas(canvas)                                    │ │
│  • cleanup()                                               │ │
└─────────────────────┬────────────────────────────────────────┘ │
                      │                                           │
                      │ Utilise                                   │
                      ▼                                           │
┌──────────────────────────────────────────────────────────────┐ │
│                     FontManager                              │ │
│                                                              │ │
│  Responsabilités:                                           │ │
│  ✓ Télécharger les polices depuis l'API                   │ │
│  ✓ Parser avec opentype.js                                │ │
│  ✓ Extraire le nom interne                                │ │
│  ✓ Enregistrer avec registerFont()                        │ │
│  ✓ Gérer le cache (mémoire + disque)                      │ │
│  ✓ Vérifier l'enregistrement                              │ │
│                                                              │ │
│  Cache:                                                      │ │
│  • Map<fontId, FontInfo> (mémoire)                         │ │
│  • /tmp/canvas-fonts/*.ttf (disque)                        │ │
│  • Set<internalName> (tracking)                            │ │
│                                                              │ │
│  Méthodes principales:                                       │ │
│  • loadAndRegisterFont(buffer, id)                         │ │
│  • loadFontFromAPI(definition, fetch)                      │ │
│  • isFontLoaded(fontId)                                    │ │
│  • getRegisteredFonts()                                    │ │
│  • getCacheStats()                                         │ │
│  • cleanup() / clearAllCaches()                            │ │
└─────────┬──────────────────────────────────────────────┬─────┘ │
          │                                              │       │
          │ Utilise                                      │       │
          ▼                                              ▼       │
┌──────────────────────┐                    ┌─────────────────┐ │
│    opentype.js       │                    │  node-canvas    │ │
│                      │                    │  registerFont() │ │
│  • Parse .ttf/.otf   │                    │                 │ │
│  • Extrait metadata  │                    │  • Enregistre   │ │
│  • Détecte nom       │                    │    la police    │ │
│    interne           │                    │  • Rend dispo   │ │
└──────────────────────┘                    │    pour canvas  │ │
                                            └─────────────────┘ │
                                                      │         │
                                                      │ Utilise │
                                                      ▼         │
                                            ┌─────────────────┐ │
                                            │   Fabric.js     │ │
                                            │                 │ │
                                            │  • Rendering    │◄┘
                                            │  • Text layout  │
                                            │  • Font usage   │
                                            └─────────────────┘
```

---

## 🔄 Flux de données détaillé

### 1️⃣ Requête initiale

```
Client
  │
  ├─ POST /api/render
  │
  └─ Body: {
       fonts: [
         {
           idFont: "guid-123",
           designation: "Arial Bold",
           fontUrl: "https://api.com/fonts/arial-bold.ttf",
           expectedName: "Arial"
         }
       ],
       canvasData: {
         width: 800,
         height: 600,
         objects: [...]
       }
     }
```

### 2️⃣ Middleware - Pré-chargement des polices

```
preloadFontsMiddleware
  │
  ├─ Extrait fonts[] du body
  │
  ├─ Pour chaque police:
  │   │
  │   ├─ Crée CanvasRendererNodeAdapter
  │   │
  │   └─ Appelle adapter.loadFont(font)
  │       │
  │       ├─ Télécharge depuis fontUrl
  │       │
  │       ├─ Passe à FontManager.loadAndRegisterFont()
  │       │   │
  │       │   ├─ Parse avec opentype.js
  │       │   │
  │       │   ├─ Extrait nom interne: "Arial"
  │       │   │
  │       │   ├─ Sauvegarde dans /tmp/canvas-fonts/
  │       │   │
  │       │   ├─ Appelle registerFont(path, { family: "Arial" })
  │       │   │
  │       │   └─ Vérifie l'enregistrement
  │       │
  │       └─ Retourne "Arial"
  │
  └─ next() → Passe au handler principal
```

### 3️⃣ Handler - Rendu du canvas

```
Route Handler /api/render
  │
  ├─ Crée adapter = new CanvasRendererNodeAdapter()
  │
  ├─ Crée canvas = adapter.createCanvas(800, 600)
  │   │
  │   ├─ Applique patches Fabric.js
  │   │
  │   ├─ Override fabric.util.createCanvasElement
  │   │
  │   └─ Retourne fabric.StaticCanvas
  │
  ├─ Charge données: canvas.loadFromJSON(canvasData)
  │   │
  │   └─ Fabric.js utilise les polices enregistrées
  │       (fontFamily: "Arial" → trouve dans node-canvas)
  │
  ├─ Export: result = adapter.exportCanvas(canvas)
  │   │
  │   ├─ Vérifie que tout est chargé
  │   │
  │   ├─ canvas.renderAll()
  │   │
  │   ├─ canvas.toDataURL({ format: 'png' })
  │   │
  │   └─ Convertit en Buffer
  │
  └─ Retourne buffer PNG au client
```

### 4️⃣ Cleanup

```
Finally Block
  │
  ├─ adapter.cleanup()
  │   │
  │   ├─ Dispose canvas
  │   │
  │   └─ Clear memory (optionnel)
  │
  └─ FontManager garde le cache pour prochaine requête
```

---

## 💾 Gestion du Cache

### Cache Mémoire (RAM)

```
FontManager.fontCache: Map<string, FontInfo>
  │
  ├─ Key: fontId (GUID)
  │
  └─ Value: {
       idFont: "guid-123",
       internalName: "Arial",
       filePath: "/tmp/canvas-fonts/font-abc123.ttf",
       isRegistered: true,
       buffer: Buffer<...>
     }
```

**Avantages**:
- ✅ Accès ultra-rapide (~1ms)
- ✅ Évite re-téléchargement
- ✅ Évite re-parsing

**Inconvénients**:
- ⚠️ Consomme de la RAM
- ⚠️ Perdu au redémarrage

### Cache Disque (Temporaire)

```
/tmp/canvas-fonts/
  │
  ├─ font-abc12345.ttf  (hash du fontId)
  ├─ font-def67890.ttf
  └─ font-ghi11121.ttf
```

**Avantages**:
- ✅ Persiste entre requêtes
- ✅ Libère la RAM
- ✅ Survit aux redémarrages (si /tmp persistant)

**Inconvénients**:
- ⚠️ Plus lent que RAM (~50ms)
- ⚠️ Nécessite espace disque

### Tracking des Enregistrements

```
FontManager.registeredFonts: Set<string>
  │
  └─ Contient: ["Arial", "Roboto", "Open Sans"]
```

**Rôle**:
- Évite double enregistrement de la même police
- `registerFont()` peut être appelé qu'une fois par nom

---

## 🔐 Sécurité et Isolation

### Isolation par Application

```
Application A                 Application B
     │                             │
     ├─ FontManager A              ├─ FontManager B
     │   ├─ Cache A                │   ├─ Cache B
     │   └─ /tmp/app-a-fonts/      │   └─ /tmp/app-b-fonts/
     │                             │
     └─ Polices isolées            └─ Polices isolées
```

**Avantages**:
- ✅ Pas de conflits entre apps
- ✅ Chaque app a son propre cache
- ✅ Nettoyage indépendant

### Validation

```
loadFont(font)
  │
  ├─ Valide URL
  │   └─ Doit être HTTPS
  │
  ├─ Valide taille
  │   └─ MAX_SIZE = 5MB
  │
  ├─ Valide format
  │   └─ .ttf ou .otf seulement
  │
  └─ Parse et vérifie intégrité
      └─ opentype.js valide structure
```

---

## 📈 Performances

### Première fois (Cold Start)

```
Temps total: ~500-800ms
  │
  ├─ Téléchargement: 200-400ms
  ├─ Parsing opentype: 50-100ms
  ├─ Sauvegarde disque: 10-20ms
  ├─ registerFont(): 30-50ms
  ├─ Vérification: 50-100ms
  └─ Autres: 160-230ms
```

### Requêtes suivantes (Cache Hit)

```
Temps total: ~1-10ms
  │
  ├─ Lookup cache: 1ms
  ├─ Skip téléchargement: 0ms
  ├─ Skip parsing: 0ms
  ├─ Skip registerFont: 0ms
  └─ Vérification: 0ms (déjà fait)
```

### Optimisations

1. **Pré-chargement au démarrage**
   ```typescript
   // Charger polices courantes
   await preloadCommonFonts();
   app.listen(3000);
   ```

2. **Cache permanent**
   ```typescript
   // Utiliser Redis ou autre
   await fontCache.get(fontId) || loadFont();
   ```

3. **Parallélisation**
   ```typescript
   // Charger en parallèle
   await Promise.all(fonts.map(f => loadFont(f)));
   ```

---

## 🔧 Points d'extension

### 1. Ajouter un cache Redis

```typescript
class RedisFontManager extends FontManager {
  async loadAndRegisterFont(buffer, id) {
    // Vérifier Redis d'abord
    const cached = await redis.get(`font:${id}`);
    if (cached) return cached;
    
    // Sinon, charger normalement
    const result = await super.loadAndRegisterFont(buffer, id);
    
    // Sauvegarder dans Redis
    await redis.set(`font:${id}`, result);
    
    return result;
  }
}
```

### 2. Ajouter des métriques

```typescript
class InstrumentedAdapter extends CanvasRendererNodeAdapter {
  async loadFont(font) {
    const start = Date.now();
    try {
      await super.loadFont(font);
      metrics.recordFontLoad(Date.now() - start);
    } catch (error) {
      metrics.recordFontError(font.idFont);
      throw error;
    }
  }
}
```

### 3. Ajouter un CDN

```typescript
async function fetchFontFromCDN(fontUrl: string) {
  // Essayer le CDN d'abord
  try {
    return await fetch(`https://cdn.example.com/fonts/${fontId}`);
  } catch {
    // Fallback sur l'API originale
    return await fetch(fontUrl);
  }
}
```

---

## 🎯 Résumé

Le système utilise une architecture en couches:

1. **Express Server**: Point d'entrée HTTP
2. **CanvasRendererNodeAdapter**: Orchestration
3. **FontManager**: Gestion intelligente des polices
4. **node-canvas + Fabric.js**: Rendu

**Points clés**:
- ✅ Pas d'installation système nécessaire
- ✅ Cache intelligent multi-niveau
- ✅ Isolation complète
- ✅ Performance optimale
- ✅ Extensible et maintenable