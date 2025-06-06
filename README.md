# 🎮 Culture Quiz Website - README

## 📝 Description

Culture Quiz Website est une application web interactive permettant aux utilisateurs de tester leurs connaissances en culture générale à travers des quiz. L'application offre des fonctionnalités avancées comme le mode multijoueur, la soumission de questions par les utilisateurs, et un système d'administration pour la modération du contenu.

## 🚀 Fonctionnalités

🔷 Inscription et authentification des utilisateurs

🔷 Quiz par catégories et niveaux de difficulté

🔷 Mode multijoueur en temps réel

🔷 Soumission de questions par les utilisateurs

🔷 Système d'approbation des questions par les administrateurs

🔷 Tableau des meilleurs scores

🔷 Interface responsive et moderne

## 📋 Prérequis

Node.js (v16.0 ou supérieur)

MongoDB (v5.0 ou supérieur)

NPM ou Yarn

Navigateur web moderne

## ⚙️ Installation

1. Cloner le dépôt

```shell
git clone https://github.com/BjornHgn/culture-quiz-website.git
cd culture-quiz-website
```

2. Installer les dépendances

```shell
npm install
```

3. Configuration de la base de données

Assurez-vous que MongoDB est installé et en cours d'exécution.
Créez une base de données nommée **culture_quiz**

4. Configuration du fichier .env

Créez un fichier .env dans le dossier backend avec les variables suivantes:

```shell
PORT=5000
MONGODB_URI=mongodb://localhost:27017/culture_quiz
JWT_SECRET=votre_clé_secrète_jwt
```

🚀 Démarrage de l'application

Démarrer le serveur backend

```shell
cd backend
node server.js
```

Puis

```npm
npm start
```

Ouvrez votre navigateur et naviguez vers http://localhost:5000

## 🎮 Mode Multijoueur

Pour jouer avec des amis sur le même réseau WiFi, vous devez modifier les références à "localhost" avec votre adresse IP locale:

1. Trouver votre adresse IP

Windows: Ouvrez l'invite de commande et tapez ipconfig

2. Modifier les fichiers sources

Remplacez toutes les occurrences de **http://localhost:5000** par **http://VOTRE_ADRESSE_IP:5000** dans les fichiers suivants:

```
src/js/quiz.js
src/js/login.js
src/js/register.js
submit-question.js
src/js/my-submissions.js
src/js/main.js
```

```JavaScript
// Remplacer
const socket = io('http://localhost:5000');
// Par
const socket = io('http://192.168.1.100:5000');

// Remplacer
const response = await fetch('http://localhost:5000/api/game/questions');
// Par
const response = await fetch('http://192.168.1.100:5000/api/game/questions');
```

3. Accès par autres utilisateurs

Vos amis peuvent rejoindre le quiz en accédant à:

```
http://VOTRE_ADRESSE_IP:5000
```

## 📚 Structure du projet

```
culture-quiz-website/
├── backend/                # Code serveur
│   ├── config/             # Configuration (base de données)
│   ├── controllers/        # Logique métier
│   ├── middleware/         # Middleware (authentification)
│   ├── models/             # Modèles de données
│   ├── routes/             # Définition des routes API
│   ├── scripts/            # Scripts utilitaires
│   └── server.js           # Point d'entrée du serveur
├── src/                    # Code client
│   ├── css/                # Feuilles de style
│   ├── js/                 # Scripts JavaScript
│   ├── assets/             # Images et autres ressources
│   ├── data/               # Données JSON
│   └── *.html              # Pages HTML
└── package.json            # Dépendances et scripts
```

## 🧪 Fonctionnalités de test

Des données de test peuvent être importées avec:

```shell
cd backend/scripts
node importQuestions.js
```

## 👨‍💻 Administration

Pour accéder au panneau d'administration:

-Créez un compte utilisateur

-Dans MongoDB, modifiez l'utilisateur pour définir isAdmin: true

-Accédez à /admin.html

Ou utilisez le script se trouvant dans les dossiers backend pour génerer un compte Admin

```shell
cd backend/scripts
node createAdmin.js
```