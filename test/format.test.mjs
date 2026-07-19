// Description: Offline tests for the Game Pass property formatting helpers (output shaping, extractors, store-page slug)

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { formatData, getStorePageUrl, getCategories, getImages, getReleaseDate, getUserRating, getPricing } from '../js/gamePass.js';
import { initConfig } from '../js/utils.js';

// A shared temp output directory so initConfig's setupOutput never writes into the repo
const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'gpa-format-'));
after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));

// Point CONFIG at the temp directory while setting the fields a given test needs
function useConfig(overrides = {}) {
	initConfig({ language: 'en-us', treatEmptyStringsAsNull: true, outputDirectory, ...overrides });
}

// A minimal display-catalog product with the fields the extractors read
function product(overrides = {}) {
	return {
		ProductId: 'ABC123',
		LocalizedProperties: [{ ProductTitle: 'Halo Infinite', DeveloperName: '343 Industries', PublisherName: 'Xbox Game Studios' }],
		Properties: { Category: 'Shooter', Categories: ['Action', 'Shooter'] },
		...overrides
	};
}

describe('formatData output shaping', () => {
	it('produces an array keyed by insertion order', () => {
		useConfig({ outputFormat: 'array', includedProperties: { productTitle: true } });
		const out = formatData({ Products: [product(), product({ ProductId: 'D2', LocalizedProperties: [{ ProductTitle: 'Forza' }] })] }, 'console');
		assert.ok(Array.isArray(out));
		assert.deepEqual(out, [{ productTitle: 'Halo Infinite' }, { productTitle: 'Forza' }]);
	});

	it('keys a dictionary by productId', () => {
		useConfig({ outputFormat: 'productId', includedProperties: { productTitle: true } });
		const out = formatData({ Products: [product()] }, 'console');
		assert.deepEqual(out, { ABC123: { productTitle: 'Halo Infinite' } });
	});

	it('keys a dictionary by productTitle and disambiguates duplicate titles', () => {
		useConfig({ outputFormat: 'productTitle', includedProperties: { productId: true } });
		const out = formatData({ Products: [product(), product({ ProductId: 'DEF456' })] }, 'console');
		assert.deepEqual(Object.keys(out), ['Halo Infinite', 'Halo Infinite (DEF456)']);
		assert.equal(out['Halo Infinite'].productId, 'ABC123');
		assert.equal(out['Halo Infinite (DEF456)'].productId, 'DEF456');
	});

	it('keys a dictionary by rolling integer for 0-indexed', () => {
		useConfig({ outputFormat: '0-indexed', includedProperties: { productTitle: true } });
		const out = formatData({ Products: [product(), product({ ProductId: 'D2' })] }, 'console');
		assert.deepEqual(Object.keys(out), ['0', '1']);
	});

	it('disambiguates a duplicate productId instead of silently dropping a game', () => {
		useConfig({ outputFormat: 'productId', includedProperties: { productTitle: true } });
		// Both products share ABC123; the second must not overwrite the first
		const out = formatData({ Products: [product(), product({ LocalizedProperties: [{ ProductTitle: 'Halo 2' }] })] }, 'console');
		assert.equal(Object.keys(out).length, 2, 'no game may be dropped when ProductIds collide');
		assert.ok('ABC123' in out);
	});
});

describe('getImages', () => {
	const prop = { enabled: true, imageTypes: { Logo: -1 } };

	it('collects image URIs by purpose, prefixing bare //-URIs with https:', () => {
		const game = { LocalizedProperties: [{ Images: [{ ImagePurpose: 'Logo', Uri: '//cdn/logo.png' }, { ImagePurpose: 'Logo', Uri: 'https://cdn/logo2.png' }] }] };
		assert.deepEqual(getImages(game, prop).Logo, ['https://cdn/logo.png', 'https://cdn/logo2.png']);
	});

	it('skips an image entry with no Uri instead of crashing the whole task (regression)', () => {
		const game = { LocalizedProperties: [{ Images: [{ ImagePurpose: 'Logo' }, { ImagePurpose: 'Logo', Uri: 'https://cdn/ok.png' }] }] };
		assert.deepEqual(getImages(game, prop).Logo, ['https://cdn/ok.png']);
	});

	it('returns undefined when disabled', () => {
		assert.equal(getImages({}, { enabled: false }), undefined);
	});
});

