import fs from 'fs';
import { dirname, join, resolve } from 'path';
import semver from 'semver';

// the sync-loadable subset of ESLint's flat config filenames, in its lookup priority order.
// `.ts`/`.mts`/`.cts` are intentionally omitted: they require a loader and cannot be `require`d.
// eslint-disable-next-line no-extra-parens
const CONFIG_FILENAMES = /** @type {const} */ (['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs']);

const cache = new Map();

/**
 * Walk up from `cwd` looking for a flat config file, mirroring ESLint's own lookup.
 * @param {string} cwd - directory to start searching from
 * @returns {string | null} absolute path to the flat config file, or `null` if none found
 */
function findConfigFile(cwd) {
  const dir = resolve(cwd);
  for (let i = 0; i < CONFIG_FILENAMES.length; i++) {
    const candidate = join(dir, CONFIG_FILENAMES[i]);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  const parent = dirname(dir);
  return parent === dir ? null : findConfigFile(parent);
}

function flattenConfig(item, acc) {
  if (Array.isArray(item)) {
    item.forEach((sub) => flattenConfig(sub, acc));
  } else if (item) {
    acc.push(item);
  }
  return acc;
}

/**
 * `require` the flat config and flatten it to a list of config objects.
 * `require` handles CommonJS and, on Node >= 20.19, ESM without top-level await;
 * anything else (TS configs, ESM with top-level await) throws and is handled by the caller.
 * @param {string} configPath - absolute path to the flat config file
 * @returns {object[]} flattened list of config objects
 */
function loadConfigObjects(configPath) {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const loaded = require(configPath);
  const config = loaded && loaded.default ? loaded.default : loaded;
  return flattenConfig(config, []);
}

// A flat config object is a "global ignores" entry when its only keys are `ignores` (optionally `name`).
// Only these affect whether a file is linted at all; `ignores` paired with `files`/`rules`/etc. merely
// scopes that block, so it is irrelevant to which files `no-unused-modules` should scan.
function isGlobalIgnores(configObject) {
  if (!configObject || typeof configObject !== 'object' || !Array.isArray(configObject.ignores)) {
    return false;
  }
  return Object.keys(configObject).every((key) => key === 'ignores' || key === 'name');
}

// Resolve `name` from ESLint's own install rather than depending on it directly: a declared
// dependency/peer would warn or install on old npm/Node (which neither understand
// `peerDependenciesMeta` nor ever reach flat config), while ESLint itself always ships the engine.
// Resolving from ESLint's directory also works under pnpm and uses the exact copy ESLint uses.
function resolveConfigArray(name) {
  try {
    // eslint-disable-next-line global-require
    const eslintDir = dirname(require.resolve('eslint/package.json'));
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(require.resolve(name, { paths: [eslintDir] })).ConfigArray;
  } catch (resolveFromEslintError) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(name).ConfigArray;
  }
}

// Flat config only exists as of ESLint 8.21 (`FlatESLint` and the `ESLINT_USE_FLAT_CONFIG` opt-in):
// older versions never read `eslint.config.js`, so a discovered one is inert there and filtering by
// its `ignores` would drop files that ESLint itself would lint.
function supportsFlatConfig() {
  try {
    // eslint-disable-next-line global-require
    return semver.gte(require('eslint/package.json').version, '8.21.0');
  } catch (eslintResolveError) {
    // `eslint` itself is not resolvable: assume a modern, flat-config-capable install.
    return true;
  }
}

// The minimum usable config-array API: `normalizeSync` plus a per-file ignore check - `isFileIgnored`
// since v0.11 (and in every `@eslint/config-array`), or its earlier spelling `isIgnored` in v0.9–v0.10
// (shipped with ESLint 8.21–8.27). ESLint 7.32 ships v0.5, which predates all of these.
function isUsableConfigArray(ConfigArray) {
  return typeof ConfigArray === 'function'
    && typeof ConfigArray.prototype.normalizeSync === 'function'
    && (typeof ConfigArray.prototype.isFileIgnored === 'function' || typeof ConfigArray.prototype.isIgnored === 'function');
}

