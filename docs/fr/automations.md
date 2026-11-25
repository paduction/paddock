# Automatisations : horaires et modes

L'onglet **Automatisations** permet de faire agir la maison toute seule, depuis la tablette ou l'application
de bureau, sans ouvrir Home Assistant.

- Un **mode** est un bouton qui règle plusieurs appareils d'un coup. *Départ* : fermer ces volets, laisser
  ceux-là entrouverts, éteindre les lumières, fermer la porte de garage.
- Un **horaire** agit tout seul. *Pompe de la piscine* : allumée à 6 h, éteinte à 8 h.

Tout se crée et se modifie dans l'interface : appuyez sur **+ Mode** ou **+ Horaire**, donnez un nom,
dites quand il agit, puis choisissez ce que fait chaque appareil. Un appareil auquel vous ne touchez pas est laissé tel quel.

## Quand un horaire agit

| | |
|---|---|
| **Heure** | À heure fixe. Avec une heure de fin, c'est une plage : ce qui a été allumé s'éteint à la fin (et l'inverse). Les volets et les scènes ne bougent pas à la fin. |
| **Soleil** | Au lever ou au coucher du soleil, ou jusqu'à une heure avant ou après. |
| **Présence** | Quand la dernière personne quitte la maison, ou quand la première rentre. Les personnes sont celles de `people` dans `paddock.yaml`. |

Chacun peut être limité à certains jours de la semaine, et mis en pause avec son interrupteur sans être supprimé.

## Ce que peuvent faire les appareils

| Appareil | Choix |
|---|---|
| Lumières, appareils extérieurs, ampli | Allumer, éteindre |
| Volets | Ouvrir, entrouvert (20 %), 50 %, fermer |
| Scènes | Activer |
| Portail ou porte de garage | Fermer seulement |

Seuls les appareils déjà présents dans `paddock.yaml` sont proposés. Une automatisation peut fermer le portail
mais jamais l'ouvrir : rien n'ouvre la maison tout seul.

## Bon à savoir

- Les automatisations sont gardées et exécutées par l'intégration Paddock, dans Home Assistant : elles
  fonctionnent tablette éteinte, et tous les écrans (tablette, application de bureau) montrent la même liste.
- Ce ne sont pas des automatisations Home Assistant : elles n'apparaissent pas dans sa page *Automatisations*.
  Celles de Home Assistant continuent de fonctionner à côté.
- Si Home Assistant est arrêté à l'heure d'un horaire, cette exécution est sautée.
- Tout écran connecté peut les créer et les modifier : voir [security.md](security.md).
- Il faut la version 0.4.0 ou plus de l'intégration (redémarrez Home Assistant après la mise à jour).
