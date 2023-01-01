// Author: NikkelM
// Description: Fetches all Game Pass game Id's and properties for a given market and formats them according to a given configuration.
// API URL's taken from https://www.reddit.com/r/XboxGamePass/comments/jt214y/public_api_for_fetching_the_list_of_game_pass/

// Suppresses the warning about the fetch API being unstable
process.removeAllListeners('warning');

// Utility libraries
import fs from 'fs';
import jsonschema from 'jsonschema';

// Utility for getting the directory of the current file
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------- Setup ----------

// ----- Config -----

console.log("Loading configuration file...");
try {
	const configFileName = fs.existsSync(__dirname + '/config.json') ? 'config.json' : 'config.default.json';
	var CONFIG = JSON.parse(fs.readFileSync(__dirname + '/' + configFileName));
} catch (error) {
	console.error("Error loading configuration file: " + error);
	process.exit(1);
}

// If the user wants empty strings to be treated as null or not
const emptyValuePlaceholder = CONFIG.treatEmptyStringsAsNull ? null : "";

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
	// Fetch Game Pass game ID's and properties for each pass type and market specified in the configuration
	let formattedProperties = {};
	for (const market of CONFIG.markets) {
		if (CONFIG.fetchConsole) {
			formattedProperties["console"] = new Promise((resolve) => runScriptForPassAndMarket(resolve, "console", market));
		}
		if (CONFIG.fetchPC) {
			formattedProperties["pc"] = new Promise((resolve) => runScriptForPassAndMarket(resolve, "pc", market));
		}
		if (CONFIG.fetchEAPlay) {
			formattedProperties["eaPlay"] = new Promise((resolve) => runScriptForPassAndMarket(resolve, "eaPlay", market));
		}
		
		await Promise.all(Object.values(formattedProperties));

		// Write the data to a file
		for (const [passType, formattedData] in formattedProperties) {
			fs.writeFileSync(`./output/formattedGameProperties_${passType}_${market}.json`, JSON.stringify(formattedData, null, 2));
		}

		console.log(`Finished fetching and formatting data for market "${market}".\n`);
	}
}

async function runScriptForPassAndMarket(resolve, passType, market) {
	// Fetch Game Pass game ID's
	const gameIds = await fetchGameIDs(passType, market);

	// Fetch Game Pass game properties
	const gameProperties = await fetchGameProperties(gameIds, passType, market);

	// Format the data according to the configuration
	const formattedData = formatData(gameProperties, passType, market);

	resolve(formattedData);
}

// ---------- Fetch game ID's & properties ----------

async function fetchGameIDs(passType, market) {
	// Get all Game Pass Game ID's for this market

	const APIIds = {
		"console": "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
		"pc": "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
		"eaPlay": "b8900d09-a491-44cc-916e-32b5acae621b"
	}

	console.log(`Fetching ${passType} Game Pass game ID's for market "${market}"...`);
	let gameIds = await fetch(`https://catalog.gamepass.com/sigls/v2?id=${APIIds[passType]}&language=en-us&market=${market}`)
		.then((response) => response.json())
		.then((data) => data.filter((entry) => entry.id).map((entry) => entry.id));

	return gameIds;
}

