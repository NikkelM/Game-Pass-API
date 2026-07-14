// Interactive configuration builder for the CLI (`game-pass-api init`)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { input, select, checkbox, confirm } from '@inquirer/prompts';

import { validateConfig } from './utils.js';
import { run } from './gamePass.js';

// Read the allowed market and language codes straight from the shipped schema
const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schema = JSON.parse(fs.readFileSync(path.join(packageDir, 'config.schema.json'), 'utf8').replace(/^\uFEFF/, ''));
const MARKETS = schema.properties.markets.items.enum;
const LANGUAGES = schema.properties.language.enum;

const IMAGE_TYPES = ['TitledHeroArt', 'SuperHeroArt', 'Logo', 'Poster', 'Screenshot', 'BoxArt', 'Hero', 'BrandedKeyArt', 'FeaturePromotionalSquareArt'];
const BOOLEAN_PROPERTIES = ['productTitle', 'productId', 'developerName', 'publisherName', 'categories', 'storePage'];

function parseMarkets(value) {
	return [...new Set(value.split(',').map((code) => code.trim().toUpperCase()).filter(Boolean))];
}

export async function runWizard(outputPath = 'config.json') {
	const markets = parseMarkets(await input({
		message: 'Market code(s), comma-separated (e.g. US, GB, DE):',
		default: 'US',
		validate: (value) => {
			const codes = parseMarkets(value);
			if (codes.length === 0) return 'Enter at least one market code';
			const invalid = codes.filter((code) => !MARKETS.includes(code));
			return invalid.length ? `Invalid market code(s): ${invalid.join(', ')}` : true;
		}
	}));

	const language = await select({
		message: 'Language for the fetched properties:',
		choices: LANGUAGES.map((code) => ({ name: code, value: code })),
		default: 'en-us'
	});

	const platformsToFetch = await checkbox({
		message: 'Which platforms should be fetched?',
		required: true,
		choices: [
			{ name: 'Console', value: 'console', checked: true },
			{ name: 'PC', value: 'pc', checked: true },
			{ name: 'EA Play', value: 'eaPlay', checked: true }
		]
	});

	const outputFormat = await select({
		message: 'How should the output be structured?',
		choices: [
			{ name: 'array - a list of game objects', value: 'array' },
			{ name: 'productTitle - a dictionary keyed by game title', value: 'productTitle' },
			{ name: 'productId - a dictionary keyed by product ID', value: 'productId' },
			{ name: '0-indexed - a dictionary keyed by rolling integers', value: '0-indexed' }
		],
		default: 'array'
	});

	const treatEmptyStringsAsNull = await confirm({ message: 'Treat empty string values as null?', default: true });
	const keepCompleteProperties = await confirm({ message: 'Also keep the complete, unfiltered API response per platform and market?', default: false });

	const selected = await checkbox({
		message: 'Which properties should be included in the output?',
		required: true,
		choices: [
			{ name: 'productTitle', value: 'productTitle', checked: true },
			{ name: 'productId', value: 'productId' },
			{ name: 'developerName', value: 'developerName' },
			{ name: 'publisherName', value: 'publisherName' },
			{ name: 'categories', value: 'categories' },
			{ name: 'productDescription', value: 'productDescription' },
			{ name: 'images', value: 'images' },
			{ name: 'releaseDate', value: 'releaseDate' },
			{ name: 'userRating', value: 'userRating' },
			{ name: 'pricing', value: 'pricing' },
			{ name: 'storePage', value: 'storePage' }
		]
	});

	const includedProperties = {};
	for (const property of BOOLEAN_PROPERTIES) {
		if (selected.includes(property)) {
			includedProperties[property] = true;
		}
	}

	if (selected.includes('productDescription')) {
		const preferShort = await confirm({ message: 'productDescription: prefer the short description when one is available?', default: false });
		includedProperties.productDescription = { enabled: true, preferShort };
	}

	if (selected.includes('images')) {
		// Include every image type with no per-type cap; edit config.json to limit specific types
		includedProperties.images = { enabled: true, imageTypes: Object.fromEntries(IMAGE_TYPES.map((type) => [type, -1])) };
	}

	if (selected.includes('releaseDate')) {
		const format = await select({
			message: 'releaseDate: which format?',
			choices: [{ name: 'date (YYYY-MM-DD)', value: 'date' }, { name: 'dateTime (full timestamp)', value: 'dateTime' }],
			default: 'date'
		});
		includedProperties.releaseDate = { enabled: true, format };
	}

	if (selected.includes('userRating')) {
		const aggregationInterval = await select({
			message: 'userRating: over which interval?',
			choices: [{ name: 'AllTime', value: 'AllTime' }, { name: '30Days', value: '30Days' }, { name: '7Days', value: '7Days' }],
			default: 'AllTime'
		});
		const format = await select({
			message: 'userRating: which format?',
			choices: [{ name: 'percentage (0.0 - 1.0)', value: 'percentage' }, { name: 'stars (0.0 - 5.0)', value: 'stars' }],
			default: 'percentage'
		});
		includedProperties.userRating = { enabled: true, aggregationInterval, format };
	}

	if (selected.includes('pricing')) {
		const missingPricePolicy = await select({
			message: 'pricing: what should a missing price become?',
			choices: [{ name: 'null', value: 'useNull' }, { name: '0', value: 'useZero' }, { name: 'empty string', value: 'useEmptyString' }],
			default: 'useNull'
		});
		includedProperties.pricing = { enabled: true, priceTypes: ['ListPrice', 'MSRP', 'WholesalePrice'], missingPricePolicy };
	}

	const config = {
		$schema: 'config.schema.json',
		markets,
		language,
		platformsToFetch,
		outputFormat,
		treatEmptyStringsAsNull,
		keepCompleteProperties,
		includedProperties
	};

	// Sanity-check the assembled configuration against the schema before writing it
	validateConfig(config);

	if (fs.existsSync(outputPath)) {
		const overwrite = await confirm({ message: `"${outputPath}" already exists. Overwrite it?`, default: false });
		if (!overwrite) {
			console.log('Aborted - the existing configuration file was not changed.');
			return;
		}
	}

	fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
	console.log(`\nWrote configuration to "${outputPath}".`);

	const runNow = await confirm({ message: 'Fetch Game Pass data with this configuration now?', default: true });
	if (runNow) {
		await run(config);
	}
}
