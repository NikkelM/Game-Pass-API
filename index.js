// Author: NikkelM
// Description: Fetches all Game Pass game Id's and properties for a given market and formats them according to a given configuration.
// API URL's taken from https://www.reddit.com/r/XboxGamePass/comments/jt214y/public_api_for_fetching_the_list_of_game_pass/

// Suppresses the warning about the fetch API being unstable
process.removeAllListeners('warning');

import fs from 'fs';
import jsonschema from 'jsonschema';

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
} catch (error) {
	console.error("Error loading configuration file: " + error);
	process.exit(1);
}

// If the user wants empty strings to be treated as null or not
const emptyValuePlaceholder = CONFIG.treatEmptyStringAsNull ? null : "";

// Validate the config file against the schema
console.log("Validating configuration file...\n");
try {
	const validator = new jsonschema.Validator();
	validator.validate(CONFIG, JSON.parse(fs.readFileSync(__dirname + '/config.schema.json')), { throwError: true });
} catch (error) {
	console.error("Error validating configuration file: " + error);
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
	for (const market of CONFIG.markets) {
		if (CONFIG.fetchConsole) {
			const consoleFormattedProperties = runScriptForPassAndMarket("console", market);
		}
		if (CONFIG.fetchPC) {
			const pcFormattedProperties = runScriptForPassAndMarket("pc", market);
		}
		if (CONFIG.fetchEAPlay) {
			const eaPlayFormattedProperties = runScriptForPassAndMarket("eaPlay", market);
		}
	}
	// TODO: Await completion of all three functions, then check if the user wants to have the objects merged (need to create a config property for this first)
}

async function runScriptForPassAndMarket(passType, market) {
	// Fetch Game Pass game ID's
	const gameIds = await fetchGameIDs(passType, market);

	// Fetch Game Pass game properties
	const gameProperties = await fetchGameProperties(gameIds, passType, market);

	// Format the data according to the configuration
	const formattedData = formatData(gameProperties, passType, market);

	// Write the data to a file
	fs.writeFileSync(`./output/formattedGameProperties_${passType}_${market}.json`, JSON.stringify(formattedData, null, 2));

	return formattedData;
}

// ---------- Fetch Game Pass game ID's ----------
async function fetchGameIDs(passType, market) {
	// Get all Game Pass Game ID's for this market

	const APIIds = {
		"console": "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
		"pc": "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
		"eaPlay": "b8900d09-a491-44cc-916e-32b5acae621b"
	}

	console.log("Fetching " + passType + " Game Pass game ID's for market \"" + market + "\".");
	let gameIds = await fetch(`https://catalog.gamepass.com/sigls/v2?id=${APIIds[passType]}&language=en-us&market=${market}`)
		.then((response) => response.json())
		.then((data) => data.filter((entry) => entry.id).map((entry) => entry.id));

	return gameIds;
}

