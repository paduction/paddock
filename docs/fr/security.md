# Comptes, sécurité et accès depuis l'extérieur

## Ce qui est où

- **L'application** (`/local/paddock/…`) est lisible par n'importe qui sur votre réseau, sans connexion, comme tout
  ce qui est dans le dossier `www` de Home Assistant. C'est pour cela qu'elle ne contient rien sur votre maison.
- **`paddock.yaml`** n'est envoyé que par la connexion authentifiée de Home Assistant, par l'intégration Paddock.
  Tout utilisateur connecté peut le lire en entier, administrateur ou non, y compris les clés référencées par
  `!secret` (la clé RAWG). N'y mettez rien qu'un membre du foyer ne devrait pas voir.
- **Les automatisations** (horaires et modes) peuvent être créées et modifiées par tout écran connecté, administrateur ou non.
  Elles ne peuvent agir que sur les appareils listés dans `paddock.yaml`, et peuvent fermer le portail mais jamais l'ouvrir.
- **Le jeton** saisi sur une tablette ou dans l'application de bureau n'est stocké que sur cet appareil
  (stockage du navigateur). Quelqu'un qui tient l'appareil déverrouillé a les droits de ce compte.

## Un compte par écran, sans droits d'administrateur

Une tablette murale est dans un couloir : donnez-lui un compte qui ne peut pas modifier Home Assistant.

1. Home Assistant → **Paramètres → Personnes → Utilisateurs → Ajouter un utilisateur**. Nommez-le d'après
   l'écran (par exemple *Tablette*), laissez **Administrateur** décoché.
2. Connectez-vous une fois avec cet utilisateur (une fenêtre de navigation privée suffit), ouvrez son profil →
   **Sécurité** → **Jetons d'accès longue durée** → créez-en un.
3. Utilisez ce jeton sur la tablette.

### Passer la tablette sur son propre compte, à distance

Si la tablette est déjà connectée avec le jeton d'un administrateur, inutile d'y toucher.
De n'importe où, en tant qu'administrateur, appelez :

```yaml
action: paddock.assign_account
data:
  user: Tablette
```

La tablette le remarque, demande à Home Assistant un jeton pour cet utilisateur, l'enregistre et se recharge. Les règles :

- seul un administrateur peut appeler le service, et l'utilisateur visé ne doit pas être administrateur ;
- seul un appareil actuellement connecté en administrateur peut réclamer le jeton, une seule fois, dans les 10 minutes ;
- le jeton est de longue durée (10 ans) et apparaît dans le profil de cet utilisateur, où vous pouvez le révoquer.

Supprimez ensuite le jeton d'administrateur que la tablette utilisait (votre profil → Sécurité).
L'application de bureau ignore ce service : un ordinateur garde le compte avec lequel vous l'avez connecté.

## Accès depuis l'extérieur

**Ne redirigez pas un port de votre box vers Home Assistant** pour utiliser Paddock hors de chez vous : cela
l'expose à tout Internet.

Utilisez plutôt un réseau privé. Avec [Tailscale](https://tailscale.com) (gratuit pour un usage personnel) :

1. Installez l'application **Tailscale** dans Home Assistant et connectez-vous.
2. Dans sa configuration, annoncez votre réseau local comme route de sous-réseau (par exemple `192.168.1.0/24`).
3. Dans la console d'administration Tailscale, approuvez cette route pour la machine Home Assistant et désactivez l'expiration de sa clé.
4. Installez Tailscale sur votre téléphone ou votre ordinateur et connectez-vous avec le même compte.

Vos appareils joignent alors Home Assistant à son adresse habituelle, de partout, sans rien ouvrir sur Internet.
Home Assistant Cloud (Nabu Casa) fonctionne aussi : saisissez son adresse dans l'écran de connexion de Paddock.

## Si un appareil est perdu

Home Assistant → profil du compte utilisé par cet appareil → **Sécurité** → supprimez son jeton.
S'il était sur Tailscale, retirez-le aussi dans la console d'administration Tailscale.
