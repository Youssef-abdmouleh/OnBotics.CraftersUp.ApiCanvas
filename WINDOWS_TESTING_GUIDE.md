# Guide de Test Windows et Déploiement SAAS

## 🎯 Objectif

Tester sur Windows local AVANT de déployer sur un serveur SAAS (sans accès terminal).

---

## ✅ Solution Implémentée: Détection Automatique

L'application détecte automatiquement l'environnement et s'adapte:

```
┌─────────────────────────────────┐
│ Démarrage Application           │
└───────────┬─────────────────────┘
            │
            ▼
    ┌───────────────┐
    │ Fontconfig    │
    │ disponible?   │
    └───┬───────┬───┘
        │       │
    OUI │       │ NON
        │       │
        ▼       ▼
┌────────────┐  ┌──────────────────┐
│ Mode Linux │  │ Mode Windows     │
│ Fontconfig │  │ Fallback         │
│            │  │                  │
│ • Utilise  │  │ • Parse TTF avec │
│   registre │  │   opentype.js    │
│ • fc-cache │  │ • Utilise nom    │
│ • Rapide   │  │   interne        │
└────────────┘  │ • registerFont() │
                └──────────────────┘
```

---

## 🖥️ Test sur Windows Local

### Option 1: Test Direct (Sans Fontconfig) - RECOMMANDÉ

**Avantage:** Simule exactement l'environnement serveur SAAS

**Étapes:**

1. **Installer Node.js et dépendances:**
   ```powershell
   cd C:\path\to\OnBotics.CraftersUp.ApiCanvas
   yarn install  # ou npm install
   ```

2. **Compiler le TypeScript:**
   ```powershell
   yarn build
   ```

3. **Démarrer l'application:**
   ```powershell
   node app.js
   ```

4. **Vérifier les logs au démarrage:**
   ```
   [NodeAdapter] Platform: win32
   [NodeAdapter] ✗ Fontconfig NOT available - will use Windows fallback mode
   [NodeAdapter] Font loading will use internal TTF names from opentype.js
   ```

5. **Appeler l'API de rendu:**
   ```powershell
   # Avec PowerShell
   $body = @{
       jsonDesignUrl = "https://your-server/design.json"
       orderItemId = "123"
   } | ConvertTo-Json

   Invoke-RestMethod -Uri "http://localhost:1337/api/canvas/render-preview" `
       -Method Post `
       -Body $body `
       -ContentType "application/json" `
       -Headers @{ Authorization = "Basic ..." }
   ```

6. **Vérifier les logs de chargement:**
   ```
   [NodeAdapter] Windows fallback mode: Extracting internal name from TTF...
   [NodeAdapter] Extracted internal name: "Book Antiqua"
   [NodeAdapter] Font will be registered as: "Book Antiqua"
   [CanvasRendererCore] Transforming fontFamily: "14c18318-..." → "Book Antiqua"
   ```

7. **Résultat attendu:**
   - ✅ Pas de Pango-WARNING
   - ✅ Polices appliquées correctement
   - ✅ Preview générée

---

### Option 2: Test avec WSL2 (Si disponible)

**Avantage:** Environnement Linux complet sur Windows

**Étapes:**

1. **Installer WSL2:**
   ```powershell
   wsl --install
   ```

2. **Dans WSL2 Ubuntu:**
   ```bash
   cd /mnt/c/path/to/OnBotics.CraftersUp.ApiCanvas

   # Installer Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Installer dépendances
   npm install

   # Compiler et lancer
   npm run build
   node app.js
   ```

3. **Fontconfig sera disponible:**
   ```
   [NodeAdapter] ✓ Fontconfig detected - will use fontconfig for Pango
   ```

---

### Option 3: Docker (Cross-platform)

**Avantage:** Environnement identique partout

**1. Créer `Dockerfile`:**
```dockerfile
FROM node:18-alpine

# Install fontconfig and dependencies
RUN apk add --no-cache \
    fontconfig \
    cairo \
    pango \
    giflib \
    pixman

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 1337

CMD ["node", "app.js"]
```

