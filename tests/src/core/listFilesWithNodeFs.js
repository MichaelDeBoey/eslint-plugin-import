import { expect } from 'chai';
import path from 'path';
import mockProperty from 'mock-property';

import listFilesWithNodeFs from 'core/listFilesWithNodeFs';
import { getFilename } from '../utils';

// Fixture layout under tests/files/listFilesWithNodeFs/:
//   README.md   top.js   top.ts
//   src/a.js    src/a.ts    src/b.js    src/sub/b.js
//   app/c.js              ← peer of src/ (named to avoid the root .gitignore's `lib/` rule)
//   .hidden/h.js          ← dotfile dir, must be skipped
//   node_modules/d.js     ← node_modules, must be skipped
const root = getFilename('listFilesWithNodeFs');
const f = (...segments) => path.join(root, ...segments);

describe('listFilesWithNodeFs', function () {
  it('walks a directory recursively and filters by extension', function () {
    expect(listFilesWithNodeFs([root], ['.js']).sort()).to.deep.equal([
      f('app', 'c.js'),
      f('src', 'a.js'),
      f('src', 'b.js'),
      f('src', 'sub', 'b.js'),
      f('top.js'),
    ]);
  });

  it('skips dot-directories and node_modules', function () {
    const files = listFilesWithNodeFs([root], ['.js']);
    expect(files.some((file) => file.indexOf(`${path.sep}.hidden${path.sep}`) > -1)).to.equal(false);
    expect(files.some((file) => file.indexOf(`${path.sep}node_modules${path.sep}`) > -1)).to.equal(false);
  });

  it('returns matches for multiple extensions', function () {
    expect(listFilesWithNodeFs([root], ['.js', '.ts']).sort()).to.deep.equal([
      f('app', 'c.js'),
      f('src', 'a.js'),
      f('src', 'a.ts'),
      f('src', 'b.js'),
      f('src', 'sub', 'b.js'),
      f('top.js'),
      f('top.ts'),
    ]);
  });

  it('accepts extensions with or without a leading dot', function () {
    expect(listFilesWithNodeFs([root], ['js']).sort()).to.deep.equal(
      listFilesWithNodeFs([root], ['.js']).sort(),
    );
  });

  it('passes through a direct file path matching the extension', function () {
    expect(listFilesWithNodeFs([f('top.js')], ['.js'])).to.deep.equal([f('top.js')]);
  });

  it('omits a direct file path whose extension is not requested', function () {
    expect(listFilesWithNodeFs([f('README.md')], ['.js'])).to.deep.equal([]);
  });

  it('silently skips non-existent paths', function () {
    expect(() => listFilesWithNodeFs([f('does-not-exist')], ['.js'])).to.not.throw();
    expect(listFilesWithNodeFs([f('does-not-exist')], ['.js'])).to.deep.equal([]);
  });

  it('silently skips a glob whose base directory does not exist', function () {
    expect(() => listFilesWithNodeFs([f('does-not-exist', '*.js')], ['.js'])).to.not.throw();
    expect(listFilesWithNodeFs([f('does-not-exist', '*.js')], ['.js'])).to.deep.equal([]);
  });

  it('matches a single-star glob only in its base directory', function () {
    expect(listFilesWithNodeFs([f('src', '*.js')], ['.js']).sort()).to.deep.equal([
      f('src', 'a.js'),
      f('src', 'b.js'),
    ]);
  });

  it('excludes siblings that the glob rejects', function () {
    expect(listFilesWithNodeFs([f('src', 'a*.js')], ['.js']).sort()).to.deep.equal([
      f('src', 'a.js'),
    ]);
  });

  it('recurses for a globstar pattern', function () {
    expect(listFilesWithNodeFs([f('src', '**', '*.js')], ['.js']).sort()).to.deep.equal([
      f('src', 'a.js'),
      f('src', 'b.js'),
      f('src', 'sub', 'b.js'),
    ]);
  });

  it('expands brace patterns', function () {
    expect(listFilesWithNodeFs([f('{src,app}', '*.js')], ['.js']).sort()).to.deep.equal([
      f('app', 'c.js'),
      f('src', 'a.js'),
      f('src', 'b.js'),
    ]);
  });

  it('returns an empty array for empty src', function () {
    expect(listFilesWithNodeFs([], ['.js'])).to.deep.equal([]);
  });
});

describe('listFilesWithNodeFs, flat-config ignores', function () {
  const igRoot = getFilename('listFilesWithNodeFs-flatignores');
  const g = (...segments) => path.join(igRoot, ...segments);

  it('honors the flat config global `ignores` resolved from cwd', function () {
    expect(listFilesWithNodeFs([igRoot], ['.js'], igRoot).sort()).to.deep.equal([
      g('eslint.config.js'),
      g('keep.js'),
      g('src', 'a.js'),
    ]);
  });

  it('does not filter when no flat config is resolvable from cwd', function () {
    const noConfigCwd = getFilename('listFilesWithNodeFs');
    expect(listFilesWithNodeFs([igRoot], ['.js'], noConfigCwd).sort()).to.deep.equal([
      g('eslint.config.js'),
      g('ignored-dir', 'nested.js'),
      g('ignored-file.js'),
      g('keep.js'),
      g('src', 'a.js'),
    ]);
  });

  it('throws, rather than silently scanning ignored files, when a flat config has global `ignores` but no config-array implementation resolves', function () {
    // stub every installed config-array copy (resolved both directly and from eslint's dir, as the
    // code does) so accessing `ConfigArray` throws; copies that aren't installed already throw.
    const eslintDir = path.dirname(require.resolve('eslint/package.json'));
    const resolvedPaths = new Set();
    ['@eslint/config-array', '@humanwhocodes/config-array'].forEach((name) => {
      [null, { paths: [eslintDir] }].forEach((opts) => {
        try {
          resolvedPaths.add(opts ? require.resolve(name, opts) : require.resolve(name));
        } catch (e) { /* not installed in this layout */ }
      });
    });
    const stub = { loaded: true, exports: { get ConfigArray() { throw new Error('mocked: module absent'); } } };
    const restores = [...resolvedPaths].map((resolved) => mockProperty(require.cache, resolved, { value: stub }));
    try {
      // a fresh cwd (not used by other tests) avoids the module-level predicate cache
      expect(() => listFilesWithNodeFs([igRoot], ['.js'], g('src'))).to.throw(/@eslint\/config-array/);
    } finally {
      restores.forEach((restore) => restore());
    }
  });
});
