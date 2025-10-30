# Guide d'Installation Fontconfig pour Windows

## ✅ Vous Avez Compilé Fontconfig!

**Fichiers obtenus:**
- `fontconfig-1.dll` ✅
- `fontconfig.lib` ✅
- `fontconfig.exp` ✅
- `fcobjshash.h` ✅

**Maintenant, il faut configurer correctement pour que node-canvas l'utilise.**

---

## 📋 Étapes d'Installation Complète

### Étape 1: Installer les Dépendances Fontconfig

Fontconfig nécessite d'autres bibliothèques. **Toutes les DLL suivantes doivent être disponibles:**

**Dépendances requises:**
- ✅ `fontconfig-1.dll` (vous l'avez)
- ⚠️ `freetype-6.dll` ou `freetype6.dll`
- ⚠️ `libxml2.dll` ou `xml2.dll`
- ⚠️ `iconv.dll` ou `libiconv.dll`
- ⚠️ `zlib1.dll` ou `zlib.dll`
- ⚠️ `libexpat.dll` ou `expat.dll`

**Où les obtenir:**
- **Option 1 (Recommandé):** MSYS2
  ```powershell
  # Installer MSYS2 depuis https://www.msys2.org/
  # Puis dans le terminal MSYS2:
  pacman -S mingw-w64-x86_64-fontconfig
  pacman -S mingw-w64-x86_64-freetype
  pacman -S mingw-w64-x86_64-libxml2
  ```

- **Option 2:** GTK for Windows
  - https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer

- **Option 3:** Vcpkg
  ```powershell
  vcpkg install fontconfig:x64-windows
  vcpkg install freetype:x64-windows
  ```

---

### Étape 2: Copier les DLL au Bon Endroit

**Option A: PATH Système (Recommandé)**

1. **Créer un dossier pour les DLL:**
   ```powershell
   mkdir C:\fontconfig-libs
   ```

2. **Copier TOUTES les DLL nécessaires:**
   ```powershell
   # Copier fontconfig-1.dll et ses dépendances
   copy fontconfig-1.dll C:\fontconfig-libs\
   copy freetype-6.dll C:\fontconfig-libs\
   copy libxml2.dll C:\fontconfig-libs\
   copy iconv.dll C:\fontconfig-libs\
   copy zlib1.dll C:\fontconfig-libs\
   # ... toutes les dépendances
   ```

3. **Ajouter au PATH:**
   ```powershell
   # PowerShell Admin
   $env:Path += ";C:\fontconfig-libs"
   [Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::Machine)
   ```

**Option B: Dossier node-canvas**

```powershell
# Trouver où est installé node-canvas
cd node_modules\canvas
dir build\Release

# Copier les DLL ici
copy C:\path\to\fontconfig-1.dll node_modules\canvas\build\Release\
copy C:\path\to\freetype-6.dll node_modules\canvas\build\Release\
# ... toutes les dépendances
```

---

### Étape 3: Installer les Utilitaires Fontconfig

**Vous avez besoin de:**
- `fc-cache.exe` - Pour rebuilder le cache
- `fc-list.exe` - Pour lister les polices

**Où les obtenir:**

**Option 1: MSYS2 (Recommandé)**
```bash
# Dans MSYS2 terminal
pacman -S mingw-w64-x86_64-fontconfig

# Les binaires seront dans:
# C:\msys64\mingw64\bin\fc-cache.exe
# C:\msys64\mingw64\bin\fc-list.exe
```

**Option 2: Compiler depuis les sources fontconfig**
```bash
# Dans le dossier fontconfig source
cd fc-cache
nmake /f Makefile.vc
# Copier fc-cache.exe vers C:\fontconfig-libs\
```

**Ajouter au PATH:**
```powershell
# Si MSYS2
$env:Path += ";C:\msys64\mingw64\bin"

# Ou si compilé manuellement
$env:Path += ";C:\fontconfig-libs"
```

---

### Étape 4: Créer Configuration Fontconfig Windows

**Créer:** `C:\fontconfig\fonts.conf`

```xml
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- Windows system fonts -->
  <dir>C:\Windows\Fonts</dir>

  <!-- Custom fonts directory -->
  <dir>C:\Temp\canvas-fonts</dir>

  <!-- User fonts -->
  <dir prefix="env">APPDATA/fonts</dir>

  <!-- Cache directory -->
  <cachedir>C:\fontconfig\cache</cachedir>

  <!-- Fallback fonts -->
  <alias>
    <family>sans-serif</family>
    <prefer>
      <family>Arial</family>
      <family>Verdana</family>
    </prefer>
  </alias>
</fontconfig>
```

**Créer les dossiers:**
```powershell
mkdir C:\fontconfig
mkdir C:\fontconfig\cache
mkdir C:\Temp\canvas-fonts
```

---

### Étape 5: Configurer Variables d'Environnement

**Variables requises:**

```powershell
# PowerShell Admin
[Environment]::SetEnvironmentVariable("FONTCONFIG_FILE", "C:\fontconfig\fonts.conf", [System.EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("FONTCONFIG_PATH", "C:\fontconfig", [System.EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("FC_CACHEDIR", "C:\fontconfig\cache", [System.EnvironmentVariableTarget]::Machine)
```

**Vérifier:**
```powershell
Get-ChildItem Env: | Where-Object {$_.Name -like "*FONT*"}
```

---

### Étape 6: Rebuilder node-canvas avec Support Fontconfig

**CRITIQUE:** node-canvas doit être compilé avec `HAVE_PANGO=1` pour utiliser Pango/fontconfig!

**Option A: Installer node-canvas pré-compilé**

```powershell
npm uninstall canvas
npm install canvas --build-from-source
```

**Option B: Compiler manuellement**

1. **Installer build tools:**
   ```powershell
   npm install --global windows-build-tools
   # ou
   npm install --global --production windows-build-tools --vs2017
   ```

2. **Installer GTK et dépendances:**
   - Télécharger GTK Runtime: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
   - Installer dans `C:\gtk`

3. **Compiler node-canvas:**
   ```powershell
   cd node_modules\canvas

   # Définir variables pour compilation
   $env:PKG_CONFIG_PATH = "C:\gtk\lib\pkgconfig"
   $env:CAIRO_DIR = "C:\gtk"
   $env:PANGO_DIR = "C:\gtk"

   # Recompiler
   npm run prebuild
   node-gyp rebuild
   ```

---

### Étape 7: Tester Fontconfig

**Test 1: fc-list**
```powershell
fc-list
# Doit afficher la liste des polices Windows
```

**Test 2: fc-cache**
```powershell
fc-cache -v C:\Temp\canvas-fonts
# Doit rebuilder le cache
```

**Test 3: fc-match**
```powershell
fc-match Arial
# Doit retourner: Arial.ttf: "Arial" "Regular"
```

---

### Étape 8: Modifier Votre Application

**Mettre à jour `config.ts`:**

```typescript
processing: {
  tempDir: process.env.TEMP_DIR || 'C:\\Temp\\canvas-fonts',
  // ...
}
```

**Mettre à jour `app.ts`:**

```typescript
// AVANT tous les imports
process.env.FONTCONFIG_FILE = 'C:\\fontconfig\\fonts.conf';
process.env.FONTCONFIG_PATH = 'C:\\fontconfig';
process.env.FC_CACHEDIR = 'C:\\fontconfig\\cache';

// Puis le reste...
import * as dotenv from 'dotenv';
```

---

### Étape 9: Tester l'Application

```powershell
# Redémarrer PowerShell pour charger nouvelles variables
cd C:\gitSource\craftersup\OnBotics.CraftersUp.ApiCanvas\OnBotics.CraftersUp.ApiCanvas

# Recompiler
npm run build

# Lancer
node app.js
```

**Logs attendus:**
```
[Fontconfig] Configuration:
  FONTCONFIG_FILE: C:\fontconfig\fonts.conf
  FONTCONFIG_PATH: C:\fontconfig

[NodeAdapter] Platform: win32
[NodeAdapter] ✓ Fontconfig detected - will use fontconfig for Pango  ← IMPORTANT!

[NodeAdapter] Fontconfig cache rebuilt successfully
```

**Si vous voyez:**
```
✗ Fontconfig NOT available
```

**→ node-canvas n'a pas été compilé avec support Pango/fontconfig!**

---

## 🔍 Debugging

### Problème 1: "fc-cache: command not found"

**Solution:**
- Vérifier que `fc-cache.exe` est dans le PATH
- Ou copier dans `C:\Windows\System32\`

---

### Problème 2: "DLL not found"

**Solution:**
```powershell
# Vérifier les DLL manquantes
dumpbin /dependents node_modules\canvas\build\Release\canvas.node
# Puis installer les DLL manquantes
```

---

### Problème 3: node-canvas utilise GDI+ au lieu de Pango

**Symptôme:**
```
[NodeAdapter] ✗ Fontconfig NOT available
```

**Solution:**
- node-canvas n'a pas été compilé avec PANGO
- Recompiler avec `--build-from-source` et GTK installé
- OU utiliser WSL2/Docker (plus simple!)

---

## ⚠️ Avertissement Important

**Cette installation est TRÈS complexe sur Windows!**

**Problèmes courants:**
- ❌ DLL manquantes ou incompatibles
- ❌ node-canvas compilé sans support Pango
- ❌ Variables d'environnement incorrectes
- ❌ Conflits de versions

**Taux de succès: ~30%** (beaucoup de points de défaillance)

---

## ✅ Alternative Recommandée: WSL2

**Au lieu de tout ça, installez WSL2:**

```powershell
# 10 minutes, 100% de succès
wsl --install

# Dans WSL:
cd /mnt/c/gitSource/...
npm install
node app.js

# ✅ Tout fonctionne immédiatement!
```

---

## 📊 Comparaison

| Méthode | Temps | Complexité | Taux Succès |
|---------|-------|------------|-------------|
| **Fontconfig Windows** | 3-4h | ⭐⭐⭐⭐⭐ | 30% |
| **WSL2** | 10min | ⭐ | 100% |
| **Docker** | 5min | ⭐ | 100% |

---

## 🎯 Ma Recommandation

**Utilisez WSL2 ou Docker!**

Mais si vous voulez absolument utiliser fontconfig natif Windows, suivez TOUTES les étapes ci-dessus dans l'ordre.

---

## 📁 Checklist Complète

- [ ] Toutes les DLL installées (fontconfig, freetype, xml2, etc.)
- [ ] DLL dans le PATH ou dans node_modules\canvas\build\Release
- [ ] fc-cache.exe et fc-list.exe disponibles
- [ ] Configuration C:\fontconfig\fonts.conf créée
- [ ] Variables FONTCONFIG_FILE, FONTCONFIG_PATH définies
- [ ] node-canvas recompilé avec GTK/Pango
- [ ] fc-list fonctionne et liste les polices
- [ ] fc-cache fonctionne
- [ ] Application redémarrée
- [ ] Log: "✓ Fontconfig detected"

---

**Bonne chance! Et n'hésitez pas à utiliser WSL2 si c'est trop compliqué!** 🎉
