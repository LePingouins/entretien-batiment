# Publication iOS avec EAS

Le projet est déjà configuré pour iOS:

- Bundle ID: `com.lepingouin.entretientrajets`
- Nom: `Entretien Bâtiment`
- Version: `2.0.0`
- Localisation en arrière-plan, caméra, photothèque et stockage sécurisé configurés
- Icône Apple valide de 1024 x 1024 pixels
- EAS augmente automatiquement le numéro de build en production

## 1. Créer les comptes Apple

1. Créer ou utiliser un Apple ID.
2. S'inscrire au programme Apple Developer payant: <https://developer.apple.com/programs/>.
3. Vérifier que ce compte peut accéder à App Store Connect: <https://appstoreconnect.apple.com/>.

## 2. Créer l'application Apple

Dans App Store Connect, ouvrir **Apps**, puis **+**, puis **Nouvelle app**:

- Plateforme: iOS
- Nom: Entretien Bâtiment
- Langue principale: Français (Canada)
- Bundle ID: `com.lepingouin.entretientrajets`
- SKU: `entretien-batiment-ios`

Si le Bundle ID n'est pas proposé, le créer d'abord dans **Certificates, Identifiers & Profiles** sur le portail Apple Developer avec exactement la même valeur.

## 3. Se connecter à Expo

Depuis PowerShell:

```powershell
cd C:\EntretienBatiment\mobile
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest whoami
```

## 4. Créer le build TestFlight

```powershell
npm.cmd run ios:build:production
```

Lors des questions:

- Se connecter avec le compte Apple Developer.
- Sélectionner la bonne équipe Apple.
- Laisser EAS créer et gérer le certificat et le profil de provisionnement.

Le build est produit sur les serveurs Apple/Expo; aucun Mac n'est requis.

## 5. Envoyer vers TestFlight

Après la réussite du build:

```powershell
npm.cmd run ios:submit
```

Sélectionner l'application créée à l'étape 2. Apple traite normalement le build pendant plusieurs minutes avant de l'afficher dans **App Store Connect > TestFlight**.

## 6. Tester sur iPhone

1. Installer l'application **TestFlight** depuis l'App Store.
2. Dans App Store Connect, ajouter le compte Apple du testeur au groupe de test interne.
3. Installer Entretien Bâtiment depuis TestFlight.
4. Autoriser la localisation **Toujours** et la position précise pour tester les trajets en arrière-plan.
5. Tester connexion, caméra, documents, trajet en ligne, trajet hors ligne et synchronisation au retour du réseau.

Un build interne pour un iPhone enregistré peut aussi être créé avec:

```powershell
npm.cmd run ios:build:preview
```

Le profil Simulator est disponible pour un Mac avec Xcode:

```powershell
npm.cmd run ios:build:simulator
```

## 7. Préparer la fiche App Store

Apple demandera au minimum:

- URL de politique de confidentialité
- URL d'assistance
- Description, catégorie et mots-clés
- Captures d'écran iPhone
- Questionnaire de confidentialité et classification d'âge
- Coordonnées de la personne responsable de la révision

Dans le questionnaire de confidentialité, déclarer selon l'utilisation réelle de l'entreprise les données liées au compte, la localisation précise, les photos/documents et les données de dépenses. L'application ne demande pas l'autorisation de suivi publicitaire.

Dans les notes de révision Apple, expliquer la localisation en arrière-plan:

> L'utilisateur démarre volontairement un trajet professionnel. L'application enregistre alors le parcours jusqu'à ce que l'utilisateur touche Terminer, afin de calculer le kilométrage professionnel. Aucun trajet n'est enregistré lorsqu'aucun trajet n'est actif.

Fournir à Apple un compte de démonstration permettant d'ouvrir l'écran des trajets.

## À ne pas mettre dans Git

Ne jamais enregistrer dans le dépôt un mot de passe Apple, une clé privée App Store Connect (`.p8`) ou un mot de passe spécifique à l'application. EAS peut conserver les certificats et profils à distance.