describe('getReleaseDate, getUserRating and getPricing extractors', () => {
	it('formats a release date as a plain date', () => {
		useConfig();
		const game = { MarketProperties: [{ OriginalReleaseDate: '2021-12-08T00:00:00.0000000Z' }] };
		assert.equal(getReleaseDate(game, { enabled: true, format: 'date' }).split('T')[0], '2021-12-08');
	});

	it('uses the empty-value placeholder for a missing release date', () => {
		useConfig({ treatEmptyStringsAsNull: true });
		assert.equal(getReleaseDate({}, { enabled: true, format: 'date' }), null);
	});

	it('selects the user rating by interval label and can format it as a percentage', () => {
		useConfig();
		const game = { MarketProperties: [{ UsageData: [{ AggregateTimeSpan: 'AllTime', AverageRating: 4 }] }] };
		assert.equal(getUserRating(game, { enabled: true, aggregationInterval: 'AllTime', format: 'percentage' }), 0.8);
	});

	it('preserves a zero price and reads the currency code', () => {
		useConfig();
		const game = { DisplaySkuAvailabilities: [{ Availabilities: [{ OrderManagementData: { Price: { CurrencyCode: 'USD', ListPrice: 0 } } }] }] };
		const out = getPricing(game, { enabled: true, priceTypes: ['ListPrice'], missingPricePolicy: 'useNull' });
		assert.equal(out.currencyCode, 'USD');
		assert.equal(out.ListPrice, 0);
	});
});

describe('formatData property extraction', () => {
	it('includes only the requested properties', () => {
		useConfig({ outputFormat: 'array', includedProperties: { productTitle: true, productId: true, developerName: true, publisherName: true } });
		const [entry] = formatData({ Products: [product()] }, 'console');
		assert.deepEqual(entry, {
			productTitle: 'Halo Infinite',
			productId: 'ABC123',
			developerName: '343 Industries',
			publisherName: 'Xbox Game Studios'
		});
	});

	it('uses null for an empty value when treatEmptyStringsAsNull is true', () => {
		useConfig({ outputFormat: 'array', treatEmptyStringsAsNull: true, includedProperties: { developerName: true } });
		const [entry] = formatData({ Products: [product({ LocalizedProperties: [{ ProductTitle: 'X', DeveloperName: '' }] })] }, 'console');
		assert.equal(entry.developerName, null);
	});

	it('uses an empty string for an empty value when treatEmptyStringsAsNull is false', () => {
		useConfig({ outputFormat: 'array', treatEmptyStringsAsNull: false, includedProperties: { developerName: true } });
		const [entry] = formatData({ Products: [product({ LocalizedProperties: [{ ProductTitle: 'X', DeveloperName: '' }] })] }, 'console');
		assert.equal(entry.developerName, '');
	});
});

describe('getStorePageUrl', () => {
	it('builds a slugged Xbox store URL from the title and product ID', () => {
		useConfig({ language: 'en-us' });
		assert.equal(getStorePageUrl(product(), true), 'https://www.xbox.com/en-us/games/store/halo-infinite/ABC123');
	});

	it('collapses punctuation and repeated separators into single dashes', () => {
		useConfig({ language: 'de-de' });
		const url = getStorePageUrl(product({ LocalizedProperties: [{ ProductTitle: "Marvel's Guardians: The Game!!" }] }), true);
		assert.equal(url, 'https://www.xbox.com/de-de/games/store/marvel-s-guardians-the-game/ABC123');
	});

	it('returns the empty-value placeholder when the title or ID is missing', () => {
		useConfig({ treatEmptyStringsAsNull: true });
		assert.equal(getStorePageUrl(product({ ProductId: '' }), true), null);
	});
});

describe('getCategories', () => {
	it('merges the main Category into the Categories list without duplicating it', () => {
		useConfig();
		assert.deepEqual(getCategories(product(), true), ['Action', 'Shooter']);
	});

	it('appends the main Category when it is not already listed', () => {
		useConfig();
		assert.deepEqual(getCategories(product({ Properties: { Category: 'RPG', Categories: ['Action'] } }), true), ['Action', 'RPG']);
	});

	it('returns undefined when the property is disabled', () => {
		useConfig();
		assert.equal(getCategories(product(), false), undefined);
	});
});
