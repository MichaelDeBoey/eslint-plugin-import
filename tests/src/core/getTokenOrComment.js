import { expect } from 'chai';

import { getTokenOrCommentAfter, getTokenOrCommentBefore } from 'core/getTokenOrComment';

// These helpers feature-detect the `SourceCode` API that ESLint v10 removed, so both
// branches need to be exercised regardless of which `eslint` version the tests run on.
describe('getTokenOrComment', function () {
  const node = { type: 'Node' };
  const token = { type: 'Token' };

  describe('getTokenOrCommentAfter', function () {
    it('uses sourceCode.getTokenOrCommentAfter when present (ESLint < 10)', function () {
      const calls = [];
      const sourceCode = {
        getTokenOrCommentAfter(nodeOrToken) {
          calls.push(nodeOrToken);
          return token;
        },
      };
      expect(getTokenOrCommentAfter(sourceCode, node)).to.equal(token);
      expect(calls).to.deep.equal([node]);
    });

    it('falls back to getTokenAfter with includeComments (ESLint >= 10)', function () {
      let received;
      const sourceCode = {
        getTokenAfter(nodeOrToken, options) {
          received = { nodeOrToken, options };
          return token;
        },
      };
      expect(getTokenOrCommentAfter(sourceCode, node)).to.equal(token);
      expect(received).to.deep.equal({ nodeOrToken: node, options: { includeComments: true } });
    });
  });

  describe('getTokenOrCommentBefore', function () {
    it('uses sourceCode.getTokenOrCommentBefore when present (ESLint < 10)', function () {
      const calls = [];
      const sourceCode = {
        getTokenOrCommentBefore(nodeOrToken) {
          calls.push(nodeOrToken);
          return token;
        },
      };
      expect(getTokenOrCommentBefore(sourceCode, node)).to.equal(token);
      expect(calls).to.deep.equal([node]);
    });

    it('falls back to getTokenBefore with includeComments (ESLint >= 10)', function () {
      let received;
      const sourceCode = {
        getTokenBefore(nodeOrToken, options) {
          received = { nodeOrToken, options };
          return token;
        },
      };
      expect(getTokenOrCommentBefore(sourceCode, node)).to.equal(token);
      expect(received).to.deep.equal({ nodeOrToken: node, options: { includeComments: true } });
    });
  });
});