async function fetchGameProperties(gameIds, passType, market) {
	console.log(`Fetching game properties for ${gameIds.length} ${passType} games for market "${market}"...`);
	return await fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${gameIds}&market=${market}&languages=en-us&MS-CV=DGU1mcuYo0WMMp`)
		.then((response) => response.json())
		.then((data) => {
			// Write the data to a file
			fs.writeFileSync(`./output/completeGameProperties_${passType}_${market}.json`, JSON.stringify(data, null, 2));
			return data;
		});
}

// Format the data according to the configuration
function formatData(gameProperties, passType, market) {
	console.log(`Formatting game properties for ${gameProperties.Products.length} ${passType} games...`);

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

// Get the value of the property for the given game according to the specification in propertyValue
function getPropertyValue(game, property, propertyValue) {
	let result;
	switch (property) {
		case "productTitle":
			result = getProductTitle(game, propertyValue);
			break;
		case "productId":
			result = getProductId(game, propertyValue);
			break;
		case "developerName":
			result = getDeveloperName(game, propertyValue);
			break;
		case "publisherName":
			result = getPublisherName(game, propertyValue);
			break;
		case "productDescription":
			result = getProductDescription(game, propertyValue);
			break;
		case "images":
			result = getImages(game, propertyValue);
			break;
		case "releaseDate":
			result = getReleaseDate(game, propertyValue);
			break;
		case "userRating":
			result = getUserRating(game, propertyValue);
			break;
		case "pricing":
			result = getPricing(game, propertyValue);
			break;
		case "categories":
			result = getCategories(game, propertyValue);
			break;
		default:
			// Due to our config validation, this should never happen, but just in case...
			console.log(`Invalid property: ${property}`);
			return undefined;
	}

	return result;
}

// ---------- Utility functions for the various property types ----------

function getProductTitle(game, productTitleProperty) {
	if (!productTitleProperty) { return undefined; }

	return game.LocalizedProperties[0].ProductTitle.length > 0
		? game.LocalizedProperties[0].ProductTitle
		: emptyValuePlaceholder;
}

function getProductId(game, productIdProperty) {
	if (!productIdProperty) { return undefined; }

	return game.ProductId.length > 0
		? game.ProductId
		: emptyValuePlaceholder;
}

function getDeveloperName(game, developerNameProperty) {
	if (!developerNameProperty) { return undefined; }

	return game.LocalizedProperties[0].DeveloperName.length > 0
		? game.LocalizedProperties[0].DeveloperName
		: emptyValuePlaceholder;
}

function getPublisherName(game, publisherNameProperty) {
	if (!publisherNameProperty) { return undefined; }

	return game.LocalizedProperties[0].PublisherName.length > 0
		? game.LocalizedProperties[0].PublisherName
		: emptyValuePlaceholder;
}

function getProductDescription(game, productDescriptionProperty) {
	if (!productDescriptionProperty.enabled) { return undefined; }

	if (productDescriptionProperty.preferShort && game.LocalizedProperties[0].ShortDescription?.length > 0) {
		return game.LocalizedProperties[0].ShortDescription;
	} else {
		return game.LocalizedProperties[0].ProductDescription?.length > 0
			? game.LocalizedProperties[0].ProductDescription
			: emptyValuePlaceholder;
	}
}

function getImages(game, imageProperty) {
	if (!imageProperty.enabled) { return undefined; }

	let images = {};
	const numImagesByType = {
		"TitledHeroArt": 0,
		"SuperHeroArt": 0,
		"Logo": 0,
		"Poster": 0,
		"Screenshot": 0,
		"BoxArt": 0,
		"Hero": 0,
		"BrandedKeyArt": 0,
		"FeaturePromotionalSquareArt": 0
	};

	for (const image of game.LocalizedProperties[0].Images) {
		if (imageProperty.imageTypes[image.ImagePurpose] && (imageProperty.imageTypes[image.ImagePurpose] === -1 || numImagesByType[image.ImagePurpose] < imageProperty.imageTypes[image.ImagePurpose])) {
			if (!images[image.ImagePurpose]) {
				images[image.ImagePurpose] = [];
			}
			images[image.ImagePurpose].push(image.Uri.startsWith('https:') ? image.Uri : `https:${image.Uri}`);
			numImagesByType[image.ImagePurpose] = numImagesByType[image.ImagePurpose] ? numImagesByType[image.ImagePurpose] + 1 : 1;
		}
	}
	return images;
}

function getReleaseDate(game, releaseDateProperty) {
	if (!releaseDateProperty.enabled) { return undefined; }

	if (releaseDateProperty.format === "date") {
		return game.MarketProperties[0].OriginalReleaseDate.length > 0
			? game.MarketProperties[0].OriginalReleaseDate?.split("T")[0]
			: emptyValuePlaceholder;
	} else if (releaseDateProperty.format === "date-time") {
		return game.MarketProperties[0].OriginalReleaseDate.length > 0
			? game.MarketProperties[0].OriginalReleaseDate
			: emptyValuePlaceholder;
	} else {
		// Due to our config validation, this should never happen, but just in case...
		console.log(`Invalid release date format: ${releaseDateProperty.format}`);
		return undefined;
	}
}

function getUserRating(game, userRatingProperty) {
	if (!userRatingProperty.enabled) { return undefined; }

	const intervalMapping = {
		"7Days": 0,
		"30Days": 1,
		"AllTime": 2
	}

	// Get the x-out-of-5 stars rating
	let userRating = game.MarketProperties[0].UsageData[intervalMapping[userRatingProperty.aggregationInterval]]?.AverageRating;

	// Convert to a percentage if requested
	if (userRatingProperty.format === "percentage") {
		userRating = parseFloat((userRating / 5).toFixed(2));
	}

	return userRating;
}

function getPricing(game, pricingProperty) {
	if (!pricingProperty.enabled) { return undefined; }

	let missingPricePlaceholder;
	switch (pricingProperty.missingPricePolicy) {
		case "useZero":
			missingPricePlaceholder = 0;
			break;
		case "useNull":
			missingPricePlaceholder = null;
			break;
		case "useEmptyString":
			missingPricePlaceholder = "";
			break;
		default:
			// Due to our config validation, this should never happen, but just in case...
			console.log(`Invalid missing price policy: ${pricingProperty.missingPricePolicy}`);
			return undefined;
	}

	let prices = {};
	prices["currencyCode"] = game.DisplaySkuAvailabilities[0]?.Availabilities[0]?.OrderManagementData?.Price?.CurrencyCode;

	for (const priceType of pricingProperty.priceTypes) {
		// Small workaround to not exclude 0-values
		prices[priceType] = typeof game.DisplaySkuAvailabilities[0].Availabilities[0].OrderManagementData.Price[priceType] === 'number'
			? game.DisplaySkuAvailabilities[0].Availabilities[0].OrderManagementData.Price[priceType]
			: missingPricePlaceholder;
	}

	return prices;
}

function getCategories(game, categoriesProperty) {
	if (!categoriesProperty) { return undefined; }

	let categories = [];
	if (game.Properties.Categories) {
		categories = game.Properties.Categories;
	}
	// Each game also has a "main" category, which may or may not be included in the list of categories
	if (!(game.Properties.Category in categories)) {
		categories.push(game.Properties.Category);
	}
}