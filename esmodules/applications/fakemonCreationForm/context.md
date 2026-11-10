# Contexte : formulaire de création de « Fakemon » (module pokemon5e)

> Document de contexte pour reprendre le développement sans réanalyser les décisions déjà prises.
> Dernière mise à jour (session 3) : implémentation des 2 points bloquants en attente de la session précédente
> -- objet de classe « Pokémon Level » avec `HitPointsAdvancement` (bug de PV corrigé) et objets de type
> intégrés -- plus l'intégration d'un objet de talent (Ability) et de 4 objets de capacité (Move) + Struggle obligatoire,
> la validation des champs obligatoires (`ui.notifications.warn`), et la traduction complète des commentaires/logs
> en anglais (voir sections 7, 9, 11-13, 16). État : création de Fakemon testée de bout en bout
> (« Gatomon ») avec PV, classe, types, talent et capacités correctement intégrés. Seul point réellement
> en attente : confirmer si `possibleHiddenAbilities` doit aussi avoir un objet intégré (voir section 13,
> point en attente n° 3, pas encore confirmé).

---

## 1. Objectif du projet

Le module `pokemon5e` (pour FoundryVTT, sur le système `dnd5e`) permet de créer des acteurs de type PNJ représentant des Pokémon officiels au moyen d'une macro qui lit un `all-pokemon.json`. L'objectif est d'offrir une alternative pour que les utilisateurs finaux (qui ne développent pas le module) puissent créer des **« Fakemon »** (Pokémon homebrew) en remplissant un formulaire manuel, sans toucher au JSON ni aux macros.

## 2. Point d'entrée : option « Fakemon » dans la boîte de dialogue native « Create Actor »

- **Décision prise :** on NE crée PAS de nouveau sous-type d'Actor et on ne modifie pas `system.json`. On choisit d'injecter une option visuelle « Fakemon » dans la boîte de dialogue native `CreateDocumentDialog` (classe du **cœur de Foundry v13**, pas de `dnd5e`), en interceptant son `submit` quand l'utilisateur sélectionne cette option, en annulant la création native et en ouvrant à la place un `Dialog5e` propre au module.
- **Mécanisme confirmé et testé en console (avec `game.actors.size` avant/après) :**
  - Hook utilisé : `Hooks.on("renderApplicationV2", (app, html, context, options) => {...})`, en filtrant sur `app.constructor.name === "CreateDocumentDialog"`.
  - On clone le `<li>` du bouton radio `input[name="type"][value="npc"]`, on change sa `value` en `"fakemon"` et son libellé en « Fakemon », puis on l'insère dans le même `<ol>`.
  - On intercepte le `submit` du `<form>` avec `{ capture: true }` : si `fakemonRadio.checked`, on fait `ev.preventDefault()` + `ev.stopImmediatePropagation()`, on ferme la boîte de dialogue (`app.close()`) et on ouvre `new FakemonCreationDialog().render(true)`. Si l'option n'est pas cochée, on laisse passer le flux natif sans le modifier.
