# 🚀 Démarrage Rapide sur Windows

## ⚠️ IMPORTANT

**Les polices personnalisées NE FONCTIONNENT PAS sur Windows natif sans installation système!**

**→ Vous DEVEZ utiliser WSL2 ou Docker.**

---

## ✅ Option 1: Docker Desktop (5 minutes) - LE PLUS SIMPLE

### Étape 1: Installer Docker Desktop

1. Télécharger: https://www.docker.com/products/docker-desktop/
2. Installer et redémarrer Windows
3. Lancer Docker Desktop

### Étape 2: Build et Run

```powershell
# Ouvrir PowerShell dans le dossier du projet
cd C:\gitSource\craftersup\OnBotics.CraftersUp.ApiCanvas\OnBotics.CraftersUp.ApiCanvas

# Build l'image Docker
docker build -t canvas-renderer .

# Lancer le container
docker run -p 1337:1337 -v ${PWD}/storage:/app/storage canvas-renderer
```

### Étape 3: Vérifier

**Logs attendus:**
```
[Fontconfig] Configuration:
  FONTCONFIG_FILE: /app/fontconfig/fonts.conf
  ...
[NodeAdapter] Platform: linux
[NodeAdapter] ✓ Fontconfig detected - will use fontconfig for Pango
```

**Tester l'API:**
```powershell
curl http://localhost:1337/api/canvas/health
```

**✅ C'EST TOUT! Les polices fonctionnent!**

---

## ✅ Option 2: WSL2 (10 minutes) - LE PLUS PROCHE DE PRODUCTION

### Étape 1: Installer WSL2

```powershell
# Dans PowerShell (Admin)
wsl --install
```

**Redémarrer Windows**

### Étape 2: Setup dans WSL2

```bash
# Ouvrir terminal WSL Ubuntu (chercher "Ubuntu" dans menu démarrer)

# Naviguer vers votre projet Windows
cd /mnt/c/gitSource/craftersup/OnBotics.CraftersUp.ApiCanvas/OnBotics.CraftersUp.ApiCanvas

# Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer les dépendances
npm install

# Compiler
npm run build

# Lancer
node app.js
```

### Étape 3: Vérifier

**Logs attendus:**
```
[NodeAdapter] Platform: linux
[NodeAdapter] ✓ Fontconfig detected - will use fontconfig for Pango
[NodeAdapter] Fontconfig cache rebuilt successfully
```

**✅ Les polices fonctionnent!**

---

## 📊 Quelle Option Choisir?

| Critère | Docker | WSL2 |
|---------|--------|------|
| **Setup** | ⚡ 5 min | ⚡⚡ 10 min |
| **Facilité** | ⭐⭐⭐ | ⭐⭐ |
| **Isolation** | ✅ Container isolé | ⚠️ Partagé |
| **Production** | ✅ Identique | ✅ Proche |
| **Performance** | ⚡⚡⚡ | ⚡⚡⚡ |

**Recommandation:** Docker si vous voulez la solution la plus simple.

---

## 🧪 Test de l'API

### Avec PowerShell:

```powershell
$body = @{
    jsonDesignUrl = "https://your-server/design.json"
    orderItemId = "test-123"
} | ConvertTo-Json

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("username:123456"))
}

Invoke-RestMethod `
    -Uri "http://localhost:1337/api/canvas/render-preview" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" `
    -Headers $headers
```

---

## ❌ Erreurs Courantes

### Erreur: "Pango-WARNING: couldn't load font"

**Cause:** Vous utilisez Windows natif (pas Docker/WSL2)

**Solution:** Utilisez Docker ou WSL2!

---

### Erreur: "docker: command not found"

**Cause:** Docker Desktop pas installé

**Solution:** Installer Docker Desktop et redémarrer

---

### Erreur: "fc-cache: command not found" dans Windows

**Cause:** Normal! Vous êtes sur Windows natif

**Solution:** Utilisez Docker ou WSL2

---

## 📁 Structure Après Setup

```
OnBotics.CraftersUp.ApiCanvas/
├── Dockerfile              # ← Créé
├── .dockerignore          # ← Créé
├── fontconfig/
│   └── fonts.conf         # ← Configuration fontconfig
├── storage/
│   └── previews/          # ← Previews générées (montée comme volume)
├── package.json
└── app.js
```

---

## 🎯 Checklist

**Docker:**
- [ ] Docker Desktop installé
- [ ] `docker build -t canvas-renderer .` réussi
- [ ] `docker run -p 1337:1337 canvas-renderer` lancé
- [ ] Log: `✓ Fontconfig detected`
- [ ] API répond: `curl http://localhost:1337/api/canvas/health`

**WSL2:**
- [ ] WSL2 installé (`wsl --install`)
- [ ] Node.js installé dans WSL
- [ ] `npm install` réussi
- [ ] `node app.js` lancé
- [ ] Log: `✓ Fontconfig detected`

---

## 💡 Conseils

### Docker: Redémarrage Rapide

```powershell
# Arrêter container
docker stop $(docker ps -q --filter ancestor=canvas-renderer)

# Rebuild et relancer
docker build -t canvas-renderer . && docker run -p 1337:1337 canvas-renderer
```

### WSL2: Éditer Fichiers

**Vous pouvez éditer les fichiers depuis Windows!**
- Les fichiers Windows sont dans `/mnt/c/...` dans WSL
- Les changements sont synchronisés automatiquement

### Docker: Voir les Logs

```powershell
docker logs -f <container-id>
```

---

## 🚀 Déploiement sur SAAS

Une fois testé localement avec Docker, déployer est facile:

**Render.com:**
```yaml
# render.yaml
services:
  - type: web
    name: canvas-renderer
    env: docker
    dockerfilePath: ./Dockerfile
```

**Heroku:**
```bash
heroku container:push web
heroku container:release web
```

---

## 📚 Plus d'Info

- **Limitations Windows:** Voir `WINDOWS_LIMITATIONS.md`
- **Solution Fontconfig:** Voir `PANGO_FONT_SOLUTION.md`
- **Guide Complet:** Voir `WINDOWS_TESTING_GUIDE.md`

---

🎉 **Avec Docker ou WSL2, tout fonctionne parfaitement!**
