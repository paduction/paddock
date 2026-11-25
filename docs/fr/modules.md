# Ce dont chaque écran a besoin

Un écran apparaît quand sa partie de `paddock.yaml` est remplie. Accueil, Éclairage et Volets sont toujours là ;
les autres sont facultatifs. Cette page dit ce que chacun attend de Home Assistant.

| Écran | Réglage | Ce qu'il faut dans Home Assistant |
|---|---|---|
| Accueil | `home`, `sidebar`, `people`, `calendars` | Des personnes, des agendas, une entité météo, des capteurs de température. Tout est facultatif sauf `home.alerts`. |
| Éclairage | `lighting` | Des entités `light` et, si vous voulez, des `scene`. |
| Volets | `covers` | Des entités `cover`. |
| Cinéma | `home.cinema` | Un `input_boolean` qui lance vos propres automatisations « mode cinéma », quatre `script` (écran bas / haut, projecteur allumé / éteint), un interrupteur d'ampli. |
| Films | `movies` | Un serveur Plex, le petit service **plex-info** de ce dépôt, et un script qui ouvre un film sur une télé. Voir plus bas. |
| Jeux | `gaming` | L'intégration **PlayStation Network**. Facultatif : un interrupteur d'alimentation (par exemple [ps5-mqtt](https://github.com/FunkeyFlo/ps5-mqtt)) et une clé [RAWG](https://rawg.io/apidocs) gratuite pour les fiches de jeux. |
| Musique | `music` | **[Music Assistant](https://www.music-assistant.io)** et son intégration Home Assistant. Les lecteurs listés doivent être des lecteurs Music Assistant. |
| Énergie | `energy` | Des capteurs d'énergie cumulée en kWh (solaire, réseau, batterie). |
| Extérieur | `outdoor` | Des interrupteurs (pompe de piscine, lumières du jardin…) et un capteur de température de piscine. |
| Ménage | `cleaning` | Des entités `vacuum`. Le nettoyage par pièce utilise `vacuum.clean_area` : les pièces du robot doivent être reliées aux pièces de Home Assistant. |
| Caméras | `cameras` | Des entités `camera`. Facultatif : capteurs de personne, entité `event` de sonnette, sélecteurs de mode de sécurité. |

## Les cas particuliers

**Modes de sécurité des caméras.** `cameras.security` liste des entités `select` dont les options sont exactement
`Home`, `Away` et `Disarmed`, ce que fournit l'intégration Eufy. Pour un autre système d'alarme, créez un
`select` modèle avec ces trois options, ou laissez le réglage de côté : les caméras fonctionnent quand même.

**Sonnette.** `cameras.doorbell.event` est une entité `event` qui émet `ring`. Quand on sonne, la tablette
affiche la caméra de la sonnette en plein écran.

**Alertes météo.** `home.alerts.vigilance` et `nextRain` attendent les capteurs de l'intégration **Météo-France**.
Ailleurs, laissez-les de côté.

**Résumé du jour.** `home.summary` est un `input_text` (ou toute entité dont l'état est une phrase) que votre
propre automatisation remplit, par exemple avec un résumé de la journée écrit par une IA. Paddock se contente de l'afficher.

**Son des bandes-annonces.** `gaming.trailerSound` monte le volume de la tablette pendant une bande-annonce de jeu
et le remet ensuite. Il faut l'intégration **Fully Kiosk Browser** (le `media_player` de la tablette). Certaines
tablettes saccadent quand une vidéo joue avec le son ; dans ce cas, laissez ce réglage de côté.

## Films : plex-info et le script de lecture

L'écran Films lit votre bibliothèque Plex à travers un petit service, pour que votre jeton Plex n'arrive jamais sur la tablette.

1. Sur une machine toujours allumée (celle de Plex convient), avec Docker :

   ```bash
   cd server/plex-info
   cp .env.example .env      # mettez-y PLEX_URL et PLEX_TOKEN
   docker compose up -d
   ```

   Vérifiez : `http://<cette-machine>:8098/health` répond `{"ok": true, "token": true, "plex": true}`.

2. Ajoutez à Home Assistant un script qui ouvre un film sur une télé. Un exemple pour Apple TV se trouve dans
   [docs/examples/plex_play_script.yaml](../examples/plex_play_script.yaml). Paddock l'appelle avec
   `title`, `library`, `resume`, `tv` (le lecteur multimédia) et `room` (le `plexKeyword` de la télé).

3. Remplissez `movies` dans `paddock.yaml` :

   ```yaml
   movies:
     server: http://192.168.1.20:8098
     playScript: script.paddock_plex_play
     tvs:
       - media: media_player.apple_tv
         remote: remote.apple_tv
         name: Salon
         plexKeyword: salon
         where: au salon
         remoteTitle: Apple TV du salon
   ```

Le service est en lecture seule et sans mot de passe : gardez-le sur votre réseau local, jamais sur Internet.
