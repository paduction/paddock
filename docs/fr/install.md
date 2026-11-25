# Installer Paddock

Paddock se compose de trois parties :

| Partie | Où elle va | Son rôle |
|---|---|---|
| L'application | `/config/www/paddock/` dans Home Assistant | L'interface ouverte par la tablette. Elle ne contient rien sur votre maison. |
| L'intégration | `/config/custom_components/paddock/` | Donne `paddock.yaml` aux appareils connectés. |
| `paddock.yaml` | `/config/paddock.yaml`, à côté de `configuration.yaml` | Votre maison : quelles entités apparaissent où. |

Il faut un Home Assistant qui fonctionne et, sur votre ordinateur, [Node 22 ou plus récent](https://nodejs.org) et [pnpm](https://pnpm.io).

```bash
git clone https://github.com/paduction/paddock && cd paddock
pnpm install
```

## 1. Donner aux outils l'accès à Home Assistant

```bash
cp tools/deploy.example.env tools/deploy.local.env
```

Remplissez `tools/deploy.local.env` (ignoré par Git) :

- `HA_URL` et `HA_TOKEN` : utilisés par `pnpm discover` et `pnpm config:check`, qui ne font que lire.
  Créez le jeton dans Home Assistant : votre profil (en bas à gauche) → **Sécurité** → **Jetons d'accès longue durée**.
- `HA_HOST`, `HA_PORT`, `HA_KEY` : utilisés par `pnpm run deploy` pour copier les fichiers en SSH.
  Installez l'application **Terminal & SSH** dans Home Assistant et mettez votre clé publique dans sa configuration.
  Pas de SSH ? Laissez ces lignes et suivez l'installation manuelle plus bas.

## 2. Écrire paddock.yaml

Laissez Paddock regarder ce que vous avez :

```bash
pnpm discover --draft
```

Cette commande écrit :

- `paddock.yaml` : une première version faite de vos lumières, volets, personnes, agendas, caméras…
- `paddock.discovery.local.md` : toutes les entités utilisables par Paddock, classées par réglage, avec leur nom et leur pièce.

Modifiez ensuite `paddock.yaml` : retirez ce que vous ne voulez pas au mur, renommez, choisissez les icônes
(noms des [Material Symbols](https://fonts.google.com/icons), par exemple `table_lamp`).
Les écrans cinéma, films, jeux, énergie et extérieur ne sont pas devinés : copiez ces parties depuis
`paddock.example.yaml` et remplacez les identifiants d'entités, en vous aidant du fichier de découverte.

Chaque réglage est décrit dans [configuration.md](configuration.md) ; ce que chaque écran attend de
Home Assistant est dans [modules.md](modules.md).

Vérifiez votre travail aussi souvent que vous voulez :

```bash
pnpm config:check
```

La commande signale les réglages manquants ou mal écrits, et les entités qui n'existent pas dans votre Home Assistant.

Une clé ou un mot de passe ne va jamais dans `paddock.yaml` : écrivez `!secret un_nom` et mettez la valeur
dans le `secrets.yaml` de Home Assistant.

## 3. Tout copier dans Home Assistant

### Avec le script de déploiement

```bash
pnpm run deploy
```

Il construit l'application, vérifie `paddock.yaml`, puis copie l'application, l'intégration et `paddock.yaml`.

### À la main (Samba, File editor, Studio Code Server…)

```bash
pnpm build
```

Puis copiez :

- `apps/tablet/dist/index.html` et `apps/tablet/dist/assets/` → `/config/www/paddock/`
- `apps/tablet/dist/loader.html` → `/config/www/paddock.html`
- `custom_components/paddock/` → `/config/custom_components/paddock/`
- `paddock.yaml` → `/config/paddock.yaml`

L'intégration seule peut aussi s'installer avec [HACS](https://hacs.xyz) : ajoutez
`https://github.com/paduction/paddock` comme dépôt personnalisé de type *Intégration*.

## 4. Activer l'intégration

1. Redémarrez Home Assistant (une fois, puis après chaque mise à jour de l'intégration).
2. **Paramètres → Appareils et services → Ajouter une intégration → Paddock**. Il n'y a rien à remplir.

## 5. Ouvrir Paddock

Sur la tablette, ouvrez `http://<votre-home-assistant>:8123/local/paddock.html`.
Paddock demande une fois l'adresse de Home Assistant et un jeton longue durée.
Utilisez le jeton d'un compte qui n'est **pas** administrateur : voir [security.md](security.md).

Réglez ensuite la tablette comme écran mural : [tablet.md](tablet.md).

## Par la suite

- **Changer un réglage** : modifiez `paddock.yaml`, lancez `pnpm config:check`, puis `pnpm run deploy` (ou copiez le fichier).
  Rechargez la page sur la tablette. Home Assistant n'a pas besoin de redémarrer pour `paddock.yaml`.
- **Mettre Paddock à jour** : `git pull`, `pnpm install`, `pnpm run deploy`. Redémarrez Home Assistant si `custom_components/paddock` a changé.
- **Revoir l'écran de connexion** : ajoutez `#reglages` à l'adresse.

## En cas de problème

| Ce que vous voyez | Que faire |
|---|---|
| « Home Assistant n'a pas de réglages pour Paddock » | L'intégration n'est pas ajoutée, ou `/config/paddock.yaml` manque. |
| « paddock.yaml contient des erreurs » suivi d'une liste | Corrigez les réglages listés ; `pnpm config:check` affiche la même liste. |
| « Le jeton a été refusé » | Créez un nouveau jeton longue durée et collez-le. |
| Une tuile reste vide ou grise | Son identifiant d'entité est faux ou l'appareil est hors ligne : `pnpm config:check`. |
| Un onglet manque | Cet écran n'est pas configuré dans `paddock.yaml` : voir [modules.md](modules.md). |
