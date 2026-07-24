## To-do list — construire la boucle de simulation (le cœur du projet)

**1. Faire vivre un seul agent**
- [OK] Ajouter une fonction `impl Agent` avec une méthode `move_randomly()` qui modifie `x` et `y` (ici tu vas toucher `&mut self` pour la première fois)
- [OK] Ajouter un crate externe pour générer des nombres aléatoires (`rand`) — premier contact avec `Cargo.toml` et les dépendances

**2. Faire vivre toute la population**
- [OK] Boucler sur `&mut population` pour faire bouger tout le monde à chaque tick
- [OK] Ajouter une boucle "tick" globale (`for tick in 0..N { ... }`) qui appelle la mise à jour de chaque agent

**3. Reproduction des proies**
- [ ] À chaque tick, chaque proie a une petite probabilité de créer un clone à proximité
- [ ] Ici tu vas rencontrer un vrai casse-tête d'ownership : comment ajouter un nouvel agent à `population` **pendant** qu'on la parcourt ? (spoiler : on ne peut pas directement — on accumule les naissances dans une liste à part, puis on les ajoute après la boucle)

**4. Prédation**
- [ ] Pour chaque prédateur, trouver la proie la plus proche dans un rayon donné
- [ ] Si distance < seuil de capture : la proie est marquée "mangée", le prédateur gagne de l'énergie
- [ ] Supprimer les proies mangées de `population` (encore un piège d'ownership classique à éviter : supprimer pendant qu'on parcourt)

**5. Énergie et mort des prédateurs**
- [ ] Chaque prédateur perd de l'énergie à chaque tick
- [ ] Reproduction si énergie > seuil, mort (suppression) si énergie ≤ 0

?