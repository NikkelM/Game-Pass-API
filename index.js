// Author: NikkelM
// Description: Fetches all Game Pass game Id's and properties for a given market and formats them according to a given configuration.
// API URL's taken from https://www.reddit.com/r/XboxGamePass/comments/jt214y/public_api_for_fetching_the_list_of_game_pass/

// Suppresses the warning about the fetch API being unstable
process.removeAllListeners('warning');

import fs from 'fs';

// Utility for getting the directory of the current file
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------- Setup ----------

// ----- Config -----

console.log("Loading configuration file...\n");
try {
	const configFileName = fs.existsSync(__dirname + '/config.json') ? 'config.json' : 'config.default.json';
	var CONFIG = JSON.parse(fs.readFileSync(__dirname + '/' + configFileName));
	// console.log(CONFIG);
} catch (error) {
	console.error("Error loading configuration file: " + error);
	process.exit(1);
}

// ----- Output -----

// Create the output directory if it doesn't exist
if (!fs.existsSync('./output')) {
	fs.mkdirSync('./output');
}

// ---------- Main ----------
main();

async function main() {
	// Fetch Game Pass game ID's and properties for each pass type
	// We do not await execution of these functions, as they are independent of each other
	if (CONFIG.fetchConsole) {
		runScriptForPassType("console");
	}
	if (CONFIG.fetchPC) {
		runScriptForPassType("pc");
	}
	if (CONFIG.fetchEAPlay) {
		runScriptForPassType("eaPlay");
	}
}

async function runScriptForPassType(passType) {
	// Fetch Game Pass game ID's
	const gameIds = await fetchGameIDs(passType);

	// Fetch Game Pass game properties
	await fetchGameProperties(gameIds, passType);
}

// ---------- Fetch Game Pass game ID's ----------
async function fetchGameIDs(passType) {
	// Get all Game Pass Game ID's for this market

	const APIIds = {
		"console": "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
		"pc": "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
		"eaPlay": "b8900d09-a491-44cc-916e-32b5acae621b"
	}

	console.log("Fetching " + passType + " Game Pass game ID's for market \"" + CONFIG.market + "\".");
	let gameIds = await fetch(`https://catalog.gamepass.com/sigls/v2?id=${APIIds[passType]}&language=en-us&market=${CONFIG.market}`)
		.then((response) => response.json())
		.then((data) => data.filter((entry) => entry.id).map((entry) => entry.id));

	return gameIds;
}

async function fetchGameProperties(gameIds, passType) {
	console.log("Fetching game properties for " + gameIds.length + " " + passType + " games...");
	await fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${gameIds}&market=${CONFIG.market}&languages=en-us&MS-CV=DGU1mcuYo0WMMp`)
		.then((response) => response.json())
		.then((data) => {
			// Write the data to a file
			fs.writeFileSync(`./output/gameProperties_${passType}_${CONFIG.market}.json`, JSON.stringify(data, null, 2));
		});
}