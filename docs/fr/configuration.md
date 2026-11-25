# paddock.yaml, réglage par réglage

`paddock.yaml` se place à côté de `configuration.yaml` dans Home Assistant. Un exemple complet :
[paddock.example.yaml](../../paddock.example.yaml). `pnpm config:check` vérifie votre fichier.

- **Les identifiants d'entités** s'écrivent comme dans Home Assistant : `light.salon`. `pnpm discover` liste les vôtres.
- **Les icônes** sont des noms de [Material Symbols](https://fonts.google.com/icons) : `table_lamp`, `blinds`, `valve`.
- **Les secrets** : `rawgKey: !secret paddock_rawg_key`, avec la valeur dans le `secrets.yaml` de Home Assistant.
- **Les textes qui valent juste `on`, `off`, `yes` ou `no`** doivent être entre guillemets (`on: "On"`) : Home Assistant lit ces mots seuls comme vrai / faux. `pnpm config:check` le signale.
- Les réglages marqués *facultatif* peuvent être omis. Omettre tout un bloc facultatif masque son écran.

## Général

| Réglage | | |
|---|---|---|
| `locale` | obligatoire | `fr` ou `en` : langue de l'interface. |
| `idleMinutes` | obligatoire | Minutes sans toucher avant l'écran de veille (tablette seulement). |

## home — la page d'accueil

| Réglage | | |
|---|---|---|
| `home.summary` | facultatif | Entité dont l'état est une phrase, affichée comme « résumé du jour ». |
| `home.climate.entity` | bloc facultatif | Entité `climate` de la tuile du thermostat. |
| `home.climate.name` | | Titre de la tuile. |
| `home.climate.temperatureSensor` | facultatif | Capteur à utiliser quand le thermostat ne donne pas la température de la pièce. |
| `home.gate.entity` | bloc facultatif | Entité `cover` du portail ou de la porte de garage. |
| `home.gate.name` | | Titre de la tuile. |
| `home.gate.alertAfterMinutes` | | Une alerte apparaît s'il reste ouvert plus longtemps. |
| `home.alerts.batteries` | obligatoire | Liste de capteurs de batterie (%). Peut être vide : `[]`. |
| `home.alerts.batteryLow` | obligatoire | Niveau (%) sous lequel une batterie est signalée. |
| `home.alerts.vigilance`, `nextRain` | facultatif | Capteurs Météo-France. |
| `home.alerts.people` | facultatif | Liste de capteurs de personne `{ name, sensor }` pour l'alerte « personne détectée ». Par défaut, ceux des caméras. |

### home.cinema — le mode cinéma (bloc facultatif)

| Réglage | | |
|---|---|---|
| `toggle` | obligatoire | `input_boolean` que vos propres automatisations surveillent pour lancer le mode cinéma. |
| `dimLights` | obligatoire | Identifiants (`id` de `lighting.lights`) des lumières qui doivent être éteintes. |
| `screen.down`, `screen.up` | obligatoire | Scripts qui déplacent l'écran de projection. |
| `projector.on`, `projector.off` | obligatoire | Scripts qui allument et éteignent le projecteur. |
| `amplifier` | obligatoire | Interrupteur (ou toute entité qui s'allume et s'éteint) de l'ampli. |
| `light` | facultatif | `id` (de `lighting.lights`) d'une lumière affichée sur la page cinéma. |
| `player` | facultatif | `{ name, media, remote }` : la télé de la pièce (lecteur et télécommande), pour la carte « en cours » et la télécommande. |

## lighting — l'éclairage

| Réglage | | |
|---|---|---|
| `lighting.lights[]` | obligatoire | `id` (court, unique), `entity`, `name`, `room`, `icon` ; `presence` facultatif (capteur de présence affiché sur la tuile). |
| `lighting.scenes[]` | obligatoire, peut être vide | `id`, `entity` (`scene`), `name`, `icon`. |
| `lighting.rows[]` | obligatoire | Disposition de la page, de haut en bas : `{ type: room, room: <nom> }` pour une rangée de lumières, `{ type: scenes }` pour la rangée des scènes et de « tout éteindre ». |

## covers — les volets

`covers[]` : `id`, `entity` (`cover`), `name`, `group` (les volets d'un même groupe sont affichés et commandés ensemble).

## people, calendars, sidebar

| Réglage | | |
|---|---|---|
| `people[]` | obligatoire, peut être vide | `name`, `entity` (`person`). |
| `calendars[]` | obligatoire, peut être vide | `entity` (`calendar`), `name` ; facultatifs : `source` (par exemple « iCloud ») et `people` (initiales affichées sur chaque événement). |
| `sidebar.weather` | facultatif | Entité `weather`. |
| `sidebar.sun` | facultatif | En général `sun.sun`. |
| `sidebar.outdoorTemperature`, `outdoorHumidity` | facultatif | Capteurs qui remplacent les valeurs de l'entité météo. |
| `sidebar.indoor[]` | obligatoire, peut être vide | Jusqu'à deux pièces : `label`, `icon`, `tone` (`accent` ou `blue`), `temperature`, `humidity` facultatif. |
| `sidebar.pool` | facultatif | Capteur de température de la piscine. |

## cameras — les caméras (bloc facultatif)

| Réglage | | |
|---|---|---|
| `cameras.list[]` | obligatoire | `entity` (`camera`), `name` ; facultatifs : `person` (capteur binaire) et `live: true` (image rafraîchie toutes les quelques secondes dans la grille). |
| `cameras.doorbell` | facultatif | `{ event, camera }` : l'entité `event` qui émet `ring`, et la caméra à afficher. |
| `cameras.security` | facultatif | Entités `select` avec les options `Home`, `Away`, `Disarmed`. La première est lue, toutes sont réglées ensemble. |
| `cameras.eventsRoot` | facultatif | Dossier `media_source` des événements enregistrés. |

## music — la musique (bloc facultatif), avec Music Assistant

| Réglage | | |
|---|---|---|
| `music.player` | obligatoire | Lecteur Music Assistant par défaut. |
| `music.speakers[]` | obligatoire | `entity`, `name` ; `members` facultatif (lecteurs groupés avec lui, par exemple la seconde enceinte d'une paire stéréo). |
| `music.playlist` | facultatif | Nom de la playlist affichée dans la file. |

## movies — les films (bloc facultatif), avec plex-info, voir modules.md

| Réglage | | |
|---|---|---|
| `movies.server` | obligatoire | Adresse du service plex-info, par exemple `http://192.168.1.20:8098`. |
| `movies.playScript` | obligatoire | Script qui ouvre un film sur une télé. |
| `movies.tvs[]` | obligatoire | `media`, `remote`, `name`, `plexKeyword` (mot présent dans le nom du lecteur Plex de cette télé), `where` (« au salon »), `remoteTitle`. |

## gaming — les jeux (bloc facultatif), avec l'intégration PlayStation Network

| Réglage | | |
|---|---|---|
| `gaming.name` | obligatoire | Titre de la colonne, par exemple `PS5`. |
| `gaming.console` | obligatoire | Le `media_player` de la console. |
| `gaming.account` | facultatif | Capteurs du compte : `status`, `lastOnline`, `nowPlaying`, `trophyLevel`, `onlineId`, `avatar` (image), `plus` (capteur binaire), `nextLevel`, `platinum`, `gold`, `silver`, `bronze`. |
| `gaming.power` | facultatif | Interrupteur : allumé = en marche, éteint = mode repos. |
| `gaming.rawgKey` | facultatif | Votre clé RAWG, sous la forme `!secret …`. Sans elle, seule la description Wikipédia est affichée. |
| `gaming.wikipedia` | facultatif | Langue de Wikipédia pour les descriptions (par défaut, `locale`). |
| `gaming.trailerSound` | facultatif | `{ player, volume, restore }` : volume de la tablette pendant une bande-annonce, puis après. |

## energy — l'énergie (bloc facultatif)

Tout est facultatif : `solar`, `grid`, `green`, `charge`, `discharge` (capteurs en kWh cumulés), `battery` (kWh),
`batteryCapacityKwh` (nombre ; à omettre pour une batterie virtuelle), `batteryNote` (texte affiché à la place),
`autonomy`, `selfConsumption` (capteurs en % instantanés).

## outdoor — l'extérieur (bloc facultatif)

| Réglage | | |
|---|---|---|
| `outdoor.pool` | facultatif | Capteur de température de la piscine. |
| `outdoor.poolDevice` | facultatif | Grande tuile sous la piscine : `entity`, `name`, `icon`, `on` et `off` (textes d'état, par exemple « Filtration en cours » / « Arrêtée »). |
| `outdoor.devices[]` | obligatoire, peut être vide | Mêmes champs, une tuile chacun. |

## cleaning — le ménage (bloc facultatif)

`cleaning.robots[]` :

| Réglage | | |
|---|---|---|
| `entity`, `name`, `model` | obligatoire | Le `vacuum`, le titre du panneau, le modèle affiché dessous. |
| `battery`, `error` | facultatif | Capteurs. |
| `mode` | facultatif | Entité `select` des modes de nettoyage. |
| `modeLabels` | facultatif | Nom affiché de chaque option de `mode`. |
| `modes` | facultatif | Modes en grille « quoi × intensité » : `kinds[]` et `levels[]` (`id`, `label`, `icon` facultatif), `options` (`options.<kind>.<level>` = option du select), `default` facultatif. |
| `rooms[]` | facultatif | `{ area, name }` : pièces de Home Assistant que le robot peut nettoyer. |
| `zones[]` | facultatif | `{ id, name, icon, rooms }` : pièces regroupées en zones. |
