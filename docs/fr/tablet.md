# Régler la tablette murale

Paddock est dessiné pour un écran paysage de 1280 × 800 et s'adapte à toute autre taille en paysage.
N'importe quelle tablette avec un navigateur récent convient ; une tablette Android de 10 ou 11 pouces d'entrée de gamme suffit.

## Android avec Fully Kiosk Browser (recommandé)

[Fully Kiosk Browser](https://www.fully-kiosk.com) transforme la tablette en écran qui reste sur une page.
La licence payante retire le filigrane et débloque le mode kiosque et le contrôle à distance.

| Où, dans les réglages de Fully | Réglage | Valeur |
|---|---|---|
| Web Content Settings | Start URL | `http://<votre-home-assistant>:8123/local/paddock.html` |
| Web Content Settings | Autoplay Videos | activé (flux des caméras) |
| Device Management | Keep Screen On | activé |
| Device Management | Launch on Boot | activé |
| Motion Detection | Enable Visual Motion Detection, Turn Screen On on Motion | activés, si vous laissez l'écran s'éteindre |
| Kiosk Mode | Enable Kiosk Mode | activé, avec un code |
| Remote Administration | Enable Remote Administration | activé, avec un mot de passe, si vous utilisez l'intégration Home Assistant |

Paddock a son propre écran de veille (une horloge, après `idleMinutes` sans toucher) : celui de Fully peut rester éteint.

**Intégration Fully Kiosk Browser (facultative).** Ajouter la tablette à Home Assistant avec cette intégration permet
de recharger la page, d'allumer l'écran et de régler le volume depuis Home Assistant. Recharger après un déploiement :

```yaml
action: fully_kiosk.load_url
data:
  device_id: <votre tablette>
  url: http://<votre-home-assistant>:8123/local/paddock.html
```

## iPad ou autre navigateur

Ouvrez la même adresse dans le navigateur et ajoutez-la à l'écran d'accueil. Sur iPad, l'*Accès guidé* garde la tablette sur Paddock.

## Connecter la tablette

Au premier lancement, Paddock demande l'adresse de Home Assistant et un jeton longue durée.
Taper un long jeton sur une tablette murale est pénible. Le plus simple : connectez la tablette une fois avec
n'importe quel jeton que vous pouvez y amener (copié depuis une note ou un message ouvert sur la tablette), puis
donnez-lui son propre compte restreint depuis votre ordinateur, sans y retoucher : voir
**Passer la tablette sur son propre compte** dans [security.md](security.md).

## Après une coupure de courant

La tablette redémarre souvent avant Home Assistant. Paddock affiche alors la maison avec les derniers réglages
qu'il a vus et se reconnecte tout seul toutes les 15 secondes.
