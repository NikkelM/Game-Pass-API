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

try {
	let configFileName;
	if (fs.existsSync(__dirname + '/config.json')) {
		console.log("Loading configuration file \"config.json\"...");
		configFileName = 'config.json';
	} else if (fs.existsSync(__dirname + '/config.default.json')) {
		console.log("!!! No custom configuration file found! Loading default configuration file \"config.default.json\"...");
		configFileName = 'config.default.json';
	}
	var CONFIG = JSON.parse(fs.readFileSync(__dirname + '/' + configFileName));
} catch (error) {
	console.error("Error loading configuration file: " + error);
	process.exit(1);
}

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

if (!fs.existsSync(__dirname + '/output')) {
	fs.mkdirSync(__dirname + '/output');
}

// ---------- Main ----------

const emptyValuePlaceholder = CONFIG.treatEmptyStringsAsNull ? null : "";

main();

async function main() {
	// Fetch Game Pass game ID's and properties for each pass type and market specified in the configuration
	// The tasks run in parallel to speed up the process
	// Each one writes its own output file
	const tasks = [];
	for (const market of CONFIG.markets) {
		for (const passType of ["console", "pc", "eaPlay"]) {
			if (CONFIG.platformsToFetch.includes(passType)) {
				tasks.push(
					runScriptForPassTypeAndMarket(passType, market).catch((error) => {
						console.error(`\nError fetching ${passType} games for market "${market}": ${error.message ?? error}`);
						return { failed: true };
					})
				);
			}
		}
	}

	const failures = (await Promise.all(tasks)).filter((result) => result && result.failed).length;
	if (failures > 0) {
		console.error(`\n${failures} of ${tasks.length} fetch task(s) failed. See the errors above.`);
		process.exit(1);
	}
}

async function runScriptForPassTypeAndMarket(passType, market) {
	const gameIds = await fetchGameIDs(passType, market);
	const gameProperties = await fetchGameProperties(gameIds, passType, market);
	const formattedData = formatData(gameProperties, passType);

	fs.writeFileSync(`./output/formattedGameProperties_${passType}_${market}.json`, JSON.stringify(formattedData, null, 2));

	return formattedData;
}

// ---------- Fetch game ID's & properties ----------

// Get all Game Pass Game ID's for this market
async function fetchGameIDs(passType, market) {
	const APIIds = {
		"console": "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
		"pc": "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
		"eaPlay": "b8900d09-a491-44cc-916e-32b5acae621b"
	}

	console.log(`Fetching ${passType} Game Pass game ID's for market "${market}"...`);
	const response = await fetch(`https://catalog.gamepass.com/sigls/v2?id=${APIIds[passType]}&language=${CONFIG.language}&market=${market}`);
	if (!response.ok) {
		throw new Error(`The Game Pass catalog API responded with status ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`);
	}

	let data;
	try {
		data = await response.json();
	} catch (error) {
		throw new Error(`Could not parse the Game Pass catalog API response as JSON: ${error.message ?? error}`);
	}

	return data.filter((entry) => entry.id).map((entry) => entry.id);
}

