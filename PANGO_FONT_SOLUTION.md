# Solution: Pango Font Loading pour node-canvas

## 🔴 Le Problème

**Symptôme:**
```
Pango-WARNING: couldn't load font "Book Antiqua 400px"
```

Les polices fonctionnent uniquement quand elles sont installées dans `C:\Windows\Fonts` ou `/usr/share/fonts`.

---

## 🔍 Cause Racine

**node-canvas utilise deux moteurs de rendu:**

1. **Cairo** - Pour les formes, images (utilise `registerFont()` ✅)
2. **Pango** - Pour le texte (IGNORE `registerFont()` ❌)

**Pango cherche les polices dans:**
- Linux: `/usr/share/fonts`, `~/.fonts`
- Windows: `C:\Windows\Fonts`
- **PAS** dans les polices enregistrées avec `registerFont()`

---

## ✅ La Solution: Fontconfig

**Fontconfig** est la bibliothèque que Pango utilise pour trouver les polices.

### Étape 1: Configuration Fontconfig (`fontconfig/fonts.conf`)

```xml
<fontconfig>
  <!-- Scan notre répertoire temporaire -->
  <dir prefix="env">CUSTOM_FONT_DIR</dir>
  <dir>/tmp/canvas-fonts</dir>

  <!-- Cache pour performances -->
  <cachedir>/tmp/fontconfig-cache</cachedir>
</fontconfig>
```

### Étape 2: Variables d'Environnement (`app.ts`)

```typescript
// CRITIQUE: AVANT tous les imports de node-canvas
process.env.FONTCONFIG_FILE = '/path/to/fontconfig/fonts.conf';
process.env.FONTCONFIG_PATH = '/path/to/fontconfig';
process.env.CUSTOM_FONT_DIR = '/tmp/canvas-fonts';
```

### Étape 3: Rebuild Cache Après Chargement

```typescript
// Après avoir téléchargé toutes les polices
await adapter.rebuildFontCache();
// Exécute: fc-cache -f /tmp/canvas-fonts
```

---

## 🎯 Flux Complet

```
1. Démarrage App
   → Configurer FONTCONFIG_FILE, FONTCONFIG_PATH, CUSTOM_FONT_DIR
   → Pango initialise fontconfig avec notre configuration

2. Requête Rendu
   → Extraire polices du registre JSON
   → Télécharger polices dans /tmp/canvas-fonts/
   → registerFont() pour Cairo ✅
   → fc-cache -f pour Pango ✅

3. Rendu Texte
   → Pango scanne /tmp/canvas-fonts/ via fontconfig
   → Trouve les polices ✅
   → Applique aux textes ✅
```

---

## 📦 Fichiers Modifiés

| Fichier | Changement |
|---------|-----------|
| `fontconfig/fonts.conf` | Configuration fontconfig XML |
| `app.ts` | Variables d'environnement au démarrage |
| `services/canvas-renderer-node.adapter.ts` | `rebuildFontCache()` méthode |
| `services/canvas-renderer-core.service.ts` | Appel `rebuildFontCache()` après chargement |

---

## 🧪 Comment Tester

### Test 1: Vérifier Fontconfig

```bash
# Voir les polices détectées
fc-list | grep "Book Antiqua"

# Forcer rebuild cache
fc-cache -f /tmp/canvas-fonts
```

### Test 2: Vérifier Logs Application

```
[Fontconfig] Configuration:
  FONTCONFIG_FILE: /path/to/fontconfig/fonts.conf
  FONTCONFIG_PATH: /path/to/fontconfig
  CUSTOM_FONT_DIR: /tmp/canvas-fonts

[NodeAdapter] Fontconfig cache rebuilt successfully
```

### Test 3: Polices Appliquées

```
✅ [CanvasRendererCore] Transforming fontFamily: "14c18318-..." → "Book Antiqua"
✅ Aucun Pango-WARNING
✅ Textes avec polices correctes
```

---

## ⚠️ Notes Importantes

### Windows

Sur Windows Server, fontconfig n'est PAS installé par défaut. Options:

1. **Installer fontconfig:**
   ```powershell
   choco install fontconfig
   ```

2. **Copier polices dans C:\Windows\Fonts:**
   ```csharp
   // Côté C# backend
   File.Copy(fontPath, @"C:\Windows\Fonts\font.ttf");
   ```
   ⚠️ **Nécessite droits administrateur!**

3. **Utiliser WSL2:**
   - Exécuter Node.js dans WSL2
   - Fontconfig disponible nativement

### Linux

✅ Fontconfig est installé par défaut sur toutes les distributions

### Debugging

Activer logs fontconfig:
```typescript
process.env.FC_DEBUG = '1'; // app.ts
```

---

## 🎉 Résultat Final

✅ **Polices fonctionnent sans installation système**
✅ **Isolation multi-tenant maintenue**
✅ **Pas de droits administrateur nécessaires**
✅ **Support TTF et OTF**
✅ **Cache performant**

---

## 📚 Références

- [Fontconfig Documentation](https://www.freedesktop.org/wiki/Software/fontconfig/)
- [node-canvas Font Support](https://github.com/Automattic/node-canvas#registering-and-using-fonts)
- [Pango Font Handling](https://docs.gtk.org/Pango/fonts.html)