**2. Build et Run:**
```powershell
docker build -t canvas-renderer .
docker run -p 1337:1337 canvas-renderer
```

---

## 🌐 Déploiement sur Serveur SAAS

### Qu'est-ce qu'un Serveur SAAS?

**Exemples:**
- Heroku
- Render.com
- Railway.app
- Azure App Service
- Google Cloud Run

**Caractéristiques:**
- ❌ Pas d'accès SSH/RDP
- ❌ Pas d'accès terminal
- ✅ Déploiement via Git/Docker
- ✅ Configuration via variables d'environnement

---

### Stratégie 1: Vérifier Fontconfig sur la Platform

**1. Platforms AVEC fontconfig (✅ Fonctionne directement):**

| Platform | Fontconfig | Notes |
|----------|------------|-------|
| **Heroku** | ✅ OUI | Buildpack: heroku/nodejs |
| **Render.com** | ✅ OUI | Docker ou Native Node.js |
| **Railway.app** | ✅ OUI | Docker recommandé |
| **Google Cloud Run** | ✅ OUI | Avec Docker |
| **Azure App Service Linux** | ✅ OUI | App Service Linux |

**Configuration:**
```yaml
# render.yaml (exemple Render.com)
services:
  - type: web
    name: canvas-renderer
    env: node
    buildCommand: npm install && npm run build
    startCommand: node app.js
    envVars:
      - key: NODE_ENV
        value: production
```

**2. Platforms SANS fontconfig (⚠️ Utilise fallback Windows):**

| Platform | Fontconfig | Notes |
|----------|------------|-------|
| **Azure App Service Windows** | ❌ NON | Utilise mode fallback |
| **AWS Lambda** | ⚠️ Limité | Nécessite Lambda Layer |

**Pour ces platforms:**
- ✅ Le mode fallback Windows s'active automatiquement
- ✅ Polices fonctionnent via registerFont() + opentype.js
- ✅ Pas de configuration nécessaire

---

### Stratégie 2: Docker (RECOMMANDÉ pour SAAS)

**Avantages:**
- ✅ Environnement identique partout
- ✅ Fontconfig inclus
- ✅ Portable entre platforms

**Déploiement:**

```powershell
# 1. Créer image Docker
docker build -t your-registry/canvas-renderer:v1 .

# 2. Push vers registry
docker push your-registry/canvas-renderer:v1

# 3. Déployer sur platform
# Heroku:
heroku container:push web
heroku container:release web

# Render.com:
# (Détection automatique du Dockerfile)

# Google Cloud Run:
gcloud run deploy canvas-renderer --image your-registry/canvas-renderer:v1
```

---

### Stratégie 3: Configuration Platform-Specific

**Heroku (avec Buildpack):**

`heroku-buildpack.yml`:
```yaml
pre-build:
  - apt-get install fontconfig
```

**Render.com (avec Build Command):**
```yaml
buildCommand: |
  apt-get update && apt-get install -y fontconfig
  npm install && npm run build
```

---

## 🧪 Tests de Validation

### Test 1: Vérifier Mode de Fonctionnement

**Logs au démarrage:**

**Mode Fontconfig (Linux/Docker):**
```
[NodeAdapter] Platform: linux
[NodeAdapter] ✓ Fontconfig detected - will use fontconfig for Pango
```

**Mode Fallback (Windows):**
```
[NodeAdapter] Platform: win32
[NodeAdapter] ✗ Fontconfig NOT available - will use Windows fallback mode
[NodeAdapter] Font loading will use internal TTF names from opentype.js
```

---

### Test 2: Vérifier Chargement des Polices

**Logs lors du rendu:**

**Mode Fontconfig:**
```
[NodeAdapter] Fontconfig mode: Using registry name "Book Antiqua"
[NodeAdapter] Fontconfig cache rebuilt successfully
```

**Mode Fallback:**
```
[NodeAdapter] Windows fallback mode: Extracting internal name from TTF...
[NodeAdapter] Extracted internal name: "BookAntiqua"
[NodeAdapter] Fontconfig not available - fonts registered using internal names
```

