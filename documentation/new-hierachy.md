```markdown
# LAYOUT — PREDATOR-PREY SIMULATION

## HIÉRARCHIE VISUELLE (vue d'ensemble)

```
+====================================================================+
|  TOPBAR                                                             |
|  [titre]  [recherche]  [autoplay]  [step]                          |
+====================================================================+
|       |                                                            |
|       |   +----------------------------------------------------+   |
| SIDE- |   | KPI HAUTS (3)                                       |   |
| BAR   |   |  Proies: 42  |  Prédateurs: 18  |  Total: 60       |   |
|       |   +----------------------------------------------------+   |
| (rét- |                                                            |
| rac-  |   +----------------------------------------------------+   |
| table |   |                                                    |   |
|  en   |   |           CANVAS PIXI (CENTRAL)                    |   |
| icône |   |                                                    |   |
|  60px)|   |       (fond topographique + agents)                |   |
|       |   |                                                    |   |
|       |   +----------------------------------------------------+   |
|       |                                                            |
|       |   +----------------------------------------------------+   |
|       |   | GRAPHIQUE ÉVOLUTION          |  ONGLETS (2)        |   |
|       |   | (Chart.js)                   |  [Phase] [Densité]  |   |
|       |   | population vs cycles         |  (contenu variable) |   |
|       |   +----------------------------------------------------+   |
|       |                                                            |
|       |   +----------------------------------------------------+   |
|       |   | 7 KPI COMPACTS (avec tendances) + histogramme énergie| |
|       |   +----------------------------------------------------+   |
+====================================================================+
```

## DÉTAIL PAR ZONE

### 1. TOPBAR (tout en haut, pleine largeur)
```
[Titre "Predator-Prey Simulation"]  [Recherche...]  [⏸/▶]  [⏭]
```
- Hauteur : ~60px
- Fond : glassmorphism semi-transparent
- Affichage : cycle et tick en cours

---

### 2. SIDEBAR (gauche, rétractable)

**État déployé (240px)** :
```
┌──────────────────────┐
│  🐾 Predator-Prey    │
│  ────────────────    │
│  SIMULATION           │
│  ▶ Simulation         │
│  📊 Dashboard         │
│  ────────────────    │
│  CONTRÔLE             │
│  🔄 Réinitialiser     │
│  ────────────────    │
│  CONFIGURATION        │
│  ⚙ Paramètres         │
│  ────────────────    │
│  👤 42 agents         │
└──────────────────────┘
```

**État rétracté (60px)** :
```
┌────┐
│ 🐾 │
│ ▶  │
│ 📊 │
│ 🔄 │
│ ⚙  │
│ 👤 │
└────┘
```
- Bouton toggle : hamburger ☰ en haut à gauche de la topbar

---

### 3. ZONE CENTRALE (le reste de l'espace)

#### 3.1 KPI HAUTS (3 indicateurs)
```
┌──────────────────────────────────────────────────────────────────┐
│  🟢 Proies     🔴 Prédateurs     👥 Total                      │
│     42            18               60                          │
└──────────────────────────────────────────────────────────────────┘
```
- Largeur : pleine largeur de la zone centrale
- Hauteur : ~80px
- Chiffres en grand (2rem), labels en petit au-dessus

---

#### 3.2 CANVAS PIXI (simulation)
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    (fond topographique)                          │
│                 ●  ●        ●                                   │
│               ●      ●  ●           ●                           │
│                     ●        ●                                  │
│          ●                ●      ●                              │
│                    ●  ●                                         │
│                                                                  │
│  [−]  [+]  (contrôles zoom intégrés)                            │
└──────────────────────────────────────────────────────────────────┘
```
- Proportions : rectangle (prend ~60% de la hauteur totale)
- Fond : carte topographique (courbes cyan/bleu)
- Agents : cercles glow (verts/rouges) avec trails

---

#### 3.3 LIGNE DU BAS (divisée en 2)

