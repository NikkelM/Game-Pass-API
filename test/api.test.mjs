// Description: Integration tests that verify the Xbox Game Pass APIs the tool depends on are still reachable and return the expected shape
// They need no credentials, so the weekly scheduled run catches when Microsoft changes or retires an endpoint

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// The sigls (catalog) list IDs per pass type, mirrored from index.js
const SIGL_IDS = {
	console: 'f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e',
	pc: 'fdd9e2a7-0fee-49f6-ad69-4354098401ff',
	eaPlay: 'b8900d09-a491-44cc-916e-32b5acae621b'
};
const MARKET = 'US';
const LANGUAGE = 'en-us';

// Retry a couple of times on a network error or 5xx so a transient hiccup does not fail the run
async function fetchWithRetry(url) {
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const response = await fetch(url);
			if (response.status >= 500 && attempt < 3) continue;
			return response;
		} catch (error) {
			if (attempt < 3) continue;
			throw error;
		}
	}
}

describe('Game Pass catalog (sigls) endpoint', () => {
	for (const [passType, siglId] of Object.entries(SIGL_IDS)) {
		it(`returns a non-empty list of game IDs for ${passType}`, async () => {
			const url = `https://catalog.gamepass.com/sigls/v2?id=${siglId}&language=${LANGUAGE}&market=${MARKET}`;
			const response = await fetchWithRetry(url);
			assert.notEqual(response.status, 404, 'sigls endpoint returned 404 - likely retired or moved');
			assert.equal(response.status, 200, `sigls endpoint returned ${response.status}`);

			const data = await response.json();
			assert.ok(Array.isArray(data), 'sigls response is not an array');

			const ids = data.filter((entry) => entry.id).map((entry) => entry.id);
			assert.ok(ids.length > 0, `no game IDs returned for ${passType}`);
		});
	}
});

describe('Microsoft display catalog (products) endpoint', () => {
	it('returns products with the fields the tool relies on', async () => {
		// Seed the test with real, currently-available game IDs from the console list
		const siglsUrl = `https://catalog.gamepass.com/sigls/v2?id=${SIGL_IDS.console}&language=${LANGUAGE}&market=${MARKET}`;
		const siglsResponse = await fetchWithRetry(siglsUrl);
		assert.equal(siglsResponse.status, 200, 'could not fetch the console game list to seed the products test');

		const ids = (await siglsResponse.json()).filter((entry) => entry.id).map((entry) => entry.id);
		assert.ok(ids.length > 0, 'no console game IDs to test with');

		const productsUrl = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${ids.slice(0, 5)}&market=${MARKET}&languages=${LANGUAGE}`;
		const response = await fetchWithRetry(productsUrl);
		assert.notEqual(response.status, 404, 'products endpoint returned 404 - likely retired or moved');
		assert.equal(response.status, 200, `products endpoint returned ${response.status}`);

		const data = await response.json();
		assert.ok(Array.isArray(data.Products), 'products response has no Products array');
		assert.ok(data.Products.length > 0, 'products response Products array is empty');

		const products = data.Products;

		// ProductId and a localized ProductTitle are on every game (they key and name the output)
		assert.ok(products.every((product) => typeof product.ProductId === 'string'), 'some products are missing ProductId');
		assert.ok(
			products.every((product) => Array.isArray(product.LocalizedProperties) && typeof product.LocalizedProperties[0]?.ProductTitle === 'string'),
			'some products are missing a localized ProductTitle'
		);

		// These structures are not on every single game (the extractors guard for that), but the API should still return them for at least one product - if none do, the shape has changed
		assert.ok(products.some((product) => Array.isArray(product.MarketProperties) && product.MarketProperties.length > 0), 'no product had MarketProperties (release date / rating source)');
		assert.ok(products.some((product) => product.Properties), 'no product had Properties (categories source)');
		assert.ok(products.some((product) => Array.isArray(product.DisplaySkuAvailabilities)), 'no product had DisplaySkuAvailabilities (pricing source)');
	});
});
