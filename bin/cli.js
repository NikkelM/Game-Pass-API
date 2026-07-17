#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

import { loadConfig, validateConfig, saveConfigToFile } from '../js/utils.js';
import { run } from '../js/gamePass.js';
import { runWizard } from '../js/wizard.js';
import { buildConfig, usedBuildingFlags } from '../js/cliConfig.js';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

const program = new Command();

program
	.name('game-pass-api')
	.description('Fetch all games on Xbox Game Pass (Console, PC and EA Play) with configurable properties, driven by a config.json.')
	.version(pkg.version);

program
	.command('run', { isDefault: true })
	.description('Fetch Game Pass data using a config file, or entirely from flags')
	.option('-c, --config <path>', 'path to a config.json (defaults to ./config.json)')
	.option('--from <dir>', 're-format previously-saved completeGameProperties_*.json files in <dir> instead of fetching (needs an earlier run with keepCompleteProperties)')
	.option('-o, --out <dir>', 'directory to write output files to (overrides outputDirectory; default: output)')
	.option('--markets <codes>', 'comma-separated market codes to fetch, e.g. US,DE (flag-driven mode)')
	.option('--platforms <list>', 'comma-separated platforms: console,pc,eaPlay (flag-driven mode)')
	.option('--language <code>', 'language/locale for game properties, e.g. en-us (flag-driven mode)')
	.option('--format <format>', 'output format: array, productTitle, productId or 0-indexed (flag-driven mode)')
	.option('--properties <list>', 'comma-separated properties to include: productTitle,productId,developerName,publisherName,categories,storePage (flag-driven mode)')
	.option('--keep-complete', 'also keep the complete, unfiltered API response per platform and market (flag-driven mode)')
	.option('--no-treat-empty-as-null', 'keep empty strings instead of converting them to null (flag-driven mode)')
	.option('--save-config [path]', 'also write the assembled configuration to a file for reuse (default: config.json; flag-driven mode)')
	.addHelpText('after', '\nProvide a config.json (in the current directory or via --config), or build one from flags with --markets/--platforms/--properties etc. (unspecified options use their defaults).\nRun "game-pass-api init" to create a config interactively, or see the README and config.schema.json for every option.')
	.action(async (options, command) => {
		// Build the config entirely from flags when config-building flags are used (and no explicit --config file)
		if (!options.config && usedBuildingFlags(command)) {
			const config = buildConfig(options);
			validateConfig(config);
			if (options.saveConfig) {
				await saveConfigToFile(config, options.saveConfig === true ? 'config.json' : options.saveConfig);
			}
			await run(config, { fromDirectory: options.from });
			return;
		}
		// Start the interactive wizard when invoked with no options and no config to load, but only in an interactive shell so scripts still get the friendly no-config error
		if (!options.config && !options.from && !options.out && !fs.existsSync('config.json') && process.stdin.isTTY) {
			await runWizard('config.json');
			return;
		}
		const config = loadConfig(options.config);
		if (options.out) {
			config.outputDirectory = options.out;
		}
		await run(config, { fromDirectory: options.from });
	});

program
	.command('init')
	.description('Interactively create a configuration file')
	.option('-o, --output <path>', 'where to write the configuration file', 'config.json')
	.action(async (options) => {
		await runWizard(options.output);
	});

program.showHelpAfterError('(run with --help to see available commands)');

try {
	await program.parseAsync(process.argv);
} catch (error) {
	console.error('Error: ' + (error?.message ?? error));
	process.exit(1);
}
