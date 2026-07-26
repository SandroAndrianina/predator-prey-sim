## 24/07/2026 - PRISE DE CONSCIENCE ET FONDATION
- **choix du projet** a coder (extremement enthousiate a l'idee de developper un projet presonnel qui ne parle ni de business ni de CRUD
tout cela m'ennuiait reellement de faire du CRUD, des filtres et des recherches c'est pour cela que j'ai choisi un projet reellement different
de l'habituel a l'universite et aussi un projet qui a vraiment son utilite)
- **comprendre le sujet** de la simulation de predator-prey
    -comprendre l'utilite du projet dans la vie reelle et surtout ces enjeux ecologique et scientifique
    -apprendre Lokta-Volterra, un projet fonde sur les mathemathiques cela me motive encore plus que faire un projet qui applique ce que j'ai appris au lycee
    -chois de RUST (c'est vraiment enthousiamant d'apprendre un nouveau language qui est en meme temps puissant et que je n'ai jamais utilise)
- **comprehension des bases de RUST** (c'est un peu comme C car on a directement acces a la memoire, avec ownership et borrowing)
- premier **simulation d'un environnement sur le terminal** avec des coordonnes simplement (coder tout le moteur dans le main puis le refactorise dans des fonctions)
- deuxiement **simulation sur macroquad** (tres archaique) mais le visuellement montre deja son potentiel
- ajout des vecteurs vx et vy pour le deplacement pour etre plus fluide (c'etait vraiment null de voir les mouvements des agents saccade et ne pas etre fluide)

## 25/07/2026 - CONVERSION VERS LE WEB, CONNECTION SQLite & FOMRULAIRE DE CONFIG
- pas trop de probleme sur la *connexion avec SQLite*
- la **conversion vers le web a ete un vrai soulagement** car les graphiques statitiques et l'animations des agents sont *plus modernes et agreable* a voir
- transfere l'horloge de la simulation vers le serveur mais pas vers dans le web
- la **fluidite ameliorer** (le dynamisme des mouvements est en rapport avec leur perte d'energie)
- **API REST a ete un vrai plus** car on vient de l'apprends a l'Universite et cela a ete agreable de l'appliquer dans un projet personnelle
- l'utilisation de *JS est encore un vrai calvaire* (il faut que je m'entraine encore car je ne comprends pas clairement le concept de "async")
- transforme ****l'architecture basique a un architecture professinel** de "static" (un vrai defi avec tout les debug)
- ajout un **formulaire de config** (avec modif, creation et application a ete un gros travail, en plus il est connecte a SQLite, j'ai faillit perd la tete)