# Entretien Bâtiment mobile

Application native Expo/React Native pour iOS et Android. Elle utilise le même backend et les mêmes données que le portail web/PWA sans modifier le déploiement du site.

## Fonctions natives

- Authentification avec rotation de jetons dans iOS Keychain et Android Keystore
- Accès par rôle et permissions configurées dans le portail
- Tableau de bord, bons de travail, urgences et notifications
- Kilométrage manuel, statistiques opérationnelles et liste d’achats
- Inventaire: produits, sessions de comptage et saisie des écarts
- Entretien préventif avec complétion et annulation
- Administration des utilisateurs et des abonnements logiciels
- Suivi GPS des trajets, véhicules, arrêts et photos
- Dépenses, reçus et statuts de remboursement

## Développement

Prérequis: Node.js 20.19 ou plus récent.

```powershell
npm install
npm run typecheck
npm run doctor
npm start
```

Le téléphone et le serveur de développement doivent être accessibles sur le même réseau. Pour cibler un backend local:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.10:8080"
npm start
```

## Builds iOS et Android

Les identifiants natifs existants sont conservés dans `app.json`. Les profils `preview` produisent une installation interne; `production` produit les artefacts App Store et Google Play.

```powershell
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile production --platform all
```

Les builds iOS nécessitent un compte Apple Developer; les soumissions Android nécessitent un compte Google Play Console. Les certificats et clés sont gérés par EAS, pas dans le dépôt.

## Backend

Le mobile utilise `/api/auth/mobile/login`, `/api/auth/mobile/refresh` et `/api/auth/mobile/logout`. Le portail web continue d’utiliser les endpoints à cookie existants. Tous les autres modules partagent directement les API métier et la base de données.