async function fetchGameProperties(gameIds, passType, market) {
	console.log("Fetching game properties for " + gameIds.length + " " + passType + " games for market \"" + market + "\".");
	return await fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${gameIds}&market=${market}&languages=en-us&MS-CV=DGU1mcuYo0WMMp`)
		.then((response) => response.json())
		.then((data) => {
			// Write the data to a file
			fs.writeFileSync(`./output/completeGameProperties_${passType}_${market}.json`, JSON.stringify(data, null, 2));
			return data;
		});
}

function formatData(gameProperties, passType, market) {
	// Format the data according to the configuration

	// Create a new object to store the formatted data
	const formattedData = {};

	// Loop through each game
	for (const game of gameProperties.Products) {
		let index;
		// Create a new object for this game
		switch (CONFIG.outputIndexing) {
			case "productId":
				index = game.ProductId;
				break;
			case "productTitle":
				index = game.LocalizedProperties[0].ProductTitle;
				break;
			case "0-indexed":
				index = Object.keys(formattedData).length;
				break;
		}
		formattedData[index] = {};

		// Loop through each property
		for (const [property, propertyValue] of Object.entries(CONFIG.includedProperties)) {
			// Get the value of the property
			const result = getPropertyValue(game, property, propertyValue);

			// Add the property to the object, only if it is not undefined. undefined indicates the property was present in the config, but disabled.
			// Null values are valid, e.g. if a given name does not have a value for the requested property.
			if (result !== undefined) {
				formattedData[index][property] = result;
			}
		}
	}

	return formattedData;
}

function getPropertyValue(game, property, propertyValue) {
	// Get the value of the property for the given game according to the specification in propertyValue

	let value;
	switch (property) {
		case "productTitle":
			if (!propertyValue) { return undefined; }

			value = game.LocalizedProperties[0].ProductTitle?.length > 0
				? game.LocalizedProperties[0].ProductTitle
				: emptyValuePlaceholder;

			break;
		case "productId":
			if (!propertyValue) { return undefined; }

			value = game.ProductId.length > 0
				? game.ProductId
				: emptyValuePlaceholder;

			break;
		case "developerName":
			if (!propertyValue) { return undefined; }

			value = game.LocalizedProperties[0].DeveloperName.length > 0
				? game.LocalizedProperties[0].DeveloperName
				: emptyValuePlaceholder;

			break;
		case "publisherName":
			if (!propertyValue) { return undefined; }

			value = game.LocalizedProperties[0].PublisherName.length > 0
				? game.LocalizedProperties[0].PublisherName
				: emptyValuePlaceholder;

			break;
		case "productDescription":
			if (!propertyValue.enabled) { return undefined; }

			if (propertyValue.preferShort && game.LocalizedProperties[0].ShortDescription?.length > 0) {
				value = game.LocalizedProperties[0].ShortDescription;
			} else {
				value = game.LocalizedProperties[0].ProductDescription?.length > 0
					? game.LocalizedProperties[0].ProductDescription
					: emptyValuePlaceholder;
			}

			break;
		case "images":
			if (!propertyValue.enabled) { return undefined; }

			break;
		case "releaseDate":
			if (!propertyValue.enabled) { return undefined; }

			if (propertyValue.format === "date") {
				value = game.MarketProperties[0].OriginalReleaseDate.length > 0
					? game.MarketProperties[0].OriginalReleaseDate?.split("T")[0]
					: emptyValuePlaceholder;
			} else if (propertyValue.format === "date-time") {
				value = game.MarketProperties[0].OriginalReleaseDate.length > 0
					? game.MarketProperties[0].OriginalReleaseDate
					: emptyValuePlaceholder;
			}

			break;
		case "userRating":
			if (!propertyValue.enabled) { return undefined; }

			const intervalMapping = {
				"7Days": 0,
				"30Days": 1,
				"AllTime": 2
			}

			// Get the x-out-of-5 stars rating
			value = game.MarketProperties[0].UsageData[intervalMapping[propertyValue.aggregationInterval]]?.AverageRating;

			// Convert to a percentage if requested
			if (propertyValue.format === "percentage") {
				value = parseFloat((value / 5).toFixed(2));
			}

			break;
		case "pricing":
			if (!propertyValue.enabled) { return undefined; }

			let missingPricePlaceholder;
			switch (propertyValue.missingPricePolicy) {
				case "useZero":
					missingPricePlaceholder = 0;
					break;
				case "useNull":
					missingPricePlaceholder = null;
					break;
				case "useEmptyString":
					missingPricePlaceholder = "";
					break;
			}

			value = {};
			value["currencyCode"] = game.DisplaySkuAvailabilities[0]?.Availabilities[0]?.OrderManagementData?.Price?.CurrencyCode;

			for (const priceType of propertyValue.priceTypes) {
				// Small workaround to not exclude 0-values
				value[priceType] = typeof game.DisplaySkuAvailabilities[0].Availabilities[0].OrderManagementData.Price[priceType] === 'number'
					? game.DisplaySkuAvailabilities[0].Availabilities[0].OrderManagementData.Price[priceType]
					: missingPricePlaceholder;
			}

			break;
		case "categories":
			if (!propertyValue) { return undefined; }

			value = [];
			if (game.Properties.Categories) {
				value = game.Properties.Categories;
			}
			// Each game also has a "main" category, which may or may not be included in the list of categories
			if (!(game.Properties.Category in value)) {
				value.push(game.Properties.Category);
			}

			break;
		default:
			// Due to our config validation, this should never happen, but just in case...
			console.log("Invalid property: " + property);
			return undefined;
	}

	return value;
}