function tryResolveConfigArray(name) {
  try {
    const ConfigArray = resolveConfigArray(name);
    return isUsableConfigArray(ConfigArray) ? ConfigArray : null;
  } catch (resolveError) {
    return null;
  }
}

// ESLint 9.4+/10 ship the flat config engine as `@eslint/config-array`; ESLint 8 and 9.0–9.3 ship the
// same API under its pre-fork name `@humanwhocodes/config-array`. Resolved lazily (only on this
// flat-config fallback path). If we are honoring flat config but neither resolves, that is a broken
// install - throw rather than silently scan ignored files.
function getConfigArray() {
  const ConfigArray = tryResolveConfigArray('@eslint/config-array') || tryResolveConfigArray('@humanwhocodes/config-array');
  if (!ConfigArray) {
    throw new Error('eslint-plugin-import: honoring flat config `ignores` in `no-unused-modules` requires `@eslint/config-array` (ESLint 9.4+) or `@humanwhocodes/config-array` (ESLint 8–9.3); neither could be loaded.');
  }
  return ConfigArray;
}

/**
 * Build an ignore predicate from the flat config discoverable at `cwd`, using ESLint's own
 * config-array implementation so matching is identical to what ESLint would do.
 * @param {string} cwd - directory to resolve the flat config from
 * @returns {{ isFileIgnored: (p: string) => boolean, isDirectoryIgnored: (p: string) => boolean } | null}
 *   a predicate over absolute paths, or `null` when no flat config / global ignores apply.
 * @throws if, on a flat-config-capable ESLint, a flat config with global `ignores` is present but no
 *   usable config-array implementation resolves.
 */
function buildPredicate(cwd) {
  if (!supportsFlatConfig()) {
    return null;
  }

  const configPath = findConfigFile(cwd);
  if (!configPath) {
    return null;
  }

  let configObjects;
  try {
    configObjects = loadConfigObjects(configPath);
  } catch (e) {
    // ESM-with-top-level-await, TS configs, or a config that throws on load: degrade to no filtering.
    return null;
  }

  const globalIgnores = configObjects.filter(isGlobalIgnores).map((c) => ({ ignores: c.ignores }));
  if (globalIgnores.length === 0) {
    return null;
  }

  const ConfigArray = getConfigArray();
  // The leading `{ files: ['**'] }` marks every file as "configured" so `isFileIgnored` reflects only
  // the global `ignores` (older config-array treats unconfigured files as ignored). `**` (not `**/*`,
  // which misses top-level files in older versions) matches at every depth. `ignores` are relative to
  // the flat config file's directory, which is ESLint's `basePath`.
  const configs = [{ files: ['**'] }].concat(globalIgnores);
  const configArray = new ConfigArray(configs, { basePath: dirname(configPath), schema: {} });
  configArray.normalizeSync();
  return {
    isFileIgnored: typeof configArray.isFileIgnored === 'function'
      ? (absolutePath) => configArray.isFileIgnored(absolutePath)
      : (absolutePath) => configArray.isIgnored(absolutePath),
    // config-array < v0.11 has no `isDirectoryIgnored`; it only prunes the walk, so files under an
    // ignored directory are still filtered one-by-one by `isFileIgnored` above.
    isDirectoryIgnored: typeof configArray.isDirectoryIgnored === 'function'
      ? (absolutePath) => configArray.isDirectoryIgnored(absolutePath)
      : () => false,
  };
}

/**
 * Resolve (and cache) the flat-config ignore predicate for a given `cwd`.
 * @param {string} [cwd] - directory to resolve the flat config from; defaults to `process.cwd()`
 * @returns {{ isFileIgnored: (p: string) => boolean, isDirectoryIgnored: (p: string) => boolean } | null}
 */
export default function getFlatConfigIgnores(cwd) {
  const key = resolve(cwd || process.cwd());
  if (cache.has(key)) {
    return cache.get(key);
  }
  const predicate = buildPredicate(key);
  cache.set(key, predicate);
  return predicate;
}
