import { pk5eHelpersMenu } from "./applications/helpersMenu/helpersMenu.js";
import { pk5eLog } from "./utils/logs.js";

Hooks.once("init", () => {
	// STAB Version
	game.settings.register("pokemon5e", "stabVersion", {
		name: "Version du STAB",
		hint: "Modificateur final appliqué aux capacités bénéficiant du STAB (bonus d'attaque du même type).",
		scope: "world",
		config: true,
		type: new foundry.data.fields.StringField({
			required: true,
			nullable: false,
			choices: {
				"2018": "2018 (selon le niveau)",
				"2024": "2024 (bonus de maîtrise)"
			}
		}),
		default: "2024",
		onChange: value => { pk5eLog(`pk5e (settings): "STAB Version" has been set to <${value}>.`) },
		requiresReload: false
	});

	// Add Pokémon Region Languages
	game.settings.register("pokemon5e", "addPokemonLanguages", {
		name: "Ajouter les langues des régions Pokémon",
		hint: "Ajoute les langues des régions Pokémon à la liste des langues.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: true,
		onChange: value => { pk5eLog(`pk5e (settings): "Add Pokémon Region Languages" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Remove DnD Languages
	game.settings.register("pokemon5e", "removeDndLanguagues", {
		name: "Retirer les langues de D&D",
		hint: "Retire les langues de D&D de la liste des langues.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Remove DnD Languages" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Currency Name
	game.settings.register("pokemon5e", "currencyName", {
		name: "Nom de la monnaie",
		hint: "Nom de la monnaie utilisée dans l'univers Pokémon.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.StringField({
			required: true,
			nullable: false,
			choices: {
				"pokeyen": "Pokéyen",
				"pokedollars": "Pokédollars"
			}
		}),
		default: "pokedollars",
		onChange: value => { pk5eLog(`pk5e (settings): "${value}" currency name has been set.`) },
		requiresReload: true
	});

	// Replace DnD Currencies
	game.settings.register("pokemon5e", "replaceDndCurrencies", {
		name: "Remplacer les monnaies de D&D",
		hint: "Remplace les monnaies de D&D par la monnaie Pokémon.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: true,
		onChange: value => { pk5eLog(`pk5e (settings): "Replace DnD Currencies" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Remove "Type" word from Pokémon Types
	game.settings.register("pokemon5e", "removeTypeWord", {
		name: "Retirer le mot « Type » des types Pokémon",
		hint: "Retire le mot « Type » des types Pokémon pour ne garder que le nom. Exemple : « Type Feu » deviendra « Feu ».",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Remove 'Type' word from Pokémon Types" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Remove DnD Damage Types
	game.settings.register("pokemon5e", "removeDndDamageTypes", {
		name: "Retirer les types de dégâts de D&D",
		hint: "Retire les types de dégâts de D&D de la liste des types de dégâts, pour ne garder que les types Pokémon.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Remove DnD Damage Types" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Remove DnD Poisoned and Paralyzed Conditions
	game.settings.register("pokemon5e", "removeDndSimilarConditions", {
		name: "Retirer les états similaires de D&D (empoisonné et paralysé)",
		hint: "Retire les états empoisonné et paralysé de D&D de la liste des états, pour ne garder que leurs équivalents en tant qu'altérations de statut Pokémon.",
		scope: "world",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Remove DnD Similar Conditions (Poisoned and Paralyzed)" has been set to <${value}>.`) },
		requiresReload: true
	});

	// Enable Debug Logs
	game.settings.register("pokemon5e", "enableDebugLogs", {
		name: "Activer les journaux de débogage",
		hint: "Active les journaux de débogage du module. Utile pour le développement et le dépannage.",
		scope: "user",
		config: true,
		type: new foundry.data.fields.BooleanField(),
		default: false,
		onChange: value => { pk5eLog(`pk5e (settings): "Enable Debug Logs" has been set to <${value}>.`) },
		requiresReload: false
	});

	// Show all Helpers
	game.settings.registerMenu("pokemon5e", "helpers", {
		name: "Outils d'aide",
		label: "Ouvrir le menu des outils d'aide",
		hint: "Accédez à tous les outils d'aide inclus dans le module pour résoudre les incompatibilités et les erreurs.",
		icon: "fa-solid fa-screwdriver-wrench",
		type: pk5eHelpersMenu,
		restricted: true
	});
});

// Partials for Apps:
Hooks.once("init", async () => {
	// Load partials for Helpers
    await loadTemplates([
        "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/tree-node.hbs",
        "modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/file-explorer.hbs"
    ]);

    // Registrar con nombre corto para poder usarlo en los hbs más fácilmente
    Handlebars.registerPartial(
        "pk5e-tree-node",
        Handlebars.partials["modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/tree-node.hbs"]
    );
    Handlebars.registerPartial(
        "pk5e-file-explorer",
        Handlebars.partials["modules/pokemon5e/esmodules/applications/helpersMenu/helpers/npcHpFixer/file-explorer.hbs"]
    );
});