async function fetchGameProperties(gameIds, passType, market) {
	console.log(`Fetching game properties for ${gameIds.length} ${passType} games for market "${market}"...`);
	const response = await fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${gameIds}&market=${market}&languages=${CONFIG.language}`);
	if (!response.ok) {
		throw new Error(`The Microsoft display catalog API responded with status ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`);
	}

	let data;
	try {
		data = await response.json();
	} catch (error) {
		throw new Error(`Could not parse the Microsoft display catalog API response as JSON: ${error.message ?? error}`);
	}

	if (CONFIG.keepCompleteProperties) {
		fs.writeFileSync(`./output/completeGameProperties_${passType}_${market}.json`, JSON.stringify(data, null, 2));
	}

	return data;
}

// Format the data according to the configuration
function formatData(gameProperties, passType) {
	const products = gameProperties.Products ?? [];
	console.log(`Formatting game properties for ${products.length} ${passType} games...`);

	let formattedData = CONFIG.outputFormat === "array" ? [] : {};

	for (const game of products) {
		let index;
		switch (CONFIG.outputFormat) {
			case "array":
				index = formattedData.length;
				break;
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

		for (const [property, propertyValue] of Object.entries(CONFIG.includedProperties)) {
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
		case "storePage":
			result = getStorePageUrl(game, propertyValue);
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

	return game.LocalizedProperties?.[0]?.ProductTitle?.length > 0
		? game.LocalizedProperties[0].ProductTitle
		: emptyValuePlaceholder;
}

function getProductId(game, productIdProperty) {
	if (!productIdProperty) { return undefined; }

	return game.ProductId?.length > 0
		? game.ProductId
		: emptyValuePlaceholder;
}

function getDeveloperName(game, developerNameProperty) {
	if (!developerNameProperty) { return undefined; }

	return game.LocalizedProperties?.[0]?.DeveloperName?.length > 0
		? game.LocalizedProperties[0].DeveloperName
		: emptyValuePlaceholder;
}

function getPublisherName(game, publisherNameProperty) {
	if (!publisherNameProperty) { return undefined; }

	return game.LocalizedProperties?.[0]?.PublisherName?.length > 0
		? game.LocalizedProperties[0].PublisherName
		: emptyValuePlaceholder;
}

function getProductDescription(game, productDescriptionProperty) {
	if (!productDescriptionProperty.enabled) { return undefined; }

	if (productDescriptionProperty.preferShort && game.LocalizedProperties?.[0]?.ShortDescription?.length > 0) {
		return game.LocalizedProperties[0].ShortDescription;
	} else {
		return game.LocalizedProperties?.[0]?.ProductDescription?.length > 0
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

	for (const image of game.LocalizedProperties?.[0]?.Images ?? []) {
		const limit = imageProperty.imageTypes[image.ImagePurpose];
		if (!limit || (limit !== -1 && numImagesByType[image.ImagePurpose] >= limit)) {
			continue;
		}

		const uri = image.Uri.startsWith('https:') ? image.Uri : `https:${image.Uri}`;

		// Skip true duplicates - the same URL can appear more than once in the API response
		if (images[image.ImagePurpose]?.includes(uri)) {
			continue;
		}

		(images[image.ImagePurpose] ??= []).push(uri);
		numImagesByType[image.ImagePurpose] = (numImagesByType[image.ImagePurpose] ?? 0) + 1;
	}
	return images;
}

function getReleaseDate(game, releaseDateProperty) {
	if (!releaseDateProperty.enabled) { return undefined; }

	const releaseDate = game.MarketProperties?.[0]?.OriginalReleaseDate;
	if (!releaseDate || releaseDate.length === 0) {
		return emptyValuePlaceholder;
	}

	if (releaseDateProperty.format === "date") {
		return releaseDate.split("T")[0];
	} else if (releaseDateProperty.format === "dateTime") {
		return releaseDate;
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
	let userRating = game.MarketProperties?.[0]?.UsageData?.[intervalMapping[userRatingProperty.aggregationInterval]]?.AverageRating;

	// Games without any rating data for the requested interval
	if (typeof userRating !== "number") {
		return emptyValuePlaceholder;
	}

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
	const price = game.DisplaySkuAvailabilities?.[0]?.Availabilities?.[0]?.OrderManagementData?.Price;
	prices["currencyCode"] = price?.CurrencyCode;

	for (const priceType of pricingProperty.priceTypes) {
		// Small workaround to not exclude 0-values
		prices[priceType] = typeof price?.[priceType] === 'number'
			? price[priceType]
			: missingPricePlaceholder;
	}

	return prices;
}

function getCategories(game, categoriesProperty) {
	if (!categoriesProperty) { return undefined; }

	const properties = game.Properties ?? {};
	let categories = Array.isArray(properties.Categories) ? [...properties.Categories] : [];

	// Each game also has a "main" category, which may or may not be included in the list of categories
	if (properties.Category && !categories.includes(properties.Category)) {
		categories.push(properties.Category);
	}

	return categories;
}

function getStorePageUrl(game, storePageUrlProperty) {
	if (!storePageUrlProperty) { return undefined; }

	if (!game.LocalizedProperties?.[0]?.ProductTitle || !game.ProductId) {
		return undefined;
	}

	// 1. Convert to lowercase
	// 2. Replace all non-alphanumeric characters with a dash
	// 3. Replace multiple dashes with a single dash
	// 4. Remove leading and trailing dashes
	const formattedGameName = game.LocalizedProperties[0].ProductTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

	return `https://www.xbox.com/${CONFIG.language}/games/store/${formattedGameName}/${game.ProductId}`;
}