**Partie gauche (65%) : GRAPHIQUE ÉVOLUTION**
```
┌──────────────────────────────────────────────────────────────────┐
│  Évolution de la population                                      │
│                                                                  │
│  120 ─                                                          │
│   90 ─      ╭─╮                                                 │
│   60 ─    ╭─╯ ╰─╮                                              │
│   30 ─  ╭─╯     ╰─╮                                            │
│    0 ─╯─────────────                                           │
│       1  2  3  4  5  6  7  8  9  10                            │
│                                                                  │
│  Légende : 🟢 Proies  🔴 Prédateurs                            │
└──────────────────────────────────────────────────────────────────┘
```
- Chart.js, thème dark
- Axes : cycles en X, population en Y

**Partie droite (35%) : ONGLETS (Phase / Densité)**
```
┌──────────────────────────────────────────────────────────────────┐
│  [Phase]  [Densité]                                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  (contenu variable selon l'onglet sélectionné)            │ │
│  │                                                            │ │
│  │  Phase : scatter plot (prédateurs vs proies)              │ │
│  │  Densité : heatmap avec contours                          │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```
- Hauteur : identique au graphique d'évolution
- Onglet "Phase" actif par défaut

---

#### 3.4 BAS (7 KPI COMPACTS + HISTOGRAMME)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⚡ Énergie moy.  │  🧬 Repro. taux  │  💀 Mortalité  │  ⏱ Durée vie moy.   │
│      12.4 ▲       │      0.045 ▼     │     0.08 ▲     │      34.2 ▼          │
│  ████████████░░░  │  ██░░░░░░░░░░░░  │  ████████░░░░  │  ██████████░░░░░░░  │
│                    │                   │                 │                     │
│  🎯 Capture taux  │  ⚖ Ratio P/P    │  📈 Croissance  │  🔋 Histogramme     │
│      0.72 ▲       │     2.33 ▲      │     1.15 ▲     │  ██ ██ ██ ██ ██ ██  │
│  ██████████░░░░░  │  ██████████░░░  │  ██████████░░   │  5 10 15 20 25 30   │
└──────────────────────────────────────────────────────────────────────────────────┘
```
- Hauteur : ~120px
- 7 cartes compactes (chacune : valeur + tendance + mini barre)
- 8ᵉ élément : mini histogramme énergie (distribution)
- Tooltip au survol : détails (max, min, moyenne, tendance sur 10 cycles)

---

## RÉSUMÉ DES PROPORTIONS

| Zone | Largeur | Hauteur | Priorité |
| :--- | :--- | :--- | :--- |
| Topbar | 100% | 60px | ⭐ |
| Sidebar (déployée) | 240px | 100% - 60px | ⭐⭐ |
| Sidebar (rétractée) | 60px | 100% - 60px | ⭐⭐ |
| KPI hauts | 100% - sidebar | 80px | ⭐⭐⭐ |
| Canvas Pixi | 100% - sidebar | 60% de l'espace restant | ⭐⭐⭐⭐⭐ (priorité max) |
| Graphique + Onglets | 100% - sidebar | 30% de l'espace restant | ⭐⭐⭐⭐ |
| KPI bas + Histogramme | 100% - sidebar | 10% de l'espace restant | ⭐⭐⭐ |

---

## INTERACTIONS

| Élément | Interaction |
| :--- | :--- |
| Sidebar | Toggle ☰ pour rétracter/déployer |
| Canvas | Zoom (molette + boutons +/-), Pan (drag) |
| KPI haut | Lecture seule |
| KPI bas | Tooltip au survol (détails) |
| Onglets | Clic pour changer de vue (Phase ↔ Densité) |
| Graphique | Tooltip au survol des points |
| Topbar | Play/Pause, Step, Reset |

---

## REMARQUES TECHNIQUES

- **Canvas Pixi** : WebGL accéléré, 60 FPS, 5000+ agents
- **Fond topographique** : sprite statique généré une fois
- **Interpolation** : conservée (lerp entre previous/current agents)
- **Chart.js** : thème dark, données par cycle (pas par tick)
- **D3.js** : utilisé uniquement pour le diagramme de phase
- **Heatmap** : calculée côté serveur (snapshot tous les 10 cycles)
- **Logs** : supprimés de l'UI

```