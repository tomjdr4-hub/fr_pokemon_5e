import { NpcHpFixer } from "./applications/helpersMenu/helpers/npcHpFixer/npcHpFixer.js";
import { FakemonCreationDialog } from "./applications/fakemonCreationForm/fakemonCreationForm.js";

//* Definitions and Variables
import { pk5eLog } from "./utils/logs.js";
const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
const formatPropertyName = (string) => string.split("_").reduce((acc, word) => `${acc} ${capitalize(word)}`, "").trim();
export const POKEMON_TYPES = ["typeless", "steel", "water", "bug", "dragon", "electric", "ghost", "fire", "fairy", "ice", "fighting",	"normal", "grass", "psychic", "rock", "dark", "ground", "poison", "flying"];
const POKEMON_STANDARD_LANGUAGUES = ["kantoan", "johtoan", "hoennese", "sinnohan", "unovan", "kalosian", "alolan", "galarian", "paldean"];
const POKEMON_EXOTIC_LANGUAGUES = ["unown", "pokemon"];
const POKEMON_CONDITIONS = ["asleep", "burned", "frozen", "paralyzed", "poisoned", "confused", "flinched"]; // No están: ["poisoned_badly", "fainted"]
const POKEMON_CONDITIONS_REFERENCES = {
	asleep: "Compendium.fr_pokemon_5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.dbEFGKXeoIM9V9WZ",
	burned: "Compendium.fr_pokemon_5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.s9ZnlAxt05BvQi3y",
	frozen: "Compendium.fr_pokemon_5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.IB2TcccVMplAoHgr",
	paralyzed: "Compendium.fr_pokemon_5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.znhZDTB3NO7hgyHq",
	poisoned: "Compendium.fr_pokemon_5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.mGwSRQnixsPaH84o",
	confused: "Compendium.fr_pokemon_5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.uAmocf1N2gcBf24K",
	flinched: "Compendium.fr_pokemon_5e.rules.JournalEntry.gjYM3eODnlkQT2IS.JournalEntryPage.SbZkNPk5D8VpsYJq"
}
const POKEMON_TYPE_LABELS = {
	steel: "Acier", water: "Eau", bug: "Insecte", dragon: "Dragon", electric: "Électrik", ghost: "Spectre",
	fire: "Feu", fairy: "Fée", ice: "Glace", fighting: "Combat", normal: "Normal", grass: "Plante",
	psychic: "Psy", rock: "Roche", dark: "Ténèbres", ground: "Sol", poison: "Poison", flying: "Vol"
};
const POKEMON_LANGUAGE_LABELS = {
	kantoan: "Kantonien", johtoan: "Johtien", hoennese: "Hoennien", sinnohan: "Sinnohien", unovan: "Unysien",
	kalosian: "Kalosien", alolan: "Alolien", galarian: "Galarien", paldean: "Paldéen", unown: "Zarbi", pokemon: "Pokémon"
};
const POKEMON_CONDITION_LABELS = {
	asleep: "Endormi", burned: "Brûlé", frozen: "Gelé", paralyzed: "Paralysé", poisoned: "Empoisonné", confused: "Confus", flinched: "Apeuré"
};
const CURRENCY_NAMES_FORMATTED = {
	pokeyen: "Pokéyen",
	pokedollars: "Pokédollars"
}
const PK5E_PREFIX = {
	forLabels: "(pk5e)",
	forProperties: "pokemon"
	// Me di cuenta de esto muy tarde. En vez de usar el prefijo "pokemon" para las propiedades; que ocupa 7 caracteres de longitud, podría haber usado "pk5e" que solo ocupa 4.
	// Esto es importante porque hay algunas propiedades que no pueden tener nombres muy largos, y si el prefijo (que es para diferenciarlo de otras propiedades similares) es largo de por sí, menos caracteres quedarán para el nombre de la propiedad.
	// Sin embargo, como al inicio decidí colocarle pokemon, ahora no se puede cambiar ya que eso haría que todos los pokémon que existen actualmente en los mundos de todos los jugadores dejen de funcionar correctamente.
	// Así que ni modo, nos quedaremos con el prefijo "pokemon" aunque ocupe muchos caracteres. Igualmente no está tan mal. Aunque hubiera sido bonito que fuera solo "pk5e".

	// todo: Ahora que tenemos los helpers, sí podríamos llegar a corregir esto en algún momento.
};

