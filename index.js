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

// ---------- Fetch Game Pass game Id's ----------

// Get all Game Pass Game Id's for this market
console.log("Fetching Game Pass Id's for market " + CONFIG.market + ".\n");

let consoleGamePassIds, pcGamePassIds, eaPlayGamePassIds;

if (CONFIG.fetchConsole) {
	console.log("Fetching Console Game Pass Id's...");
	consoleGamePassIds = await fetch(`https://catalog.gamepass.com/sigls/v2?id=f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e&language=en-us&market=${CONFIG.market}`)
		.then((response) => response.json())
		.then((data) => data.filter((entry) => entry.id).map((entry) => entry.id));
	console.log("Found " + consoleGamePassIds.length + " Game Pass games for Console.\n");
}

if (CONFIG.fetchPC) {
	console.log("Fetching PC Game Pass Id's...");
	pcGamePassIds = await fetch(`https://catalog.gamepass.com/sigls/v2?id=fdd9e2a7-0fee-49f6-ad69-4354098401ff&language=en-us&market=${CONFIG.market}`)
		.then((response) => response.json())
		.then((data) => data.filter((entry) => entry.id).map((entry) => entry.id));
	console.log("Found " + pcGamePassIds.length + " Game Pass games for PC.\n");
}

if (CONFIG.fetchEAPlay) {
	console.log("Fetching PC Game Pass Id's...");
	eaPlayGamePassIds = await fetch(`https://catalog.gamepass.com/sigls/v2?id=b8900d09-a491-44cc-916e-32b5acae621b&language=en-us&market=${CONFIG.market}`)
		.then((response) => response.json())
		.then((data) => data.filter((entry) => entry.id).map((entry) => entry.id));
	console.log("Found " + eaPlayGamePassIds.length + " Game Pass games through EA Play.\n");
}

// ---------- Fetch Game Pass game properties ----------

console.log("Fetching properties for all Game Pass games...\n");

if (CONFIG.fetchConsole) {
	console.log("Fetching Console Game Pass game properties...");
	await fetchGameProperties(consoleGamePassIds, "console");
}

if (CONFIG.fetchPC) {
	console.log("Fetching PC Game Pass game properties...");
	await fetchGameProperties(pcGamePassIds, "pc");
}

if (CONFIG.fetchEAPlay) {
	console.log("Fetching EA Play Game Pass game properties...");
	await fetchGameProperties(eaPlayGamePassIds, "eaPlay");
}

// ---------- Fetch game properties ----------

async function fetchGameProperties(gameIds, passType) {
	console.log("Fetching game properties for " + gameIds.length + " " + passType + " games...\n");
	await fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${gameIds}&market=${CONFIG.market}&languages=en-us&MS-CV=DGU1mcuYo0WMMp`)
		.then((response) => response.json())
		.then((data) => {
			// Write the data to a file
			fs.writeFileSync(`./output/gameProperties_${passType}_${CONFIG.market}.json`, JSON.stringify(data, null, 2));
		});
}