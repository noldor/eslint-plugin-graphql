import graphql from '@graphql-eslint/eslint-plugin';
import deletionResultId from './deletion-result-id.js';
import preferIdScalars from './prefer-id-scalars.js';

const plugin = {
  meta: { name: '@noldor/eslint-plugin-graphql' },
  rules: { 'deletion-result-id': deletionResultId, 'prefer-id-scalars': preferIdScalars },
  configs: {},
};

plugin.configs.recommended = {
  files: ['**/*.graphql'],
  languageOptions: { parser: graphql.parser },
  plugins: { '@graphql-eslint': graphql, 'noldor-graphql': plugin },
  rules: {
    '@graphql-eslint/require-description': ['error', {
      types: true, FieldDefinition: true, InputValueDefinition: true,
      EnumValueDefinition: true, DirectiveDefinition: true,
    }],
    'noldor-graphql/deletion-result-id': 'error',
    'noldor-graphql/prefer-id-scalars': 'error',
  },
};

export default plugin;
