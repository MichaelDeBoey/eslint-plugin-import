/**
 * Cross-version helpers for fetching the token or comment adjacent to a node/token.
 *
 * ESLint v10 removed `SourceCode#getTokenOrCommentBefore` and
 * `SourceCode#getTokenOrCommentAfter`; the supported replacement is
 * `getTokenBefore`/`getTokenAfter` with the `{ includeComments: true }` option.
 * Feature-detect the old methods so both old and new `eslint` keep working.
 */

/**
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('eslint').AST.Token | import('estree').Node} nodeOrToken
 */
export function getTokenOrCommentAfter(sourceCode, nodeOrToken) {
  return sourceCode.getTokenOrCommentAfter
    ? sourceCode.getTokenOrCommentAfter(nodeOrToken)
    : sourceCode.getTokenAfter(nodeOrToken, { includeComments: true });
}

/**
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('eslint').AST.Token | import('estree').Node} nodeOrToken
 */
export function getTokenOrCommentBefore(sourceCode, nodeOrToken) {
  return sourceCode.getTokenOrCommentBefore
    ? sourceCode.getTokenOrCommentBefore(nodeOrToken)
    : sourceCode.getTokenBefore(nodeOrToken, { includeComments: true });
}
