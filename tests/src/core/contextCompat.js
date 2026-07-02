import { expect } from 'chai';

import {
  getAncestors,
  getCWD,
  getDeclaredVariables,
  getFilename,
  getPhysicalFilename,
  getScope,
  getSourceCode,
} from 'eslint-module-utils/contextCompat';

// These shims feature-detect the modern `SourceCode`/`context` API (ESLint 8+) and fall
// back to the deprecated `context.*` methods. Both branches of each need exercising so the
// modern paths are covered regardless of which eslint version the surrounding tests run on.
describe('contextCompat', function () {
  const node = { type: 'Identifier' };

  describe('getSourceCode', function () {
    it('returns context.sourceCode when present', function () {
      const sourceCode = {};
      expect(getSourceCode({ sourceCode })).to.equal(sourceCode);
    });

    it('falls back to context.getSourceCode()', function () {
      const sourceCode = {};
      expect(getSourceCode({ getSourceCode() { return sourceCode; } })).to.equal(sourceCode);
    });
  });

  describe('getAncestors', function () {
    it('uses sourceCode.getAncestors when available', function () {
      const ancestors = [node];
      expect(getAncestors({ sourceCode: { getAncestors() { return ancestors; } } }, node)).to.equal(ancestors);
    });

    it('falls back to context.getAncestors() when sourceCode lacks it', function () {
      const ancestors = [node];
      expect(getAncestors({ getSourceCode() { return {}; }, getAncestors() { return ancestors; } }, node)).to.equal(ancestors);
    });
  });

  describe('getCWD', function () {
    it('uses .cwd when available', function () {
      const fakeContext = { cwd: 'foo', getCwd() { return 'bar'; } };
      expect(getCWD(fakeContext)).to.equal('foo');
    });

    it('falls back to getCwd() when .cwd is not available', function () {
      const fakeContext = { getCwd() { return 'bar'; } };
      expect(getCWD(fakeContext)).to.equal('bar');
    });
  });

  describe('getDeclaredVariables', function () {
    it('uses sourceCode.getDeclaredVariables when available', function () {
      const variables = [{ name: 'x' }];
      expect(getDeclaredVariables({ sourceCode: { getDeclaredVariables() { return variables; } } }, node)).to.equal(variables);
    });

    it('falls back to context.getDeclaredVariables() when sourceCode lacks it', function () {
      const variables = [{ name: 'x' }];
      expect(getDeclaredVariables({ getSourceCode() { return {}; }, getDeclaredVariables() { return variables; } }, node)).to.equal(variables);
    });
  });

  describe('getScope', function () {
    it('uses sourceCode.getScope when available', function () {
      const scope = { type: 'module' };
      expect(getScope({ sourceCode: { getScope() { return scope; } } }, node)).to.equal(scope);
    });

    it('falls back to context.getScope() when sourceCode lacks it', function () {
      const scope = { type: 'module' };
      expect(getScope({ getSourceCode() { return {}; }, getScope() { return scope; } }, node)).to.equal(scope);
    });
  });

  describe('getFilename', function () {
    it('returns context.filename when present', function () {
      expect(getFilename({ filename: 'flat.js' })).to.equal('flat.js');
    });

    it('falls back to context.getFilename()', function () {
      expect(getFilename({ getFilename() { return 'legacy.js'; } })).to.equal('legacy.js');
    });
  });

  describe('getPhysicalFilename', function () {
    it('returns context.physicalFilename when present', function () {
      expect(getPhysicalFilename({ physicalFilename: 'flat.js' })).to.equal('flat.js');
    });

    it('falls back to context.getPhysicalFilename()', function () {
      expect(getPhysicalFilename({ getPhysicalFilename() { return 'legacy.js'; } })).to.equal('legacy.js');
    });

    it('falls back to the filename when no physical filename is available', function () {
      expect(getPhysicalFilename({ filename: 'fallback.js' })).to.equal('fallback.js');
    });
  });
});