---

### Test 3: Vérifier Résultat Final

**Succès:**
```
✅ [CanvasRendererCore] Transforming fontFamily: "14c18318-..." → "Book Antiqua"
✅ [CanvasRendererCore] Canvas fully loaded and rendered
✅ Aucun Pango-WARNING
✅ Preview générée: /storage/previews/xxx.png
```

**Échec:**
```
❌ Pango-WARNING: couldn't load font "..."
❌ [CanvasRendererCore] Partial render with 0 objects
```

---

## 📊 Tableau Récapitulatif

| Environnement | Fontconfig | Méthode | Performance |
|---------------|------------|---------|-------------|
| **Linux local** | ✅ | Fontconfig + registre | ⚡⚡⚡ Rapide |
| **Windows local** | ❌ | Fallback + opentype.js | ⚡⚡ Moyen |
| **WSL2** | ✅ | Fontconfig + registre | ⚡⚡⚡ Rapide |
| **Docker** | ✅ | Fontconfig + registre | ⚡⚡⚡ Rapide |
| **Heroku** | ✅ | Fontconfig + registre | ⚡⚡⚡ Rapide |
| **Render.com** | ✅ | Fontconfig + registre | ⚡⚡⚡ Rapide |
| **Azure Linux** | ✅ | Fontconfig + registre | ⚡⚡⚡ Rapide |
| **Azure Windows** | ❌ | Fallback + opentype.js | ⚡⚡ Moyen |

---

## 🚀 Recommandations

### Pour Test Local Windows:
1. ✅ **Option 1:** Test direct (simule SAAS sans fontconfig)
2. ✅ **Option 2:** WSL2 (si besoin tester fontconfig)
3. ✅ **Option 3:** Docker (le plus proche de la production)

### Pour Déploiement SAAS:
1. ✅ **MEILLEUR:** Docker (portable, avec fontconfig)
2. ✅ **Bon:** Platform Linux native (Render, Heroku, Railway)
3. ⚠️ **Acceptable:** Platform Windows (mode fallback automatique)

### Pour Production:
- ✅ Utiliser Docker pour garantir fontconfig
- ✅ Tester d'abord sur Windows local (mode fallback)
- ✅ Monitorer les logs au premier déploiement
- ✅ Vérifier qu'il n'y a pas de Pango-WARNING

---

## 📞 Dépannage

### Problème: "fc-cache: command not found"

**Solution:** C'est normal sur Windows! Le mode fallback va s'activer automatiquement.

---

### Problème: Polices ne s'appliquent pas sur Windows

**Vérifier:**
1. Les logs montrent "Extracted internal name"?
2. Le JSON contient bien le registre `fonts`?
3. Les URLs de téléchargement sont accessibles?

---

### Problème: Fontconfig ne marche pas sur Heroku/Render

**Solution:** Vérifier les buildpacks/Dockerfile incluent fontconfig.

---

## 📚 Ressources

- [Node-canvas Windows Installation](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows)
- [WSL2 Setup Guide](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Docker Node.js Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Heroku Node.js Deployment](https://devcenter.heroku.com/articles/deploying-nodejs)
- [Render.com Node.js Guide](https://render.com/docs/deploy-node-express-app)

---

## ✅ Checklist de Déploiement

**Avant déploiement:**
- [ ] Testé en local sur Windows (mode fallback)
- [ ] Testé avec Docker (mode fontconfig)
- [ ] Vérifié que les logs sont corrects
- [ ] Testé avec plusieurs polices
- [ ] Vérifié les previews générées

**Après déploiement:**
- [ ] Vérifier les logs de démarrage
- [ ] Vérifier mode (fontconfig ou fallback)
- [ ] Tester API de rendu
- [ ] Vérifier preview générée
- [ ] Monitorer Pango-WARNING

---

🎉 **Avec cette solution hybride, votre application fonctionne PARTOUT sans configuration manuelle!**