- **Validé :** avec « Fakemon » sélectionné, `game.actors.size` ne change pas (aucun acteur invalide n'est créé). Avec « npc » sélectionné, l'acteur est créé normalement. Aucun effet de bord détecté.
- **✅ Clôturé :** le hook est désormais connecté à la vraie boîte de dialogue — le `// todo: openFakemonCreationDialog();` a été remplacé par l'instance réelle (`new FakemonCreationDialog().render(true)`) ; il a été confirmé lors de tests réels que la boîte de dialogue s'ouvre correctement en sélectionnant « Fakemon ».

## 3. Structure des dossiers pertinents du module

```
pokemon5e/
├── como-sacar-una-release                 ← Notes/guide pour créer une release du module
├── LICENSE                                ← Licence du projet
├── module.json                            ← Métadonnées du module FoundryVTT
├── README.md                              ← Documentation générale du module
├── esmodules/
│   ├── addPokemonSystemProperties.js      ← Ajoute des propriétés système pour les Pokémon (source réelle de POKEMON_TYPES ; N'exporte AUCUN UUID de type, voir section 6.3)
│   ├── settingsMenuOptions.js             ← Options du menu de configuration
│   └── applications/
│       └── fakemonCreationForm/
│           ├── fakemonCreationForm.js     ← Classe FakemonCreationDialog (extends dnd5e.applications.api.Dialog5e)
│           ├── context.md                 ← Ce fichier
│           └── tabs/
│               ├── identity.hbs           ← Nom, image, n° du Pokédex, entrée du Pokédex
│               ├── stats.hbs              ← Ability Scores+Mod, Hit Die (select), PV, niveau initial, maîtrises de compétences/sauvegardes
│               ├── features.hbs           ← Types (correctif des index appliqué, voir section 6.4), talents (feats, via le picker), Egg Group, Gender, Speeds, Senses, Size, Natural AC
│               ├── moves.hbs              ← Capacités CT (TM), capacités Œuf, 20 niveaux de capacités, toutes via le picker du CompendiumBrowser
│               └── evolution.hbs          ← Évolution pré/post + stades d'évolution, regroupés en 3 fieldsets
├── html_inputs/
│   ├── inputEvolvePokemon.js
│   ├── inputMoveManager.js
│   ├── inputUpdateMoves.js
│   └── pokemonInputsSection.js
├── utils/
│   └── logs.js                            ← pk5eLog()
├── extras/
│   └── jsons/ ... (sans changement)
├── packs/ ... (sans changement, compendiums empaquetés)
└── styles/
    └── main.css                           ← Styles CSS du module (non modifié ; le séparateur « ampersand » est géré en ligne via JS, pas en CSS)
```

Il existe aussi déjà `applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.js` (`NpcHpFixer`, qui étend `HandlebarsApplicationMixin(ApplicationV2)`), qui sert de référence de style de code/JSDoc à suivre.

**Remarque :** `features-and-moves.hbs` (le fichier d'origine avant la séparation de Features et Moves) a été supprimé et remplacé par `features.hbs` + `moves.hbs` (voir section 4).

## 4. Structure des onglets : 5 onglets définitifs

**Décision prise :** le véritable modèle d'onglets sur `Dialog5e` est `tabGroups` (instance) + `PARTS.tabs: { template: "templates/generic/tab-navigation.hbs" }` + `_getTabs()` + `_preparePartContext` (`context.tab = context.tabs[partId]`), dont le fonctionnement a été confirmé identique à celui de `CurrencyManager` (qui étend `Application5e`, la même base que `Dialog5e`). À l'origine, 4 onglets avaient été définis, mais **`features-and-moves` a été divisé en deux onglets indépendants**, ce qui donne la structure définitive de 5 onglets :

1. **`identity`** — Nom, image, n° du Pokédex, entrée du Pokédex.
2. **`stats`** — Ability Scores (regroupées dans des `<fieldset>` « Base Info »/« Ability Scores »/« Proficiencies »), Hit Die (`<select>`), PV totaux, niveau initial, Skill Proficiencies, Saving Throw Proficiencies, Size, Natural Armor Class.
3. **`features`** — Types, talents (feats, désormais sélectionnés via le picker du `CompendiumBrowser`, voir section 6.1), Egg Group, Gender (case à cocher + ratio avec textes de pourcentage/emoji), Speeds (y compris Fly+Hover sur une seule ligne), Special Senses.
4. **`moves`** — Capacités CT (TM), capacités Œuf (Egg Moves), et 20 niveaux fixes (1-20) de capacités avec des libellés dynamiques (« Starting Moves at Level 1 » pour le niveau 1, « Moves Learned at Level X » pour les autres). **Ils n'utilisent plus le `<multi-select>` natif** : chaque champ est désormais un picker avec un bouton « Browse Moves... » + des étiquettes supprimables, reposant sur `CompendiumBrowser.select()` (voir section 6.1).
5. **`evolution`** — Pre-Evolution, Next Evolution (avec un placeholder dynamique du nom du Fakemon et une zone de texte de description), et Evolutionary Stages (conditionnel), regroupés en 3 `<fieldset>` séparés.

Fichiers `.hbs` : `identity.hbs`, `stats.hbs`, `features.hbs`, `moves.hbs`, `evolution.hbs`.

### Bug d'« onglet actif » résolu (s'applique aux 5 onglets)

Le `.hbs` de chaque onglet doit porter la classe `cssClass` renvoyée par `_getTabs()` **sur le `<div class="tab ...">` lui-même**, pas seulement dans la barre de navigation. Modèle correct confirmé par comparaison avec les vrais templates de dnd5e :
```hbs
<div class="tab {{ tab.cssClass }}" data-group="{{ tab.group }}" data-tab="{{ tab.id }}">
```
Sans cela, aucun onglet ne s'affichait tant qu'on n'avait pas d'abord cliqué sur un autre onglet. Déjà appliqué dans les 5 `.hbs`.

## 5. Nouveaux champs ajoutés lors des sessions précédentes

### `stats.hbs`
- Les **Ability Scores** s'affichent maintenant sous forme de paire **Score (modifiable, `<input type="number">`) + Mod (lecture seule, calculé en direct par JS)**, au lieu d'un seul champ. Modèle visuel reproduit du `character-sheet-2.hbs` de dnd5e (`.mod` + `.score`). Géré par la logique de `_onRender`.
- **Hit Die** est passé d'un `<input type="number">` libre à un `<select>` aux options fixes `d4/d6/d8/d10/d12`.
- Tout est regroupé dans des `<fieldset><legend>...</legend>` (modèle natif confirmé dans `details-facility.hbs` de dnd5e) — sections : « Base Info » (taille, dé de vie, PV, niveau), « Ability Scores », « Proficiencies » (compétences + sauvegardes).
- **Skill Proficiencies** et **Saving Throw Proficiencies** : des `<multi-select>` alimentés directement depuis `CONFIG.skills`/`CONFIG.abilities`, disponibles gratuitement dans le contexte car la classe de base de `Dialog5e` injecte déjà `context.CONFIG = CONFIG.DND5E` dans `_prepareContext`.

### `features.hbs`
- **Has Gender** (`<input type="checkbox" name="hasGender" checked>`) + **Gender Ratio** (`genderRatio.female` / `genderRatio.male`, le second étant calculé automatiquement à partir du premier via JS), désormais avec les textes `% ♀️` et `% ♂️` à côté de chaque champ (`<span class="sep pk5e-gender-female-unit">`/`pk5e-gender-male-unit`) + un troisième champ caché **« Genderless »** (`readonly`, texte fixe) qui ne s'affiche que lorsque la case est décochée. Quand on décoche, les `<span>` de pourcentage/emoji sont aussi masqués avec leurs champs. Le tout est géré par la méthode `#bindGenderRatioInputs` dans `_onRender`.
- **Speeds** (`movement.walk/climb/fly/swim/burrow` + `movement.units`) et **Special Senses** (`senses.darkvision/blindsight/tremorsense/truesight` + `senses.units`), chacun regroupé dans son propre `<fieldset>`.
- **Fly + Hover sur une seule ligne** : l'`<input name="movement.fly">` partage maintenant `.form-fields` avec le `<span class="sep unit">ft.</span>`, un `<span class="sep">Is hover?</span>` et l'`<input type="checkbox" name="movement.hover">`, au lieu d'être sur des lignes séparées.
- **Size** (`<select name="size">` avec `CONFIG.actorSizes`).
- **Natural Armor Class** (`naturalArmorClass`, correspond à `attributes.ac.flat` avec `calc: "natural"` selon `CONFIG.DND5E.armorClasses.natural`).
- **Possible Abilities** (renommé de `abilities` en **`possibleAbilities`**, voir section 6.2) et **Possible Hidden Abilities** (`possibleHiddenAbilities` — **nom confirmé en lisant le vrai `data-field` du `.hbs`, et non `hiddenAbilities` comme documenté par erreur dans une version précédente de ce fichier**) : tous deux sont désormais des pickers avec un bouton « Browse Abilities... » au lieu de `<multi-select>`. **Décision confirmée par l'utilisateur :** tous deux partagent exactement le même ensemble/filtre de features éligibles (même catalogue « monster »/« ability »), la seule différence étant le champ du formulaire auquel va chaque résultat — analogie donnée par l'utilisateur : « c'est comme les capacités à apprendre au niveau 1 et au niveau 2, elles ont besoin des mêmes données ».

`movement.*`, `senses.*`, `size`, `naturalArmorClass` sont associés à l'acteur réel (voir section 12). `eggGroup` n'est toujours lu que pour la biographie (section 15), sans autre destination. **`possibleAbilities`** a désormais BIEN une destination supplémentaire : le premier UUID du tableau est résolu et intégré comme objet réel dans l'acteur (voir section 16) -- décision de l'utilisateur : « s'il y en a au moins 1, ajoute celui-là ». **`possibleHiddenAbilities` n'a toujours pas de destination en dehors de la biographie** -- point en attente non confirmé (voir section 13, point en attente n° 3).

### `evolution.hbs`

- **Restructuré en 3 `<fieldset>`** : « Pre-Evolution », « Next Evolution », « Evolutionary Stages ».
- **Has Pre-Evolution** (`hasPreEvolution`, case à cocher) + **Pre-Evolution Name** (`preEvolution`, `<input type="text">` avec placeholder), avec un champ caché en lecture seule `preEvolution.none` (« No Pre-Evolution ») qui s'affiche quand la case est décochée. Bascule gérée par `#bindEvolutionInputs`.
- **Has Next Evolution** (`hasNextEvolution`, case à cocher) + **Next Evolution Description** : bloc empilé verticalement (`pk5e-evolution-fields-stacked`, `flex-direction: column` en ligne via JS) composé de :
  - Un texte d'introduction dynamique (`<span class="pk5e-fakemon-name-placeholder">`) qui affiche « `{{Nom du Fakemon}}` can evolve into... », synchronisé en direct avec le champ `name` de `identity.hbs` (méthode `#bindFakemonNamePlaceholder`, avec repli sur le texte littéral « Fakemon » si le nom est vide).
  - Un `<textarea name="nextEvolution" rows="3">` avec un placeholder d'exemple (« Fakemon2 at level X or above... »).
  - Un champ caché en lecture seule `nextEvolution.none` (« No Next Evolution »), avec un `min-height` fixé en ligne avec `!important` (voir le bug résolu dans la section 5 précédente).
  - Quand on décoche la case, le texte d'introduction et le `textarea` sont masqués, ne laissant visible que le champ en lecture seule.
- **Evolutionary Stages** (conditionnel — visible uniquement si `hasPreEvolution` **OU** `hasNextEvolution` est coché) :
  - **Total Evolutionary Stages** (`evolutionStages`, `<input type="number">`, minimum 1) — combien de stades d'évolution compte la lignée complète de l'espèce.
  - **Current Evolutionary Stage** (`currentEvolutionStage`, `<select>` généré dynamiquement en JS selon le total saisi) : option `1` = « Initial Stage », dernière option = « Final Stage », intermédiaires = « Intermediate Stage N » (numérotées s'il y a plus d'un stade intermédiaire).
  - Le `<select>` est reconstruit en direct à chaque changement de `evolutionStages` (événement `input`), en conservant la sélection précédente si elle reste valide pour le nouveau total, ou en revenant à `1` sinon.
  - **La persistance de ces 2 champs n'est pas protégée** lorsqu'ils sont masqués/affichés (décision explicite : « ce qui est écrit dans les evolutionary stages n'est pas important »). En revanche, ce qui est écrit dans `preEvolution`/`nextEvolution` est bien préservé, car la bascule de tout le bloc est purement visuelle (`style.display`, sans re-rendu de l'onglet).
  - **NOUVEAU (cette session) :** la logique d'« étiquette de stade » (Initial/Intermediate/Final Stage) existait déjà en double dans `#bindEvolutionaryStages` (pour le `<select>` lui-même) et elle a de nouveau été nécessaire, avec la même formule, dans `#buildBiographyHtml` (section 15) pour le texte `"N / Total (Label)"`. **Elle reste dupliquée à deux endroits distincts du code** — elle n'a pas été extraite dans une méthode partagée (`#evolutionStageLabel`) lors de cette session ; c'est une amélioration mineure en attente (voir section 13).

#### Bug résolu : `input[readonly].pk5e-next-evolution-none` avec une hauteur de 14.95px au lieu de 26px

- **Symptôme :** en décochant « Has Next Evolution » (ce qui affiche le champ en lecture seule dans le conteneur empilé en colonne), sa hauteur calculée restait à `14.95px` au lieu des `26px` attendus (`--form-field-height`), même en forçant `height` avec `!important` en ligne.
- **Cause exacte pas entièrement identifiée** (voir le point en attente en section 13) — il a été confirmé empiriquement que `min-height` avec `!important` écrase bien la valeur, mais pas `height` avec `!important`.
- **Solution appliquée (définitive, pas seulement provisoire) :** `min-height: var(--input-height) !important;` en ligne sur le champ lui-même, directement dans le `.hbs`.

## 6. Séparateur visuel « ampersand » (ligne + logo doré entre la navigation des onglets et le contenu) — ✅ RÉSOLU

- **Modèle natif de dnd5e confirmé** : `<hr class="ampersand">` entre le `<nav>` des onglets et la `<section class="sheet-body">`, avec l'icône placée via `background: url(...) no-repeat center / contain` dans `less/v2/apps.less`.
- **Implémentation choisie** : réutiliser la classe `.ampersand` (pour hériter gratuitement du dégradé doré et du positionnement/de la taille) mais ne remplacer que le `background-image` en ligne via JS dans `_onRender`, en pointant vers le `pokeball.svg` du module — **sans toucher à aucun `.less`/`.css` du système ni au `styles/main.css` du module**.
- **Couleur** : le SVG de la Poké Ball est noir par défaut. Un `filter` CSS en ligne (`invert(64%) sepia(14%) saturate(563%) hue-rotate(3deg) brightness(89%) contrast(90%)`) a été appliqué pour le rendre doré.

### Bug du `<hr>` invisible dans l'onglet « moves » — ✅ RÉSOLU
Cause : `.window-content` est en flex-column ; sans `flex-shrink: 0`, Chrome écrasait le `<hr>` quand
l'onglet « moves » grandissait (bug propre à Chrome, non reproductible sous Firefox). Correctif : `flexShrink = "0"`
en ligne via JS sur le `<hr class="ampersand">`.

## 6.1. Picker de capacités/talents basé sur `CompendiumBrowser` — ✅ IMPLÉMENTÉ ET TESTÉ

**Motivation :** les `<multi-select>` natifs (22 champs de capacités + 2 de talents) dupliquaient le catalogue complet d'environ 800 capacités/features dans le DOM pour chaque champ (~17 600 nœuds DOM dans moves), sans champ de recherche. Il a été décidé de les remplacer par un modèle de picker reposant sur `dnd5e.applications.CompendiumBrowser`, vérifié de manière exhaustive en console avant d'écrire le code final.

### Comportement confirmé de `CompendiumBrowser` (vérifié dans le code source)
- `CompendiumBrowser.select(options)` renvoie une `Promise<Set<string>|null>` d'UUID et prend en charge la sélection multiple.
- `selection: { min: null, max: null }` (par défaut) = cases à cocher désactivées. Toujours passer un `max` numérique (ex. `999`) pour les activer.
- `#selected` (Set d'instance) persiste entre les re-rendus internes tant que l'instance existe.
- `additional: { subtype: { ability: 1 } }` (format `{ valeur: 1 }`) filtre correctement l'ensemble des capacités/talents.

### Implémentation finale confirmée fonctionnelle à l'exécution

- Chaque champ picker (`moves.tm`, `moves.egg`, `moves.level.{1-20}`, `possibleAbilities`, `possibleHiddenAbilities`) est un conteneur `<div class="pk5e-move-picker" data-field="{{nomDuChamp}}">` avec :
  - Un `<button type="button" data-action="openCompendiumPicker" data-filter-type="move|ability">Browse...</button>`.
  - Un `<div class="pk5e-move-picker-tags tags">` où les résultats sont affichés sous forme d'étiquettes supprimables.
  - Des champs cachés (`<input type="hidden" name="{{nomDuChamp}}" value="{{uuid}}">`) pour chaque UUID sélectionné — même `name` répété, pour que `FormDataExtended`/`expandObject` les regroupent dans un tableau.
- `#onOpenCompendiumPicker(event, target)` : résout `picker`/`fieldName` via `target.closest("[data-field]")`, appelle `CompendiumBrowser.select({ filters, selection: { min: null, max: 999 } })`, résout les nouveaux UUID en noms, les fusionne dans une `Map` d'instance (`#pickerSelections`, une par `fieldName`) pour ne pas perdre les sélections précédentes du même champ, et appelle `#renderPickerTags` pour afficher les étiquettes + champs cachés.
- **Confirmé et réellement utilisé dans la biographie (section 15) :** `fieldName` provient toujours de `picker.dataset.field` (l'attribut `data-field` dans le `.hbs`), et correspond exactement entre l'écriture (`#onOpenCompendiumPicker`) et la lecture (`#renderPickerTags` et désormais aussi `#buildBiographyHtml`) — vérifié en lisant le corps complet des deux méthodes et les vrais `data-field` de `moves.hbs`/`features.hbs`.
- `#onSubmit` utilise `this.#pickerSelections.get(fieldName)` (une `Map<uuid, name>` déjà résolue en mémoire) pour obtenir les noms des capacités/talents dans la biographie, **au lieu de rappeler `fromUuid()`** — décision confirmée par l'utilisateur pour des raisons de performance/simplicité.

## 6.2. Collision du nom `"abilities"` — ✅ RÉSOLUE

Le `<multi-select>` (désormais picker) de « Possible Abilities » dans `features.hbs` utilisait `name="abilities"`, ce qui entrait en conflit avec `data.abilities` (les 6 Ability Scores de l'acteur) utilisé dans `#onSubmit`. **Résolu :** renommé en `possibleAbilities` dans le HTML. Le champ « Possible Hidden Abilities » utilise `possibleHiddenAbilities` (voir la correction de nom en section 5).

## 6.3. UUID de types codés en dur dans `fakemonCreationForm.js` — ✅ IMPLÉMENTÉ

**Décision prise :** au lieu de modifier `POKEMON_TYPES`/`addPokemonSystemProperties.js` (qui reste utilisé tel quel pour `CONFIG.DND5E.damageTypes` et pour alimenter le `<multi-select>` des types dans `features.hbs`), une nouvelle constante distincte a été ajoutée **uniquement dans `fakemonCreationForm.js`** :

```js
const POKEMON_TYPE_UUIDS = {
	bug: "Compendium.fr_pokemon_5e.pokemon_features.Item.jK466h0FxTM3E9y5",
	dark: "Compendium.fr_pokemon_5e.pokemon_features.Item.0ImTngm94sacmzTJ",
	// ...les 18 vrais types, SANS "typeless" (il n'a pas d'objet réel dans le compendium)
};
```

On stocke l'**UUID complet** (`"Compendium.fr_pokemon_5e.pokemon_features.Item.{id}"`), pas l'ID seul, pour l'utiliser directement dans `@UUID[...]{Label}` dans la biographie sans reconstruire la chaîne. Il ne sert que de dictionnaire de correspondance `slug → UUID` dans `#buildBiographyHtml` (section 15), jamais pour alimenter un `<select>`/`<multi-select>` (ceux-ci continuent d'utiliser `POKEMON_TYPES` tel quel, voir section 6.4).

## 6.4. Bug : `<multi-select name="pokemonTypes">` enregistrait des index numériques au lieu des slugs — ✅ RÉSOLU

- **Symptôme confirmé en console :** `data.pokemonTypes` arrivait sous la forme `["0", "17"]` (index du tableau `POKEMON_TYPES`) au lieu de `["fire", "water"]` (les vrais slugs), ce qui cassait toute recherche ultérieure dans `POKEMON_TYPE_UUIDS[slug]`.
- **Cause confirmée par comparaison avec le vrai modèle de `dnd5e` :** le helper `selectOptions` (du *cœur* de Foundry, pas de `dnd5e`), lorsqu'il reçoit un **tableau simple de chaînes** sans indiquer explicitement quoi utiliser comme `value`, utilise l'**index numérique** du tableau comme `value` de chaque `<option>` générée — et non la chaîne elle-même. `dnd5e` ne passe jamais de tableau simple de chaînes à `selectOptions` dans ce but ; il utilise toujours des objets/`Record` avec une clé sémantique, ou bien évite le helper et utilise un `{{#each}}` manuel avec `<option value="{{ @key }}">`.
- **Tentative infructueuse :** `{{ selectOptions pokemonTypes valueAttr=false }}` — n'a pas corrigé le problème (le paramètre n'existe pas ou ne se comporte pas comme prévu dans cette version du helper du cœur).
- **Correctif définitif appliqué et confirmé fonctionnel :** remplacer le `selectOptions` par un `{{#each}}` manuel dans `features.hbs` :
  ```hbs
  <multi-select name="pokemonTypes">
  	{{#each pokemonTypes}}
  	<option value="{{ this }}">{{ this }}</option>
  	{{/each}}
  </multi-select>
  ```
- Il n'a pas été nécessaire de toucher à `_prepareContext` ni à `POKEMON_TYPES`/`addPokemonSystemProperties.js` — le `.filter(type => type !== "typeless")` qui existait déjà dans `_prepareContext` fonctionne toujours, seule la manière d'afficher les `<option>` dans le `.hbs` a changé.
- **Note (version française) :** `_prepareContext` fournit désormais des objets `{ value, label }` (slug + nom français du type) et le template utilise `<option value="{{ this.value }}">{{ this.label }}</option>` ; la valeur envoyée reste le slug.

## 7. Bugs trouvés et corrigés

1. **`#bindAbilityModCalculation` appelé mais non défini comme méthode** — corrigé, la logique a été intégrée directement dans `_onRender`.
2. **`this` incorrect dans `#onSubmit` (gestionnaire de formulaire statique)** — corrigé, `this.#calculateHitPointsAdvancement`/`this.#HP_STATUS` remplacés par `FakemonCreationDialog.#calculateHitPointsAdvancement`/`FakemonCreationDialog.#HP_STATUS`.
3. **Logique de `disabled` inversée dans `#bindGenderRatioInputs`** — corrigé, `genderlessInput.disabled = true` fixe.
4. **`context.availableMoves?.sort is not a function`** — corrigé, en enveloppant avec `Array.from(...)` avant `.sort()`.
5. **Séparateur « ampersand » invisible sous Chrome dans l'onglet « moves »** — voir section 6, cause réelle : flex-shrink de Flexbox, résolu avec `flexShrink = "0"` en ligne.
6. **`min-height` explicite manquant sur le champ en lecture seule de « Next Evolution »** — voir section 5, résolu avec `min-height !important` en ligne.
7. **Formulaire sans bouton d'envoi visible** — cause : `FakemonCreationDialog.DEFAULT_OPTIONS` ne définissait pas la propriété `buttons`, donc `Dialog5e._prepareFooterContext` (qui fait `this.options.buttons?.map(...)`) renvoyait `context.buttons = undefined`. **Corrigé :** ajout de `buttons: [{ action: "submit", icon: "fa-solid fa-check", label: "Create Fakemon", type: "submit" }]` à `DEFAULT_OPTIONS`, selon le modèle de `TransformDialog`.
8. **`CompendiumBrowser.select({ selection: { min: null, max: null } })` n'affichait pas les cases à cocher.** Cause confirmée en lisant `displaySelection()` à l'exécution : les deux à `null` équivaut à « sélection désactivée ». **Corrigé :** toujours passer un `max` numérique (`max: 999`) dans les appels du picker (voir section 6.1).
9. **En cliquant sur « Create Fakemon », la page se rechargeait entièrement (l'URL devenait un GET avec tous les champs en paramètres de requête).** Cause confirmée avec une macro comptant les vrais `<form>` dans le DOM : `FakemonCreationDialog` définit `tag: "form"` dans ses `DEFAULT_OPTIONS` (hérité aussi de `Dialog5e`), mais `Dialog5e.DEFAULT_OPTIONS.window.contentTag` vaut aussi `"form"` par défaut — cela générait un `<form class="window-content standard-form">` **imbriqué dans** le `<form>` racine de l'application (HTML invalide), ce qui faisait que le navigateur interceptait l'envoi natif avant l'exécution de `form.handler` (`#onSubmit`). **Corrigé :** ajout de `contentTag: "div"` dans `window` des `DEFAULT_OPTIONS` de `FakemonCreationDialog`, supprimant le `<form>` imbriqué.
10. **`TypeError: can't access property "con", data.abilities is undefined` dans `#onSubmit`.** Cause confirmée en comparant avec **tous** les vrais consommateurs de `FormDataExtended` dans `dnd5e` (`TransformDialog#handleFormSubmission`, `ActivityUsageDialog#_prepareSubmitData`, `PseudoDocumentSheet#_prepareSubmitData`, `AdvancementConfig#_updateObject`) : sans exception, tous appellent `foundry.utils.expandObject(formData.object)` avant de lire des champs imbriqués, car `formData.object` est **plat** (clés littérales avec des points, ex. `"abilities.str.value"`), et non imbriqué. `#onSubmit` faisait `const data = formData.object;` sans l'étendre. **Corrigé :** `const data = foundry.utils.expandObject(formData.object);`.
11. **`TypeError: can't access property "sheet", actor is undefined` après une tentative de création avec un `name` vide.** Cause : `Actor.create(actorData, ...)` peut renvoyer `undefined` (échec de validation du cœur, sans rejeter la promesse) sans que le code ne le détecte, et le flux continuait en essayant `actor.sheet.render(true)` sur `undefined`. **Corrigé :** ajout d'une garde `if (!actor) { pk5eLog(...); ui.notifications.error(...); return; }` immédiatement après `Actor.create`.
12. **`img: does not have a valid file extension`** — voir le détail en section 15.
13. **`<multi-select name="pokemonTypes">` enregistrait des index au lieu des slugs** — voir le détail en section 6.4
14. **La classe « Pokémon Level » était toujours créée au niveau 0** (`system.levels: 0`), décision initiale erronée pour éviter une supposée « duplication » avec `attributes.hd.max`. Cause réelle confirmée en lisant `NPCData#prepareBaseData` : pour chaque objet de classe, `details.level`/`attributes.hd.max` sont **additionnés** (`+=`), et non écrasés -- avec `levels: 0`, la classe n'apportait jamais de niveau à l'acteur. **Corrigé :** `system.levels: Number(data.minLevel) || 1`, de sorte que le `details.level` de l'acteur soit égal à `minLevel`, comme attendu.

## 8. Décision d'UX : aucune recherche/aucun filtre textuel supplémentaire au-delà du picker

On a évalué (puis écarté à l'époque) l'idée de reproduire tout le système de recherche du `CompendiumBrowser` directement sur les `<multi-select>` natifs. **Le problème a été résolu autrement :** au lieu d'ajouter une recherche au `<multi-select>`, on a remplacé entièrement le `<multi-select>` par le picker du `CompendiumBrowser` (section 6.1), qui inclut déjà gratuitement sa propre recherche et ses propres filtres natifs. Il ne faut plus proposer de recherche personnalisée supplémentaire sauf demande explicite.

## 8.1. Décision d'UX : pas de filtrage des niveaux de capacités selon le niveau minimum

On a évalué la possibilité de conditionner les niveaux (1-20) affichés dans `moves.hbs` à la valeur de `minLevel` (`stats.hbs`). Cela nécessiterait de re-rendre l'onglet, en perdant les sélections déjà faites dans les pickers concernés. **Décision : on accepte cette perte et on ne l'implémente pas pour l'instant** — « ce créateur de fakemon est tout simple, le plus simple possible ». Reste une amélioration future.

**Remarque liée confirmée dans cette session :** dans la biographie, « Starting » (« Départ » en français ; niveau minimum/initial) est considéré comme équivalent à `moves.level.{minLevel}` — confirmé explicitement par l'utilisateur (voir section 15).

## 9. Le problème central : PV dynamiques pour les PNJ avec classes

**Pourquoi c'est important :** dans `dnd5e`, les PV maximum d'un PNJ ne sont recalculés dynamiquement lors d'un changement de CON que si le PNJ possède un objet de classe intégré avec une progression (advancement) `HitPoints`. Les Pokémon (bestiaire officiel) ont des PV fixes prédéfinis qui ne suivent pas toujours linéairement la progression des dés de vie par niveau, d'où l'existence de `NpcHpFixer`.

**Mécanisme confirmé dans le code source de `dnd5e` :**
- `HitPointsAdvancement.valueForLevel(data, hitDieValue, level)` : `"max"` → `hitDieValue` ; `"avg"` → `(hitDieValue/2)+1` ; nombre → valeur littérale.
- `HitPointsAdvancement.getAdjustedTotal(mod)` : additionne `Math.max(valueForLevel(level) + mod, 1)` pour chaque niveau de `value`.
- **Détail critique :** pour un PNJ, `HitPointsAdvancement.hitDie` utilise `actor.system.attributes.hd.denomination` (nombre simple, ex. `12`), et non `item.system.hd.denomination` (chaîne avec « d », ex. `"d12"`). Ne pas mélanger les deux formats.
- `AttributesFields.prepareHitPoints` traite le `hp.max` des données sources comme un décalage de base (`hp.max = (hp.max ?? 0) + base + bonus`) — compatible avec la conception actuelle de `actorData.system.attributes.hp`.
- Lors de la création de l'objet de classe intégré (en attente, section 13), il faut utiliser `actor.createEmbeddedDocuments("Item", [...], { keepId: true })`, selon le même modèle que celui utilisé par l'`AdvancementManager` du système pour appliquer les changements.

**Décision prise :** le formulaire calcule et attribue les PV directement à la création via `#calculateHitPointsAdvancement` (renvoie `{ value, hpBonus }`), en réutilisant la même logique de correction (`CORRECTED`/`UNCORRECTABLE`) que le `NpcHpFixer` existant. **✅ Fonctionnement confirmé à l'exécution** : testé avec `desiredHP: 0` (cas invalide, correctement interrompu avec un message à l'utilisateur, sans fermer la boîte de dialogue) et avec des PV valides, acteur créé avec succès.

**✅ RÉSOLU (session 3) :** l'objet de classe intégré « Pokémon Level » (« Niveau de Pokémon » dans la version française) est désormais créé dans `#onSubmit`, avec `system.advancement: [{ type: "HitPoints", configuration: {}, value: hpResult.value }]` et `system.hd.denomination: \`d${hitDieValue}\``. Confirmé avec des données réelles (Gatomon, PV souhaités 13, dé de vie 6, CON +2) : avant le correctif, `system.attributes.hp.max` restait à `5` (le `hpBonus` seul, sans aucun objet de classe apportant la `base`) ; après la création de l'objet, les PV finaux correspondent aux PV souhaités. Le `system.levels` de l'objet est fixé à `minLevel` (bug n° 14, section 7) pour que le `details.level` de l'acteur reflète le niveau réel du Fakemon. Voir l'implémentation complète en section 16.

Voici la suite à partir du point 10, prête à copier-coller à partir de l'endroit où s'arrêtait ton fragment :

## 10. Décisions déjà arrêtées sur le contenu du formulaire

| Type de donnée | Décision |
|---|---|
| Capacités (Moves) | Sélection depuis les compendiums existants (`fr_pokemon_5e.pokemon_moves`) via le picker du `CompendiumBrowser` (voir section 6.1), pas de `<multi-select>`. Capacités CT, capacités Œuf, et **20 niveaux fixes (1-20)** toujours visibles avec des libellés dynamiques. |
| Features/talents (feats) | Sélection depuis le compendium `fr_pokemon_5e.pokemon_features` via le picker du `CompendiumBrowser`, filtrée par `system.type.value === "monster"` et `subtype: "ability"`. « Possible Abilities » (`possibleAbilities`) et « Possible Hidden Abilities » (`possibleHiddenAbilities`) partagent le même ensemble/filtre — décision confirmée par l'utilisateur. |
| Egg Group | Liste d'options typiques (`<multi-select>`, valeurs déjà mises en majuscules comme texte d'affichage, ex. « Water 1 », « No Eggs Discovered » ; en français : « Aquatique 1 », « Inconnu »…) |
| Sexe/ratio | Case à cocher « Has Gender » + deux champs numériques (`genderRatio.female`/`.male`) + mode « Genderless » en lecture seule. Dans la biographie, affiché sous forme de fraction réduite par PGCD + arrondi au pas canonique Pokémon le plus proche (voir section 15). |
| Évolution (pré/post) | Texte libre uniquement, sans lien vers l'UUID d'un acteur réel. Cases « Has Pre-Evolution »/« Has Next Evolution » + champ conditionnel des stades d'évolution. Dans la biographie, on affiche le texte libre + une étiquette de stade (« N / Total (Initial/Intermediate/Final Stage) »). |
| Biographie | Données simples saisies dans le formulaire ; HTML généré dans le code (`#buildBiographyHtml`, voir section 15), enregistré tel quel (sans résoudre les `@UUID[...]`) dans `system.details.biography.public`. « Species Rating (SR) » et « Species Traits » de l'ancienne macro sont explicitement exclus — le SR ne sert qu'à fixer `details.cr = 0`, et Species Traits n'a pas de champ équivalent dans le formulaire actuel, il n'est donc ni demandé ni affiché. |
| SR / CR | Jamais demandé à l'utilisateur. `details.cr` reste toujours fixé à `0`, décision arrêtée depuis la session précédente. |
| `details.type` (type de créature) | Non défini explicitement — reste vide/par défaut (`CreatureTypeField` accepte `value: ""` vide). |

## 11. Flux complet de `#onSubmit` (état à la fin de cette session)

1. `event.preventDefault()` implicite grâce à la garde du `<form>` non imbriqué (voir section 7, bug n° 9).
2. `const formData = new FormDataExtended(this.element);` suivi de `const data = foundry.utils.expandObject(formData.object);` (correctif du bug n° 10).
3. `pk5eLog("pk5e (fakemon creation): Form submitted", data);` — log de débogage, conservé.
4. **Validation des champs obligatoires** (`name`, `pokedexNumber`, `pokedexEntry`, `size`, `hitDie`, `hpBase`, `minLevel`, `naturalArmorClass`, les 6 ability scores) : s'il en manque, `ui.notifications.warn(...)` liste TOUS les champs manquants d'un coup, sans fermer la boîte de dialogue. **Nouveau dans cette session** (voir section 16).
5. `FakemonCreationDialog.#calculateHitPointsAdvancement(...)` → `{ value, hpBonus }`, en réutilisant la logique de `NpcHpFixer` (voir section 9). Si le résultat est invalide (`desiredHP <= 0`), on interrompt avec `ui.notifications.error(...)` sans fermer la boîte de dialogue.
6. `const biographyHtml = this.#buildBiographyHtml(data);` — génère le HTML complet de la biographie (voir section 15).
7. Validation de `img` : regex d'extension d'image sur `data.img` ; si elle ne correspond pas, `validImg = undefined` (correctif du bug n° 12, section 7).
8. Construction de `actorData` avec `type: "npc"`, `img: validImg`, `system.attributes.hp/movement/senses/ac`, `system.abilities` (y compris `proficientSaves` déjà fusionné dans `abilities.{key}.proficient`), `system.skills`, `system.traits.size`, `system.details.cr = 0`, `system.details.biography.public = biographyHtml`.
9. `const actor = await Actor.create(actorData, { renderSheet: false });` + garde `if (!actor) { ...; return; }` (correctif du bug n° 11, section 7).
10. **✅ Implémenté (session 3) :** construction et `createEmbeddedDocuments("Item", [...])` en un seul appel avec : l'objet de classe « Pokémon Level » (`HitPointsAdvancement`, section 9), les objets de type (`POKEMON_TYPE_UUIDS`, section 6.3), le premier objet de `possibleAbilities` (s'il y en a un), et les 4 premiers objets de `moves.level.*` (ordre croissant de niveau) + Struggle (Lutte) obligatoire. Voir le détail complet en section 16.
11. `actor.sheet.render(true);`.
12. `try/catch` général enveloppant toute la méthode, avec `console.error` + `ui.notifications.error` générique pour toute exception imprévue.

## 12. Séparation conceptuelle : champs qui vont dans l'acteur réel vs champs qui ne vont que dans la biographie

Il est important de ne pas confondre ces deux destinations en continuant d'associer les points en attente (section 13) :

- **Vont dans l'acteur réel (`actorData.system.*`)** : `name`, `img` (validé), `folder`, `attributes.hp/movement/senses/ac`, `abilities` (les 6 caractéristiques, avec `proficientSaves` fusionné dans `abilities.{key}.proficient` -- ✅ confirmé, section 13), `skills`, `traits.size`, `details.cr`, `details.biography.public` (le HTML généré).
- **Vont dans l'acteur réel sous forme d'objets intégrés** (`createEmbeddedDocuments`, section 16) : le niveau minimum/dé de vie/PV via l'objet de classe « Pokémon Level » (`hitDie`, `hpBase`, `minLevel`), `pokemonTypes` (un par type), le premier UUID de `possibleAbilities`, et les 4 premiers `moves.level.*` + Struggle obligatoire.
- **Vont UNIQUEMENT dans la biographie (`#buildBiographyHtml`), sans autre destination dans l'acteur** : `pokedexNumber`, `pokedexEntry`, `possibleHiddenAbilities` (reste à confirmer s'il faut un objet propre, voir section 13, point en attente n° 3), `eggGroup`, `genderRatio.*`/`hasGender`, `moves.tm`/`moves.egg` et le reste des niveaux de `moves.level.*` non intégrés, `hasPreEvolution`/`preEvolution`, `hasNextEvolution`/`nextEvolution`, `evolutionStages`/`currentEvolutionStage`, `naturalArmorClass` (apparaît dans la biographie comme texte informatif, bien que sa valeur numérique alimente aussi `attributes.ac.flat`). Remarque : `pokemonTypes` et `possibleAbilities` apparaissent désormais À LA FOIS dans la biographie (texte/`@UUID[...]`) ET intégrés comme objets réels -- ce n'est pas mutuellement exclusif.

## 13. Points en attente et état de l'association vers l'acteur

### Instantané de l'association (ne répète pas la section 12, uniquement ce qui manque)

Tout ce qui est **déjà associé** à `actorData` (acteur réel) ou utilisé dans la biographie est décrit en section 12. Seule destination finale en attente :

- `proficientSaves` → `system.abilities.{key}.proficient` — non confirmé que ce soit toujours en vigueur dans `#onSubmit` (point bloquant n° 1, ci-dessous).
- Objet de classe intégré avec `HitPointsAdvancement` — toujours un `// todo:` littéral, non implémenté (point bloquant n° 2, ci-dessous).
- `possibleHiddenAbilities` — aucune destination au-delà du texte de la biographie (point bloquant n° 3, ci-dessous).

### 🔴 Bloquants / plus importants

1. **✅ RÉSOLU.** `proficientSaves` est fusionné dans `system.abilities.{key}.proficient` dans `#onSubmit`, confirmé dans le code.
2. **✅ RÉSOLU (session 3).** Objet de classe « Pokémon Level » intégré avec `HitPointsAdvancement`, avec `levels: minLevel` (bug n° 14 corrigé, section 7). Voir l'implémentation en section 16.
3. **🟡 PARTIEL / NON CONFIRMÉ.** `possibleAbilities` a déjà une destination sous forme d'objet intégré (uniquement le premier UUID). **`possibleHiddenAbilities` n'a toujours pas de destination en dehors de la biographie** -- il n'a pas été confirmé avec l'utilisateur s'il faut aussi un objet intégré propre, ou si la décision finale est de le laisser comme simple texte informatif. **Ne pas supposer, demander d'abord.**

### 🟡 Qualité de la biographie

4. **✅ RÉSOLU.** L'utilisateur a corrigé directement le format de la biographie (gras, centrages, ordre des données) sans nécessiter d'autres modifications du code.

### 🟢 Mineurs / cosmétiques

5. **Duplication de la logique d'étiquette de stade d'évolution** (Initial/Intermediate/Final Stage) entre `#bindEvolutionaryStages` (`<select>` du formulaire) et `#buildBiographyHtml` (texte de la biographie) — candidate à une extraction dans une méthode partagée `#evolutionStageLabel(current, total)`.
6. **Cause racine exacte non identifiée** du bug de `min-height` sur `input[readonly].pk5e-next-evolution-none` (section 5) — la solution appliquée fonctionne ; on n'a pas cherché pourquoi `height !important` ne suffisait pas alors que `min-height !important` fonctionnait.
7. Mise en forme générale de `features.hbs` (aucune amélioration visuelle précise identifiée, seulement mentionnée comme finition future possible).

### En reprenant à la prochaine session, dans cet ordre

1. Point n° 3 (`possibleHiddenAbilities`) — seul point réellement en attente, demander avant de supposer.
2. Points n° 5/6/7 (mineurs/cosmétiques) — seulement s'il reste du temps, non bloquants.

## 15. Générateur de biographie — `#buildBiographyHtml` (implémenté dans cette session)

### Portée et exclusions confirmées par l'utilisateur

- Couvre : le Pokédex (numéro + entrée), les types (avec de vrais `@UUID[...]` via `POKEMON_TYPE_UUIDS`, section 6.3), le tableau des valeurs de caractéristique + modificateurs, la taille (libellé via `CONFIG.DND5E.actorSizes[key].label`), le niveau minimum, la CA naturelle, les PV initiaux, les vitesses et sens spéciaux (en omettant ceux qui valent `0`), les maîtrises de jets de sauvegarde et de compétences (libellés via `CONFIG.DND5E.abilities`/`CONFIG.DND5E.skills`, déjà pré-localisés par `dnd5e` lui-même au démarrage du jeu — confirmé en lisant le hook `i18nInit` + `performPreLocalization` du code source de `dnd5e`), les capacités (Départ = `moves.level.{minLevel}`, puis les niveaux supérieurs, puis les CT, puis les capacités Œuf, dans cet ordre final), le sexe (fraction réduite par PGCD + arrondi aux pas canoniques Pokémon —0/12.5/25/…/100—, en laissant la fraction « inhabituelle » telle quelle s'il n'y a pas de pas suffisamment proche), et l'évolution (texte libre de `preEvolution`/`nextEvolution` + étiquette de stade `"N / Total (Initial/Intermediate/Final Stage)"`).
- **Exclut explicitement et volontairement** (décision arrêtée par l'utilisateur) : « Species Rating (SR) » et « Species Traits » de l'ancienne macro — aucun des deux n'a de champ équivalent dans le formulaire actuel et il n'est pas prévu d'en ajouter.
- Lit les noms des capacités/talents depuis `this.#pickerSelections.get(fieldName)` (`Map<uuid, name>` déjà résolue en mémoire), sans jamais rappeler `fromUuid()` — décision de performance confirmée par l'utilisateur (section 6.1).
- Le HTML est enregistré brut (avec des `@UUID[...]` non résolus) dans `system.details.biography.public` ; l'enrichissement en vrais liens se fait au moment du rendu de la fiche, pas à l'enregistrement (confirmé en lisant le `npc-biography.hbs` de `dnd5e`, qui utilise `{{{ enriched.public }}}`).
- **Version française :** les libellés générés suivent le format des biographies traduites du compendium (« Informations sur l'espèce », « Espèce : », « Numéro du Pokédex : », …, « Capacités : ») et la liste des capacités utilise « Départ : », « Niveau X : », « CT : », « Œuf : », que le gestionnaire de capacités (`inputMoveManager.js`) sait analyser.

### Bugs résolus pendant la construction de la biographie

- **`img: does not have a valid file extension`** (bug n° 12, section 7) — découvert en testant avec une URL externe de wiki sans extension d'image à la fin du chemin.
- **`pokemonTypes` enregistrait des index au lieu des slugs** (bug n° 13 / section 6.4) — découvert en inspectant le vrai log de `data.pokemonTypes` (`["0", "17"]`) avant d'essayer de résoudre `POKEMON_TYPE_UUIDS[slug]`.

### État de la qualité à la fin de la session

L'utilisateur a confirmé que la biographie générée fonctionne de bout en bout (testé avec un vrai Fakemon, « Gatomon », y compris des types avec des `@UUID[...]` correctement résolus à l'affichage de la fiche), mais a indiqué qu'« il manque encore pas mal de choses » en matière de qualité/complétude, sans détailler les points précis avant la fin de la session. Il ne faut pas supposer ce qui manque exactement — c'est le premier point à soulever la prochaine fois (voir section 13).

## 16. Objets intégrés dans l'acteur — classe, types, talent et capacités (implémenté en session 3)

**Motivation :** jusqu'à la session précédente, `Actor.create` ne générait aucun objet réel intégré -- les PV étaient faux (section 9) et ni les types, ni les talents, ni les capacités n'existaient en tant qu'objets jouables sur la fiche, seulement comme texte/liens dans la biographie.

### Objet de classe « Pokémon Level »

- `system.levels: Number(data.minLevel) || 1` -- reflète le niveau minimum du Fakemon (bug n° 14, section 7).
- `system.hd.denomination: \`d${hitDieValue}\`` et `system.advancement: [{ type: "HitPoints", configuration: {}, value: hpResult.value }]` -- `hpResult.value` est la même table `value` déjà calculée par `#calculateHitPointsAdvancement` (section 9), réutilisée sans modification.
- `img` toujours fixé à `"https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/others/lv.svg"` (décision de l'utilisateur, n'utilise pas l'`img` de l'acteur).
- **Version française :** l'objet est nommé « Niveau de Pokémon » ; le `NpcHpFixer` reconnaît les classes dont le nom contient « Niveau » ou « Level ».

### Objets de type

- Un pour chaque slug de `data.pokemonTypes`, résolu via `fromUuid(POKEMON_TYPE_UUIDS[slug])` et cloné avec `.toObject()`.

### Objet de talent

- Seul le **premier** UUID de `data.possibleAbilities` (s'il y en a au moins un) est résolu et intégré. Les autres « talents possibles » restent uniquement dans la biographie. `possibleHiddenAbilities` n'a PAS d'objet intégré (voir section 13, point en attente n° 3, non confirmé).

### Objets de capacité

- On collecte les UUID de `data.moves.level.*` par ordre croissant de niveau (à partir de `minLevel`), on prend les 4 premiers, et on ajoute toujours `"Compendium.fr_pokemon_5e.pokemon_moves.Item.53VnJUr12moqMJim"` (Struggle, « Lutte » en français) -- dédoublonné avec un `Set`. `moves.tm`/`moves.egg` ne sont PAS inclus dans ce décompte des « 4 premiers » et ne sont pas intégrés.
- Tous les objets (classe, types, talent, capacités) sont créés en un seul `actor.createEmbeddedDocuments("Item", [...])`.

## 17. Validation des champs obligatoires (implémentée en session 3)

- Champs obligatoires : `name`, `pokedexNumber`, `pokedexEntry`, `size`, `hitDie`, `hpBase`, `minLevel`, `naturalArmorClass`, et les 6 ability scores (`abilities.{str,dex,con,int,wis,cha}.value`).
- S'il en manque, ils sont TOUS listés d'un coup dans un seul `ui.notifications.warn(...)` (on ne s'arrête pas au premier), et on interrompt sans fermer la boîte de dialogue.
- **Note de conception non confirmée (signalée par l'auteur, non bloquante) :** la vérification utilise `!valeur`, donc un `0` explicite dans un champ numérique (ex. `naturalArmorClass: 0`) serait traité comme « manquant ». On a supposé qu'aucun champ n'a de sens légitime à `0` pour un Fakemon jouable -- non confirmé explicitement par l'utilisateur, mais pas non plus signalé comme problème après le test.

## 18. Traduction en anglais (session 3)

- Tous les commentaires en ligne, les `pk5eLog(...)` et les messages `ui.notifications` qui étaient en espagnol dans `fakemonCreationForm.js` ont été traduits en anglais, en conservant la même structure/le même ton.
- « Pokédex » a été laissé sans traduction (nom propre de la franchise, pas un mot espagnol du texte lui-même).
- **Version française :** les textes affichés à l'utilisateur (libellés, notifications, biographie générée) ont ensuite été traduits en français ; les commentaires de code et les logs de console restent en anglais.
