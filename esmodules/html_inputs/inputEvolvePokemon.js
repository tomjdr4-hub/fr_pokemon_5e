import { pk5eLog } from "../utils/logs.js";
const rickrollLink = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

//* HTML RickRoll Button Creation
const evolutionButton = document.createElement("button");
evolutionButton.type = "button";
const evolutionButtonName = "Faire évoluer le Pokémon";
evolutionButton.setAttribute("aria-label", evolutionButtonName);
evolutionButton.setAttribute("data-tooltip", evolutionButtonName);
const evolutionButtonIcon = document.createElement("i");
evolutionButtonIcon.classList.add("fa-solid", "fa-dna");
evolutionButton.appendChild(evolutionButtonIcon);

// Cositas para el Rickroll
evolutionButton.setAttribute("data-tooltip", "PAS ENCORE IMPLÉMENTÉ (NE PAS APPUYER !)");
const link = document.createElement("a")
link.setAttribute("href", rickrollLink);
link.setAttribute("target", "_blank");
link.appendChild(evolutionButton);
// const container = document.createElement("p");
// container.appendChild(link);

//* Input Data to Export
export const evolvePokemon = {
	name: "Faire évoluer le Pokémon :\nPAS ENCORE IMPLÉMENTÉ (NE PAS APPUYER !)",
	description: "Fait évoluer le Pokémon vers son stade suivant si les conditions minimales sont remplies.",
	htmlElement: link,
	formFieldsStyles: "max-width:fit-content"
};