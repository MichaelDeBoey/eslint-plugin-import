import { RuleTester } from '../rule-tester';
import rule from 'rules/extensions';
import { getTSParsers, test, testFilePath, parsers } from '../utils';

const ruleTester = new RuleTester();
const ruleTesterWithTypeScriptImports = new RuleTester({
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
});

ruleTester.run('extensions', rule, {
  valid: [
    test({ code: 'import a from "@/a"' }),
    test({ code: 'import a from "a"' }),
    test({ code: 'import dot from "./file.with.dot"' }),
    test({
      code: 'import a from "a/index.js"',
      options: ['always'],
    }),
    test({
      code: 'import dot from "./file.with.dot.js"',
      options: ['always'],
    }),
    test({
      code: [
        'import a from "a"',
        'import packageConfig from "./package.json"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never' }],
    }),
    test({
      code: [
        'import lib from "./bar"',
        'import component from "./bar.jsx"',
        'import data from "./bar.json"',
      ].join('\n'),
      options: ['never'],
      settings: { 'import/resolve': { extensions: ['.js', '.jsx', '.json'] } },
    }),

    test({
      code: [
        'import bar from "./bar"',
        'import barjson from "./bar.json"',
        'import barhbs from "./bar.hbs"',
      ].join('\n'),
      options: ['always', { js: 'never', jsx: 'never' }],
      settings: { 'import/resolve': { extensions: ['.js', '.jsx', '.json', '.hbs'] } },
    }),

    test({
      code: [
        'import bar from "./bar.js"',
        'import pack from "./package"',
      ].join('\n'),
      options: ['never', { js: 'always', json: 'never' }],
      settings: { 'import/resolve': { extensions: ['.js', '.json'] } },
    }),

    // unresolved (#271/#295)
    test({ code: 'import path from "path"' }),
    test({ code: 'import path from "path"', options: ['never'] }),
    test({ code: 'import path from "path"', options: ['always'] }),
    test({ code: 'import thing from "./fake-file.js"', options: ['always'] }),
    test({ code: 'import thing from "non-package"', options: ['never'] }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
      options: ['ignorePackages'],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
      options: ['always', { ignorePackages: true }],
    }),

    test({
      code: `
        import foo from './foo'
        import bar from './bar'
        import Component from './Component'
        import express from 'express'
      `,
      options: ['never', { ignorePackages: true }],
    }),

    test({
      code: 'import exceljs from "exceljs"',
      options: ['always', { js: 'never', jsx: 'never' }],
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      settings: {
        'import/resolver': {
          node: { extensions: ['.js', '.jsx', '.json'] },
          webpack: { config: 'webpack.empty.config.js' },
        },
      },
    }),

    // export (#964)
    test({
      code: [
        'export { foo } from "./foo.js"',
        'let bar; export { bar }',
      ].join('\n'),
      options: ['always'],
    }),
    test({
      code: [
        'export { foo } from "./foo"',
        'let bar; export { bar }',
      ].join('\n'),
      options: ['never'],
    }),

    // Root packages should be ignored and they are names not files
    test({
      code: [
        'import lib from "pkg.js"',
        'import lib2 from "pgk/package"',
        'import lib3 from "@name/pkg.js"',
      ].join('\n'),
      options: ['never'],
    }),

    // Query strings.
    test({
      code: 'import bare from "./foo?a=True.ext"',
      options: ['never'],
    }),
    test({
      code: 'import bare from "./foo.js?a=True"',
      options: ['always'],
    }),

    test({
      code: [
        'import lib from "pkg"',
        'import lib2 from "pgk/package.js"',
        'import lib3 from "@name/pkg"',
      ].join('\n'),
      options: ['always'],
    }),
  ],

  invalid: [
    test({
      code: 'import a from "a/index.js"',
      errors: [{
        message: 'Unexpected use of file extension "js" for "a/index.js"',
        line: 1,
        column: 15,
      }],
    }),
    test({
      code: 'import dot from "./file.with.dot"',
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension "js" for "./file.with.dot"',
          line: 1,
          column: 17,
        },
      ],
    }),
    test({
      code: [
        'import a from "a/index.js"',
        'import packageConfig from "./package"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never' }],
      settings: { 'import/resolve': { extensions: ['.js', '.json'] } },
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "a/index.js"',
          line: 1,
          column: 15,
        },
        {
          message: 'Missing file extension "json" for "./package"',
          line: 2,
          column: 27,
        },
      ],
    }),
    test({
      code: [
        'import lib from "./bar.js"',
        'import component from "./bar.jsx"',
        'import data from "./bar.json"',
      ].join('\n'),
      options: ['never'],
      settings: { 'import/resolve': { extensions: ['.js', '.jsx', '.json'] } },
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./bar.js"',
          line: 1,
          column: 17,
        },
      ],
    }),
    test({
      code: [
        'import lib from "./bar.js"',
        'import component from "./bar.jsx"',
        'import data from "./bar.json"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never', jsx: 'never' }],
      settings: { 'import/resolve': { extensions: ['.js', '.jsx', '.json'] } },
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./bar.js"',
          line: 1,
          column: 17,
        },
      ],
    }),
    // extension resolve order (#583/#965)
    test({
      code: [
        'import component from "./bar.jsx"',
        'import data from "./bar.json"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never', jsx: 'never' }],
      settings: { 'import/resolve': { extensions: ['.jsx', '.json', '.js'] } },
      errors: [
        {
          message: 'Unexpected use of file extension "jsx" for "./bar.jsx"',
          line: 1,
          column: 23,
        },
      ],
    }),
    test({
      code: 'import "./bar.coffee"',
      errors: [
        {
          message: 'Unexpected use of file extension "coffee" for "./bar.coffee"',
          line: 1,
          column: 8,
        },
      ],
      options: ['never', { js: 'always', jsx: 'always' }],
      settings: { 'import/resolve': { extensions: ['.coffee', '.js'] } },
    }),

    test({
      code: [
        'import barjs from "./bar.js"',
        'import barjson from "./bar.json"',
        'import barnone from "./bar"',
      ].join('\n'),
      options: ['always', { json: 'always', js: 'never', jsx: 'never' }],
      settings: { 'import/resolve': { extensions: ['.js', '.jsx', '.json'] } },
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./bar.js"',
          line: 1,
          column: 19,
        },
      ],
    }),

    test({
      code: [
        'import barjs from "."',
        'import barjs2 from ".."',
      ].join('\n'),
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension "js" for "."',
          line: 1,
          column: 19,
        },
        {
          message: 'Missing file extension "js" for ".."',
          line: 2,
          column: 20,
        },
      ],
    }),

    test({
      code: [
        'import barjs from "./bar.js"',
        'import barjson from "./bar.json"',
        'import barnone from "./bar"',
      ].join('\n'),
      options: ['never', { json: 'always', js: 'never', jsx: 'never' }],
      settings: { 'import/resolve': { extensions: ['.js', '.jsx', '.json'] } },
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./bar.js"',
          line: 1,
          column: 19,
        },
      ],
    }),

    // unresolved (#271/#295)
    test({
      code: 'import thing from "./fake-file.js"',
      options: ['never'],
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./fake-file.js"',
          line: 1,
          column: 19,
        },
      ],
    }),
    test({
      code: 'import thing from "non-package/test"',
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension for "non-package/test"',
          line: 1,
          column: 19,
        },
      ],
    }),

    test({
      code: 'import thing from "@name/pkg/test"',
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension for "@name/pkg/test"',
          line: 1,
          column: 19,
        },
      ],
    }),

    test({
      code: 'import thing from "@name/pkg/test.js"',
      options: ['never'],
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "@name/pkg/test.js"',
          line: 1,
          column: 19,
        },
      ],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component'
        import baz from 'foo/baz'
        import baw from '@scoped/baw/import'
        import chart from '@/configs/chart'
        import express from 'express'
      `,
      options: ['always', { ignorePackages: true }],
      errors: [
        {
          message: 'Missing file extension for "./Component"',
          line: 4,
          column: 31,
        },
        {
          message: 'Missing file extension for "@/configs/chart"',
          line: 7,
          column: 27,
        },
      ],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component'
        import baz from 'foo/baz'
        import baw from '@scoped/baw/import'
        import chart from '@/configs/chart'
        import express from 'express'
      `,
      options: ['ignorePackages'],
      errors: [
        {
          message: 'Missing file extension for "./Component"',
          line: 4,
          column: 31,
        },
        {
          message: 'Missing file extension for "@/configs/chart"',
          line: 7,
          column: 27,
        },
      ],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./foo.js"',
          line: 2,
          column: 25,
        }, {
          message: 'Unexpected use of file extension "jsx" for "./Component.jsx"',
          line: 4,
          column: 31,
        },
      ],
      options: ['never', { ignorePackages: true }],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
      `,
      errors: [
        {
          message: 'Unexpected use of file extension "jsx" for "./Component.jsx"',
          line: 4,
          column: 31,
        },
      ],
      options: ['always', { pattern: { jsx: 'never' } }],
    }),

    // export (#964)
    test({
      code: [
        'export { foo } from "./foo"',
        'let bar; export { bar }',
      ].join('\n'),
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension for "./foo"',
          line: 1,
          column: 21,
        },
      ],
    }),
    test({
      code: [
        'export { foo } from "./foo.js"',
        'let bar; export { bar }',
      ].join('\n'),
      options: ['never'],
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./foo.js"',
          line: 1,
          column: 21,
        },
      ],
    }),

    // Query strings.
    test({
      code: 'import withExtension from "./foo.js?a=True"',
      options: ['never'],
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./foo.js?a=True"',
          line: 1,
          column: 27,
        },
      ],
    }),
    test({
      code: 'import withoutExtension from "./foo?a=True.ext"',
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension for "./foo?a=True.ext"',
          line: 1,
          column: 30,
        },
      ],
    }),
    // require (#1230)
    test({
      code: [
        'const { foo } = require("./foo")',
        'export { foo }',
      ].join('\n'),
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension for "./foo"',
          line: 1,
          column: 25,
        },
      ],
    }),
    test({
      code: [
        'const { foo } = require("./foo.js")',
        'export { foo }',
      ].join('\n'),
      options: ['never'],
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./foo.js"',
          line: 1,
          column: 25,
        },
      ],
    }),

    // export { } from
    test({
      code: 'export { foo } from "./foo"',
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension for "./foo"',
          line: 1,
          column: 21,
        },
      ],
    }),
    test({
      code: `
        import foo from "@/ImNotAScopedModule";
        import chart from '@/configs/chart';
      `,
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension for "@/ImNotAScopedModule"',
          line: 2,
        },
        {
          message: 'Missing file extension for "@/configs/chart"',
          line: 3,
        },
      ],
    }),
    test({
      code: 'export { foo } from "./foo.js"',
      options: ['never'],
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./foo.js"',
          line: 1,
          column: 21,
        },
      ],
    }),

    // export * from
    test({
      code: 'export * from "./foo"',
      options: ['always'],
      errors: [
        {
          message: 'Missing file extension for "./foo"',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
      code: 'export * from "./foo.js"',
      options: ['never'],
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "./foo.js"',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
      code: 'import foo from "@/ImNotAScopedModule.js"',
      options: ['never'],
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "@/ImNotAScopedModule.js"',
          line: 1,
        },
      ],
    }),
    test({
      code: `
        import _ from 'lodash';
        import m from '@test-scope/some-module/index.js';

        import bar from './bar';
      `,
      options: ['never'],
      settings: {
        'import/resolver': 'webpack',
        'import/external-module-folders': ['node_modules', 'symlinked-module'],
      },
      errors: [
        {
          message: 'Unexpected use of file extension "js" for "@test-scope/some-module/index.js"',
          line: 3,
        },
      ],
    }),

    // TODO: properly ignore packages resolved via relative imports
    test({
      code: [
        'import * as test from "."',
      ].join('\n'),
      filename: testFilePath('./internal-modules/test.js'),
      options: ['ignorePackages'],
      errors: [
        {
          message: 'Missing file extension for "."',
          line: 1,
        },
      ],
    }),
    // TODO: properly ignore packages resolved via relative imports
    test({
      code: [
        'import * as test from ".."',
      ].join('\n'),
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: ['ignorePackages'],
      errors: [
        {
          message: 'Missing file extension for ".."',
          line: 1,
        },
      ],
    }),
  ],
});

describe('TypeScript', () => {
  getTSParsers()
    // Type-only imports were added in TypeScript ESTree 2.23.0
    .filter((parser) => parser !== parsers.TS_OLD)
    .forEach((parser) => {
      ruleTester.run(`${parser}: extensions ignore type-only`, rule, {
        valid: [
          test({
            code: 'import type T from "./typescript-declare";',
            options: [
              'always',
              { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
            ],
            parser,
          }),
          test({
            code: 'export type { MyType } from "./typescript-declare";',
            options: [
              'always',
              { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
            ],
            parser,
          }),
        ],
        invalid: [
          test({
            code: 'import T from "./typescript-declare";',
            errors: ['Missing file extension for "./typescript-declare"'],
            options: [
              'always',
              { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
            ],
            parser,
          }),
          test({
            code: 'export { MyType } from "./typescript-declare";',
            errors: ['Missing file extension for "./typescript-declare"'],
            options: [
              'always',
              { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
            ],
            parser,
          }),
          test({
            code: 'import type T from "./typescript-declare";',
            errors: ['Missing file extension for "./typescript-declare"'],
            options: [
              'always',
              { ts: 'never', tsx: 'never', js: 'never', jsx: 'never', checkTypeImports: true },
            ],
            parser,
          }),
          test({
            code: 'export type { MyType } from "./typescript-declare";',
            errors: ['Missing file extension for "./typescript-declare"'],
            options: [
              'always',
              { ts: 'never', tsx: 'never', js: 'never', jsx: 'never', checkTypeImports: true },
            ],
            parser,
          }),
        ],
      });
      ruleTesterWithTypeScriptImports.run(`${parser}: (with TS resolver) extensions are enforced for type imports/export when checkTypeImports is set`, rule, {
        valid: [
          test({
            code: 'import type { MyType } from "./typescript-declare.ts";',
            options: [
              'always',
              { checkTypeImports: true },
            ],
            parser,
          }),
          test({
            code: 'export type { MyType } from "./typescript-declare.ts";',
            options: [
              'always',
              { checkTypeImports: true },
            ],
            parser,
          }),

          // pathGroupOverrides: no patterns match good bespoke specifiers
          test({
            code: `
              import { ErrorMessage as UpstreamErrorMessage } from '@black-flag/core/util';

              import { $instances } from 'rootverse+debug:src.ts';
              import { $exists } from 'rootverse+bfe:src/symbols.ts';

              import type { Entries } from 'type-fest';
            `,
            parser,
            options: [
              'always',
              {
                ignorePackages: true,
                checkTypeImports: true,
                pathGroupOverrides: [
                  {
                    pattern: 'multiverse{*,*/**}',
                    action: 'enforce',
                  },
                ],
              },
            ],
          }),
          // pathGroupOverrides: an enforce pattern matches good bespoke specifiers
          test({
            code: `
              import { ErrorMessage as UpstreamErrorMessage } from '@black-flag/core/util';

              import { $instances } from 'rootverse+debug:src.ts';
              import { $exists } from 'rootverse+bfe:src/symbols.ts';

              import type { Entries } from 'type-fest';
            `,
            parser,
            options: [
              'always',
              {
                ignorePackages: true,
                checkTypeImports: true,
                pathGroupOverrides: [
                  {
                    pattern: 'rootverse{*,*/**}',
                    action: 'enforce',
                  },
                ],
              },
            ],
          }),
          // pathGroupOverrides: an ignore pattern matches bad bespoke specifiers
          test({
            code: `
              import { ErrorMessage as UpstreamErrorMessage } from '@black-flag/core/util';

              import { $instances } from 'rootverse+debug:src';
              import { $exists } from 'rootverse+bfe:src/symbols';

              import type { Entries } from 'type-fest';
            `,
            parser,
            options: [
              'always',
              {
                ignorePackages: true,
                checkTypeImports: true,
                pathGroupOverrides: [
                  {
                    pattern: 'multiverse{*,*/**}',
                    action: 'enforce',
                  },
                  {
                    pattern: 'rootverse{*,*/**}',
                    action: 'ignore',
                  },
                ],
              },
            ],
          }),
        ],
        invalid: [
          test({
            code: 'import type { MyType } from "./typescript-declare";',
            errors: ['Missing file extension "ts" for "./typescript-declare"'],
            options: [
              'always',
              { checkTypeImports: true },
            ],
            parser,
          }),
          test({
            code: 'export type { MyType } from "./typescript-declare";',
            errors: ['Missing file extension "ts" for "./typescript-declare"'],
            options: [
              'always',
              { checkTypeImports: true },
            ],
            parser,
          }),

          // pathGroupOverrides: an enforce pattern matches bad bespoke specifiers
          test({
            code: `
              import { ErrorMessage as UpstreamErrorMessage } from '@black-flag/core/util';

              import { $instances } from 'rootverse+debug:src';
              import { $exists } from 'rootverse+bfe:src/symbols';

              import type { Entries } from 'type-fest';
            `,
            parser,
            options: [
              'always',
              {
                ignorePackages: true,
                checkTypeImports: true,
                pathGroupOverrides: [
                  {
                    pattern: 'rootverse{*,*/**}',
                    action: 'enforce',
                  },
                  {
                    pattern: 'universe{*,*/**}',
                    action: 'ignore',
                  },
                ],
              },
            ],
            errors: [
              {
                message: 'Missing file extension for "rootverse+debug:src"',
                line: 4,
              },
              {
                message: 'Missing file extension for "rootverse+bfe:src/symbols"',
                line: 5,
              },
            ],
          }),
        ],
      });
    });
});
