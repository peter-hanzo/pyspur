# PySpur - Interface graphique pour visualiser les chemins de raisonnement des LLM

<p align="center">
  <a href="./README.md"><img alt="README in English" src="https://img.shields.io/badge/English-blue"></a>
  <a href="./README_CN.md"><img alt="简体中文版自述文件" src="https://img.shields.io/badge/简体中文-blue"></a>
  <a href="./README_JA.md"><img alt="日本語のREADME" src="https://img.shields.io/badge/日本語-blue"></a>
  <a href="./README_KR.md"><img alt="README in Korean" src="https://img.shields.io/badge/한국어-blue"></a>
  <a href="./README_DE.md"><img alt="Deutsche Version der README" src="https://img.shields.io/badge/Deutsch-blue"></a>
<a href="./README_FR.md"><img alt="Version française du README" src="https://img.shields.io/badge/Français-blue"></a>
<a href="./README_ES.md"><img alt="Versión en español del README" src="https://img.shields.io/badge/Español-blue"></a>
</p>

https://github.com/user-attachments/assets/19cf6f99-6d66-45dc-911c-74025f87b1d2

# 🕸️ Pourquoi PySpur ?

* Les humains réfléchissent plus longtemps aux problèmes difficiles pour améliorer leurs décisions.
* De même, nous pouvons permettre aux LLMs de "réfléchir" plus longtemps grâce à des graphes computationnels impliquant plusieurs étapes et boucles de rétroaction.
* Cependant, ces graphes impliquent des interdépendances complexes entre les nœuds, où la sortie d'un nœud devient l'entrée d'un autre.
* **L'objectif de PySpur est de permettre aux développeurs de construire, tester et déployer ces graphes LLM en simplifiant la complexité de l'exécution parallèle et de la gestion des états.**

# ✨ Avantages principaux

1. **Développez avec des nœuds de calcul en temps d'inférence** :
    * **Planificateurs de haut niveau avec tout compris** (MCTS, Self-Refinement, BoN, ToT, etc.)
    * **Primitives de bas niveau pour l'échantillonnage parallèle/séquentiel** (cycles, routeurs, branches, agrégateurs)
    * **Vérificateurs** (nœuds de code, LLM en tant que juge, intégrations logicielles, etc.)
2. **Déboguez avec des évaluations** :
    * **Référentiels de raisonnement courants** (GSM8k, MATH, ARC, etc.)
    * **Scoreurs** via LLM en tant que juge
    * **Jeux de données personnalisés** au format CSV, JSONL, HF Datasets
3. **Déployez pour l'inférence par lot via une file d'attente de travaux** :
    * **Soumettez/gérez des tâches par lot via une interface utilisateur** pour une facilité d'utilisation
    * **Auto-hébergement des API de lot asynchrones** pour une flexibilité totale
    * **Tolérance aux pannes et persistance des travaux** pour les tâches de longue durée

# 🗺️ Feuille de route

- [X] Canvas
- [X] Nœuds ITC
- [X] Exécution asynchrone/par lot
- [ ] Modèles
- [ ] Compilation des Spurs en code
- [ ] Surveillance des nœuds ITC
- [ ] Nouveaux nœuds
    - [ ] Outils
    - [ ] Boucles
    - [ ] Conditionnels
- [ ] Évaluations
- [ ] Multimodal
- [ ] API Spur
- [ ] Conteneurisation des vérificateurs de code
- [ ] Classement
- [ ] Génération de Spurs via IA

Vos retours seront immensément appréciés.
Merci de [nous indiquer](mailto:founders@pyspur.dev?subject=Demande%20de%20fonctionnalité&body=Je%20souhaite%20cette%20fonctionnalité%3Ai) quelles fonctionnalités de cette liste vous souhaitez voir en priorité ou d'en proposer de nouvelles.

# ⚡ Démarrage rapide

Vous pouvez démarrer PySpur en trois étapes rapides.

1. **Clonez le dépôt :**
    ```sh
    git clone https://github.com/PySpur-com/PySpur.git
    cd pyspur
    ```

2. **Lancez les services Docker :**

    ```sudo docker compose up --build -d```

    Cela lancera une instance locale de PySpur qui enregistrera les Spurs et leurs exécutions dans un fichier SQLite local.

3. **Accédez au portail :**

    Allez sur `http://localhost:6080/` dans votre navigateur.

    Utilisez `pyspur`/`canaryhattan` comme nom d'utilisateur/mot de passe.
