import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import plugin from '../src/index.js';

// GraphQL ESLint otherwise caches the first schema across programmatic configs.
process.env.NODE_ENV = 'test';

const reachabilityRule = '@graphql-eslint/no-unreachable-types';
const namingRule = '@graphql-eslint/naming-convention';

async function lintSchema(source, overrides = {}) {
  const eslint = new ESLint({
    fix: true,
    overrideConfigFile: true,
    overrideConfig: [plugin.configs.recommended, {
      files: ['**/*.graphql'],
      languageOptions: { parserOptions: { graphQLConfig: { schema: source } } },
      ...overrides,
    }],
  });
  const [result] = await eslint.lintText(source, { filePath: 'schema.graphql' });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result;
}

function messagesFor(result, rule) {
  return result.messages.filter(message => message.ruleId === rule);
}

test('recommended preset reports unused definitions and disconnected cycles', async () => {
  const result = await lintSchema(`
    type Query { greeting: String }
    type Forgotten { name: String }
    type CycleA { other: CycleB }
    type CycleB { other: CycleA }
    input ForgottenInput { value: String }
    enum ForgottenEnum { VALUE }
    scalar ForgottenScalar
    directive @forgotten on FIELD_DEFINITION
  `);
  assert.deepEqual(messagesFor(result, reachabilityRule).map(message => message.message), [
    'Object type `Forgotten` is unreachable.',
    'Object type `CycleA` is unreachable.',
    'Object type `CycleB` is unreachable.',
    'Input object type `ForgottenInput` is unreachable.',
    'Enum type `ForgottenEnum` is unreachable.',
    'Scalar type `ForgottenScalar` is unreachable.',
    'Directive `forgotten` is unreachable.',
  ]);
});

test('recommended preset checks public output, interface and extended root field names', async () => {
  const result = await lintSchema(`
    type Query { _: Boolean, account: Account, first_name: String }
    extend type Query { get_account: Account }
    interface _Named { display_name: String }
    type Account implements _Named { display_name: String, firstName: String, _secret: String, trailing_: String }
    input _Legacy_Input { _snake_case_: String }
    enum Legacy_Enum_ { _odd_case_ }
  `);
  assert.deepEqual(messagesFor(result, namingRule).map(message => message.line), [
    2, 3, 4, 5, 5, 5, 5, 5,
  ]);
  assert.equal(messagesFor(result, namingRule).filter(message => message.message.includes('camelCase')).length, 6);
  assert.equal(result.output, undefined);
});

test('field naming exceptions can be scoped to one public field with an ESLint override', async () => {
  const [, namingOptions] = plugin.configs.recommended.rules[namingRule];
  const { FieldDefinition, ...otherNames } = namingOptions;
  const result = await lintSchema(`
    type Query { account: Account }
    type Account { legacy_name: String, other_name: String, _: Boolean }
    type Other { legacy_name: String }
  `, {
    rules: {
      [namingRule]: ['error', {
        ...otherNames,
        'FieldDefinition:not([parent.name.value="Account"])': FieldDefinition,
        'FieldDefinition[parent.name.value="Account"]': {
          ...FieldDefinition, ignorePattern: '^(?:_|legacy_name)$',
        },
      }],
    },
  });
  assert.deepEqual(messagesFor(result, namingRule).map(message => message.line), [3, 4]);
});

test('field naming leaves input-object values and enum literals outside its scope', async () => {
  const result = await lintSchema(`
    enum LegacyMode { _MODE_ }
    input Filter { _legacy: Boolean, mode: LegacyMode }
    directive @tag(filter: Filter) on FIELD_DEFINITION
    type Query {
      lookup(filter: Filter = { _legacy: true, mode: _MODE_ }): String
        @tag(filter: { _legacy: true, mode: _MODE_ })
    }
  `);
  assert.deepEqual(messagesFor(result, namingRule), []);
});

test('reachability uses imported extensions and generated dependencies without linting generated SDL', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'graphql-schema-quality-'));
  try {
    await writeFile(join(directory, 'schema.graphql'), `
      # import * from "./accounts.graphql"
      schema { query: Query, mutation: Actions, subscription: Events }
      type Query { _: Boolean }
      extend type Query { account: Account, named: Named, search(filter: SearchFilter): SearchResult }
    `);
    await writeFile(join(directory, 'accounts.graphql'), `
      # import * from "./generated.graphql"
      interface Named { displayName: String }
      type Account implements Named { displayName: String @generated(meta: { mode: ACTIVE }) }
      type Team implements Named { displayName: String }
      type Profile implements Named { displayName: String }
      union SearchResult = Account | Team
      input SearchFilter { name: String }
      type Actions { update: MutationOnly }
      type MutationOnly { success: Boolean }
      type Events { changed: EventOnly }
      type EventOnly { message: String }
    `);
    await writeFile(join(directory, 'generated.graphql'), `
      directive @generated(meta: GeneratedInput) on FIELD_DEFINITION
      input GeneratedInput { mode: GeneratedMode }
      enum GeneratedMode { ACTIVE }
      type Generated_Helper { snake_case: String }
    `);
    const eslint = new ESLint({
      cwd: directory,
      overrideConfigFile: true,
      overrideConfig: [plugin.configs.recommended, {
        ignores: ['generated.graphql'],
      }, {
        files: ['**/*.graphql'],
        languageOptions: { parserOptions: { graphQLConfig: {
          schema: [join(directory, 'schema.graphql'), join(directory, 'generated.graphql')],
        } } },
      }],
    });
    const results = await eslint.lintFiles(['*.graphql']);
    assert.deepEqual(results.map(result => result.filePath.split('/').at(-1)).sort(), [
      'accounts.graphql', 'schema.graphql',
    ]);
    for (const result of results) {
      assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
      assert.deepEqual(messagesFor(result, reachabilityRule), []);
      assert.deepEqual(messagesFor(result, namingRule), []);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
