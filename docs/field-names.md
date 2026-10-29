# Field names

The recommended preset configures the existing
`@graphql-eslint/naming-convention` rule to require camelCase for authored
`FieldDefinition` names. This covers object and interface fields, root operations
and fields introduced by extensions. It rejects names such as `first_name`,
`GetAccount`, `_account` and `account_`, and accepts `firstName` and `getAccount`.
The exact Lighthouse placeholder `_` remains allowed.

```graphql
type Query {
    _: Boolean
    currentAccount: Account
}

type Account {
    firstName: String
}
```

Type names, input fields, field/directive arguments, directives and enum spelling
are outside this check. The preset explicitly exempts these names from the native
rule's global underscore checks. It does not enable other upstream naming policies
such as forbidden `get` prefixes or `no-typename-prefix`. Generated SDL remains a
schema dependency rather than an authored lint target.

Keep public compatibility exceptions in the consuming project's ESLint overrides.
For example, permit `Account.legacy_name` while checking all other fields normally:

```js
import standards from '@noldor/eslint-plugin-graphql';

const rule = '@graphql-eslint/naming-convention';
const [, namingOptions] = standards.configs.recommended.rules[rule];
const { FieldDefinition, ...otherNames } = namingOptions;

export default [
    standards.configs.recommended,
    {
        files: ['graphql/**/*.graphql'],
        rules: {
            [rule]: ['error', {
                ...otherNames,
                'FieldDefinition:not([parent.name.value="Account"])': FieldDefinition,
                'FieldDefinition[parent.name.value="Account"]': {
                    ...FieldDefinition,
                    ignorePattern: '^(?:_|legacy_name)$',
                },
            }],
        },
    },
];
```

Preserve the exact `_` exemption when replacing `ignorePattern`, and keep the
other name options to avoid expanding the rule beyond public fields. Configure
schema loading separately as shown in the [README](../README.md).

The native rule provides editor suggestions to rename fields; it does not rename
them through ESLint `--fix`. A rename changes the public API and must be reviewed
with its consumers. See the [upstream rule documentation](https://the-guild.dev/graphql/eslint/rules/naming-convention).
