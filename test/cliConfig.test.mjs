// Description: Offline tests for the flag-driven config builder (js/cliConfig.js) and the CLI flag-driven path

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildConfig, BOOLEAN_PROPERTIES } from '../js/cliConfig.js';
import { validateConfigResult } from '../js/utils.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'bin', 'cli.js');

describe('buildConfig', () => {
	it('builds a schema-valid config from all defaults', () => {
		const config = buildConfig({});
		assert.deepEqual(config.markets, ['US']);
		assert.equal(config.language, 'en-us');
		assert.deepEqual(config.platformsToFetch, ['console', 'pc', 'eaPlay']);
		assert.equal(config.outputFormat, 'array');
		assert.deepEqual(config.includedProperties, { productTitle: true });
		assert.equal(config.treatEmptyStringsAsNull, true);
		assert.equal(config.keepCompleteProperties, false);
		assert.equal(validateConfigResult(config).errors.length, 0);
	});

	it('parses and normalizes markets, platforms, language, format and properties', () => {
		const config = buildConfig({ markets: 'us,de', platforms: 'console,eaplay', language: 'DE-DE', format: 'productTitle', properties: 'productId,storePage' });
		assert.deepEqual(config.markets, ['US', 'DE']);
		assert.deepEqual(config.platformsToFetch, ['console', 'eaPlay']);
		assert.equal(config.language, 'de-de');
		assert.equal(config.outputFormat, 'productTitle');
		assert.deepEqual(config.includedProperties, { productId: true, storePage: true });
		assert.equal(validateConfigResult(config).errors.length, 0);
	});

	it('deduplicates repeated market codes', () => {
		assert.deepEqual(buildConfig({ markets: 'US,us,DE' }).markets, ['US', 'DE']);
	});

	it('applies --keep-complete, --no-treat-empty-as-null and --out', () => {
		const config = buildConfig({ keepComplete: true, treatEmptyAsNull: false, out: 'custom' });
		assert.equal(config.keepCompleteProperties, true);
		assert.equal(config.treatEmptyStringsAsNull, false);
		assert.equal(config.outputDirectory, 'custom');
	});

	it('throws on an invalid market, platform, language, format or property', () => {
		assert.throws(() => buildConfig({ markets: 'XX' }), /invalid market code/);
		assert.throws(() => buildConfig({ platforms: 'switch' }), /invalid platform/);
		assert.throws(() => buildConfig({ language: 'xx-yy' }), /invalid language/);
		assert.throws(() => buildConfig({ format: 'nope' }), /invalid output format/);
		assert.throws(() => buildConfig({ properties: 'bogus' }), /invalid property/);
	});

	it('only exposes the flat boolean includedProperties as flags', () => {
		assert.deepEqual([...BOOLEAN_PROPERTIES].sort(), ['categories', 'developerName', 'productId', 'productTitle', 'publisherName', 'storePage']);
	});
});

describe('CLI flag-driven mode', () => {
	it('reports an invalid market from flags before fetching', () => {
		const result = spawnSync(process.execPath, [cli, '--markets', 'XX'], { encoding: 'utf8' });
		assert.notEqual(result.status, 0);
		assert.match((result.stdout ?? '') + (result.stderr ?? ''), /invalid market code/);
	});
});
