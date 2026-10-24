import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import graphql from '@graphql-eslint/eslint-plugin';
import plugin from '../src/index.js';

const schema = `
  scalar SerialID
  scalar UUID
  type Query { user: User }
  type Mutation { users: UserMutations }
  type UserMutations { delete(id: SerialID!): SerialID! }
  type User { id: SerialID!, name: String }
  type DeletedUser { id: SerialID!, tenantId: UUID! }
`;

async function lint(code, rule, options) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{
      files: ['**/*.graphql'],
      languageOptions: { parser: graphql.parser, parserOptions: { graphQLConfig: { schema } } },
      plugins: { 'noldor-graphql': plugin },
      rules: { [`noldor-graphql/${rule}`]: options ? ['error', options] : 'error' },
    }],
  });
  const [result] = await eslint.lintText(code, { filePath: 'schema.graphql' });
  return result.messages;
}

test('deletions return a non-null identifier or a non-null batch of non-null identifiers', async () => {
  for (const type of ['SerialID!', '[SerialID!]!']) {
    assert.deepEqual(await lint(`type UserMutations { delete: ${type} }`, 'deletion-result-id'), []);
  }
  for (const type of ['User!', 'Boolean!', 'SerialID', '[SerialID]!', '[SerialID!]', 'UUID!']) {
    assert.equal((await lint(`type UserMutations { delete: ${type} }`, 'deletion-result-id')).length, 1, type);
  }
});

test('supports root mutations, extensions, deletion directives and UUID mappings', async () => {
  assert.equal((await lint('extend type UserMutations { destroyUser: User }', 'deletion-result-id')).length, 1);
  assert.equal((await lint('type Mutation { deleteUser: User }', 'deletion-result-id')).length, 1);
  assert.equal((await lint('type UserMutations { purge: User @delete }', 'deletion-result-id')).length, 1);
  assert.deepEqual(await lint('type UserMutations { delete: UUID! }', 'deletion-result-id', {
    fieldTypes: { 'UserMutations.delete': 'UUID' },
  }), []);
  assert.deepEqual(await lint('type Query { deleteHistory: String }', 'deletion-result-id'), []);
  assert.deepEqual(await lint('type UserMutations { removeMember: User }', 'deletion-result-id'), []);
});

test('allows only explicitly configured identifier-only deletion payloads', async () => {
  const options = { payloads: { 'UserMutations.delete': { type: 'DeletedUser', fields: ['id', 'tenantId'] } } };
  assert.deepEqual(await lint('type UserMutations { delete: DeletedUser! }', 'deletion-result-id', options), []);
  assert.equal((await lint('type UserMutations { delete: DeletedUser }', 'deletion-result-id', options)).length, 1);
  assert.equal((await lint('type UserMutations { delete: User! }', 'deletion-result-id', {
    payloads: { 'UserMutations.delete': { type: 'User', fields: ['id'] } },
  })).length, 1);
});

test('rejects built-in ID anywhere and primitive identifier fields without guessing UUIDs', async () => {
  for (const code of ['type User { id: ID! }', 'input Filter { userId: Int }', 'type User { userIds: [String!]! }', 'type User { key: ID }']) {
    assert.equal((await lint(code, 'prefer-id-scalars')).length, 1, code);
  }
  for (const code of ['type User { id: SerialID!, tenantId: UUID }', 'input Filter { ids: [SerialID!] }', 'type User { identity: String, grid: Int }', 'type Mutation { loginById(id: SerialID!): User }']) {
    assert.deepEqual(await lint(code, 'prefer-id-scalars'), [], code);
  }
  assert.equal((await lint('type User { tenantId: SerialID }', 'prefer-id-scalars', {
    fieldTypes: { 'User.tenantId': 'UUID' },
  })).length, 1);
});

test('legacy identifier exceptions preserve exactly the specified scalar type', async () => {
  const options = { fieldTypes: { 'User.id': 'String' } };
  assert.deepEqual(await lint('type User { id: String! }', 'prefer-id-scalars', options), []);
  assert.equal((await lint('type User { id: Int! }', 'prefer-id-scalars', options)).length, 1);
});

test('recommended config requires descriptions on every type, field, argument and enum value', async () => {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [
    plugin.configs.recommended,
    { files: ['**/*.graphql'], languageOptions: { parserOptions: { graphQLConfig: { schema } } } },
  ] });
  const source = `scalar SerialID
    input Filter { id: SerialID }
    enum Status { ACTIVE }
    directive @tag(value: String) on FIELD_DEFINITION
    type User { id: SerialID!, name(format: String): String }`;
  const [result] = await eslint.lintText(source, { filePath: 'schema.graphql' });
  assert.equal(result.messages.filter(m => m.ruleId === '@graphql-eslint/require-description').length, 11);
});