//* Initializations and Loaded Settings (Init Hook)
Hooks.once("init", () => {
	pk5eLog("pk5e (init): Settings Loaded");

	// Pokemon Types
	const theDndDamageTypesWillBeRemoved = game.settings.get("fr_pokemon_5e", "removeDndDamageTypes");
	{
		let labelPrefix = PK5E_PREFIX.forLabels;
		if (theDndDamageTypesWillBeRemoved) {
			labelPrefix = "";
			for (const damageType in CONFIG.DND5E.damageTypes) {
				if (!damageType.startsWith(PK5E_PREFIX.forProperties)) delete CONFIG.DND5E.damageTypes[damageType];
			}
		}
		const theTypeWordWillBeRemoved = game.settings.get("fr_pokemon_5e", "removeTypeWord");
		const typeWord = theTypeWordWillBeRemoved ? "" : "Type";
		POKEMON_TYPES.forEach(type => {
			CONFIG.DND5E.damageTypes[`${PK5E_PREFIX.forProperties}_${type}`] = {
				label: (type === "typeless") ? "Sans type" : `${labelPrefix} ${typeWord} ${POKEMON_TYPE_LABELS[type] ?? type.capitalize()}`.replace(/\s+/g, " ").trim(), // Ex. : "(pk5e) Type Feu" ou "Type Feu" ou "Feu"
				isPhysical: false,
				icon: `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/types/${type}.svg`,
				reference: ""
			};
		});
	}

	// Languages
	const theDndLanguagesWillBeRemoved = game.settings.get("fr_pokemon_5e", "removeDndLanguagues");
	{
		if (theDndLanguagesWillBeRemoved) {
			delete CONFIG.DND5E.languages.exotic;
			delete CONFIG.DND5E.languages.standard;
		}
		const thePokemonLanguaguesWillBeAdded = game.settings.get("fr_pokemon_5e", "addPokemonLanguages");
		if (thePokemonLanguaguesWillBeAdded) {
			const labelPrefix = "Univers Pokémon";
			const propertyPrefix = "pokemon_setting";
			CONFIG.DND5E.languages[`${propertyPrefix}_common`] = {
				label: `${labelPrefix} (courantes)`,
				selectable: false,
				children: POKEMON_STANDARD_LANGUAGUES.reduce( (obj, lang) => {
					obj[lang] = POKEMON_LANGUAGE_LABELS[lang] ?? capitalize(lang);
					return obj;
				}, {} )
			}
			CONFIG.DND5E.languages[`${propertyPrefix}_rare`] = {
				label: `${labelPrefix} (rares)`,
				selectable: false,
				children: POKEMON_EXOTIC_LANGUAGUES.reduce( (obj, lang) => {
					obj[lang] = POKEMON_LANGUAGE_LABELS[lang] ?? capitalize(lang).replace("Pokemon", "Pokémon");
					return obj;
				}, {} )
			}
		}
	}

	// Pokémon Status Conditions
	const theDndSimilarConditionsWillBeRemoved = game.settings.get("fr_pokemon_5e", "removeDndSimilarConditions");
	{
		let labelPrefix = PK5E_PREFIX.forLabels;
		if (theDndSimilarConditionsWillBeRemoved) {
			labelPrefix = "";
			delete CONFIG.DND5E.conditionTypes.poisoned;
			delete CONFIG.DND5E.conditionTypes.paralyzed;
		}
		POKEMON_CONDITIONS.forEach(condition => {
			// ? El id de la condición solo admite caracteres alfanuméricos y un máximo de 11 caracteres
			CONFIG.DND5E.conditionTypes[`pk5e${condition}`] = {
				name: `${labelPrefix} ${POKEMON_CONDITION_LABELS[condition] ?? formatPropertyName(condition)}`.trim(), // Ex. : "(pk5e) Empoisonné" ou "Empoisonné"
				img: `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/conditions/${condition}.svg`,
				reference: POKEMON_CONDITIONS_REFERENCES[condition] || "",
				// Cuando se vaya a implementar el poisoned_badly, seguramente dé error porque tiene un nombre muy largo y se deba acortar a algo como badpoisoned o algo del estilo.
			};
		});
	}

	// Currencies
	const theDndCurrenciesWillBeReplaced = game.settings.get("fr_pokemon_5e", "replaceDndCurrencies");
	if (theDndCurrenciesWillBeReplaced) {
		const currencyToChange = "gp"; // pp, gp, ep, sp, cp
		const currencyName = CURRENCY_NAMES_FORMATTED[game.settings.get("fr_pokemon_5e", "currencyName")];
		for (const currency in CONFIG.DND5E.currencies) {
			if (currency === currencyToChange) {
				CONFIG.DND5E.currencies[currency].abbreviation = "₽";
				CONFIG.DND5E.currencies[currency].label = currencyName;
				CONFIG.DND5E.currencies[currency].icon = `https://raw.githubusercontent.com/MissingGlitch/pokemon-images/refs/heads/main/others/currency.png`;

			} else {
				delete CONFIG.DND5E.currencies[currency];
			}
		}
	}

	// Pokemon Move Weapon Type
	CONFIG.DND5E.weaponTypes.pokemon = "Capacité Pokémon";

	// Pokémon Feature Type
	CONFIG.DND5E.featureTypes.pokemon = {
		label: "Aptitude Pokémon",
		subtypes: {
			type: "Type Pokémon",
			nature: "Nature Pokémon",
			ability: "Talent Pokémon",
			species: "Trait d'espèce"
		}
	}

	// Pokémon Actor Type (opción "Fakemon" en el diálogo "Create Actor")
	{
		pk5eLog("pk5e (init): Registering 'Fakemon' option in Create Actor dialog");

		Hooks.on("renderApplicationV2", (app, html, context, options) => {
			if (app.constructor.name !== "CreateDocumentDialog") return;
			pk5eLog("pk5e (renderApplicationV2): CreateDocumentDialog render detected", { app, html, context, options });

			const npcRadio = html.querySelector('input[name="type"][value="npc"]');
			if (!npcRadio) {
				pk5eLog("pk5e (renderApplicationV2): 'npc' radio not found in this render (probably the 'footer' part), skipping");
				return;
			}

			const npcLi = npcRadio.closest("li");
			const list = npcLi.parentElement;
			if (list.querySelector('input[name="type"][value="fakemon"]')) {
				pk5eLog("pk5e (renderApplicationV2): 'fakemon' option already exists, skipping duplicate insertion");
				return;
			}

			const fakemonLi = npcLi.cloneNode(true);
			const fakemonRadio = fakemonLi.querySelector('input[name="type"]');
			fakemonRadio.value = "fakemon";
			fakemonLi.querySelector("span").textContent = "Fakemon";
			fakemonLi.querySelector("dnd5e-icon").setAttribute("src", "modules/fr_pokemon_5e/extras/pokeball.svg"); // todo: confirmar ruta real del ícono
			list.appendChild(fakemonLi);
			pk5eLog("pk5e (renderApplicationV2): 'Fakemon' option inserted into Create Actor list", fakemonLi);

			const form = html.querySelector("form");
			if (form.dataset.pk5eFakemonBound) {
				pk5eLog("pk5e (renderApplicationV2): submit listener already bound for this form, skipping");
				return;
			}
			form.dataset.pk5eFakemonBound = "true";

			form.addEventListener("submit", ev => {
				pk5eLog("pk5e (submit): Create Actor form submitted", { checked: fakemonRadio.checked });
				if (!fakemonRadio.checked) {
					pk5eLog("pk5e (submit): non-fakemon type, letting native flow continue");
					return;
				}

				ev.preventDefault();
				ev.stopImmediatePropagation();
				pk5eLog("pk5e (submit): 'Fakemon' selected, intercepting native creation flow");

				app.close();
				new FakemonCreationDialog().render(true);
			}, { capture: true });
		});
	}
});