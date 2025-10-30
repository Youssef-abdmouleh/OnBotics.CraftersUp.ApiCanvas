# ⚠️ IMPORTANT: Limitations de Windows pour node-canvas + Pango

## 🔴 Problème Fondamental

**Sur Windows natif, Pango NE PEUT PAS charger de polices personnalisées sans installation système.**

### Pourquoi?

**node-canvas sur Windows utilise GDI+ (pas Pango):**
- GDI+ cherche les polices UNIQUEMENT dans le registre Windows
- Dossier système: `C:\Windows\Fonts`
- `registerFont()` fonctionne pour Cairo (formes) mais PAS pour texte
- Aucune façon de contourner sans droits administrateur

**node-canvas sur Linux utilise Pango + fontconfig:**
- Pango scanne des dossiers personnalisés via fontconfig
- `registerFont()` + `fc-cache` fonctionnent ensemble
- Pas besoin de droits admin

---

## ✅ Solutions pour Windows

### Solution 1: WSL2 (RECOMMANDÉ)

**Avantages:**
- ✅ Environnement Linux complet dans Windows
- ✅ Pango + fontconfig fonctionnent nativement
- ✅ Pas besoin de droits admin pour les polices
- ✅ Performances excellentes
- ✅ Partage des fichiers avec Windows

**Installation:**

```powershell
# 1. Installer WSL2 (nécessite redémarrage)
wsl --install

# Redémarrer Windows

# 2. Ouvrir Ubuntu (installé automatiquement)
wsl

# 3. Dans WSL, naviguer vers votre projet
cd /mnt/c/gitSource/craftersup/OnBotics.CraftersUp.ApiCanvas/OnBotics.CraftersUp.ApiCanvas

# 4. Installer Node.js dans WSL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 5. Installer les dépendances
npm install

# 6. Compiler
npm run build

# 7. Lancer l'application
node app.js
```

**Résultat:**
```
[NodeAdapter] Platform: linux
[NodeAdapter] ✓ Fontconfig detected - will use fontconfig for Pango
[NodeAdapter] Fontconfig cache rebuilt successfully
✅ Les polices fonctionnent!
```

---

### Solution 2: Docker Desktop (FACILE)

**Avantages:**
- ✅ Environnement Linux isolé
- ✅ Portable (fonctionne partout ensuite)
- ✅ Pas besoin de WSL2
- ✅ Idéal pour production

**Installation:**

1. **Installer Docker Desktop:**
   - Télécharger: https://www.docker.com/products/docker-desktop/
   - Installer et redémarrer

2. **Créer le Dockerfile** (déjà créé dans le projet):

```dockerfile
FROM node:18-alpine

# Install dependencies for node-canvas
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    fontconfig

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 1337

CMD ["node", "app.js"]
```

3. **Build et Run:**

```powershell
# Dans le dossier du projet
docker build -t canvas-renderer .

# Lancer avec volume pour les previews
docker run -p 1337:1337 -v ${PWD}/storage:/app/storage canvas-renderer
```

**Résultat:**
```
[NodeAdapter] Platform: linux
[NodeAdapter] ✓ Fontconfig detected
✅ Les polices fonctionnent!
```

---

### Solution 3: Installer les Polices dans Windows (PAS RECOMMANDÉ)

**⚠️ Nécessite droits administrateur ET ne fonctionne pas pour multi-tenant**

```powershell
# Copier manuellement chaque police
Copy-Item "path\to\font.ttf" "C:\Windows\Fonts\"

# Redémarrer l'application
```

**Problèmes:**
- ❌ Nécessite admin
- ❌ Pas dynamique (nouveaux tenants?)
- ❌ Pollue le système
- ❌ Pas scalable

---

## 📊 Comparaison des Solutions

| Solution | Setup | Performance | Multi-tenant | Production | Difficulté |
|----------|-------|-------------|--------------|------------|------------|
| **WSL2** | 10 min | ⚡⚡⚡ | ✅ | ✅ | Facile |
| **Docker** | 5 min | ⚡⚡⚡ | ✅ | ✅ | Très facile |
| **Windows + Installation** | 1 min | ⚡⚡ | ❌ | ❌ | Impossible |
| **Windows Natif** | 0 min | ❌ Ne fonctionne pas | ❌ | ❌ | N/A |

---

## 🚀 Recommandation Finale

### Pour Développement Local Windows:
**→ Utiliser WSL2** (environnement le plus proche de production)

### Pour Tests Rapides:
**→ Utiliser Docker Desktop** (le plus simple)

### Pour Production/SAAS:
**→ Déployer sur Linux** (Heroku, Render, Docker)

---

## 🧪 Test Rapide WSL2

```bash
# 1. Installer WSL2
wsl --install

# 2. Ouvrir terminal Ubuntu
wsl

# 3. Naviguer vers le projet Windows
cd /mnt/c/gitSource/craftersup/OnBotics.CraftersUp.ApiCanvas/OnBotics.CraftersUp.ApiCanvas

# 4. Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 5. Installer dépendances
npm install

# 6. Lancer
npm run build && node app.js
```

**Logs attendus:**
```
[Fontconfig] Configuration:
  FONTCONFIG_FILE: /mnt/c/.../fontconfig/fonts.conf
  FONTCONFIG_PATH: /mnt/c/.../fontconfig
  CUSTOM_FONT_DIR: /tmp/canvas-fonts
  Font directory: /tmp/canvas-fonts

[NodeAdapter] Platform: linux
[NodeAdapter] ✓ Fontconfig detected - will use fontconfig for Pango

[NodeAdapter] Fontconfig cache rebuilt successfully

✅ Aucun Pango-WARNING!
✅ Les polices sont appliquées correctement!
```

---

## 🔍 Debugging

### Vérifier Platform

```javascript
console.log('Platform:', process.platform);
// Windows natif: "win32"
// WSL2: "linux"
```

### Vérifier Fontconfig

```bash
# Dans WSL2 ou Linux
fc-list | grep -i "book"
# Doit afficher les polices trouvées

fc-cache -v
# Doit reconstruire le cache
```

---

## ❓ FAQ

### Q: Pourquoi `registerFont()` ne marche pas sur Windows?

**R:** node-canvas utilise GDI+ sur Windows (pas Pango). GDI+ ne supporte pas les polices non-système.

### Q: Est-ce que WSL2 est lent?

**R:** Non! WSL2 utilise une vraie VM Linux avec performances natives.

### Q: Puis-je déployer sur un serveur Windows?

**R:** Oui, mais vous devrez:
1. Utiliser Docker sur Windows Server
2. OU installer les polices dans le système

### Q: Quelle est la meilleure solution pour production?

**R:** Docker sur serveur Linux (Render.com, Heroku, Azure Container Instances)

---

## 📚 Ressources

- [WSL2 Installation Guide](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [node-canvas Windows Issues](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows)
- [Pango Documentation](https://docs.gtk.org/Pango/)

---

## ✅ Checklist de Setup

**Choisir WSL2:**
- [ ] Exécuter `wsl --install`
- [ ] Redémarrer Windows
- [ ] Installer Node.js dans WSL
- [ ] Naviguer vers `/mnt/c/...`
- [ ] `npm install && npm run build`
- [ ] `node app.js`
- [ ] Vérifier logs: `✓ Fontconfig detected`

**Choisir Docker:**
- [ ] Installer Docker Desktop
- [ ] `docker build -t canvas-renderer .`
- [ ] `docker run -p 1337:1337 canvas-renderer`
- [ ] Vérifier logs: `✓ Fontconfig detected`

---

🎉 **Avec WSL2 ou Docker, les polices fonctionneront parfaitement!**
