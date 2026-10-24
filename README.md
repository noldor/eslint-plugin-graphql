# GraphQL schema standards

Reusable ESLint flat configuration for GraphQL SDL. Requires Node.js 20.19+, ESLint
9.39/10, GraphQL 16 and GraphQL ESLint 4.4.2. Rules never rewrite schema contracts.

```sh
npm install --save-dev @noldor/eslint-plugin-graphql @graphql-eslint/eslint-plugin eslint graphql
```

```js
import standards from '@noldor/eslint-plugin-graphql';

export default [standards.configs.recommended];
```

Supply a complete schema using GraphQL Config. Lighthouse projects should combine
the compiled schema and generated server directive definitions. Restrict the config
to authored SDL and ignore generated helpers. You can also register the default
plugin manually under `noldor-graphql` and select individual rules.

| Check | Documentation |
| --- | --- |
| Descriptions on all authored types, fields, arguments and enum values | [Descriptions](docs/descriptions.md) |
| Identifier-only deletion mutation results | [Deletion results](docs/deletion-result-id.md) |
| Explicit identifier scalar contracts | [Identifier scalars](docs/prefer-id-scalars.md) |

Run `npm ci`, `npm run check` and `npm audit` before publication. The tarball contains
only source, rule documentation, this README, the manifest and MIT license. See
[release setup](.github/RELEASING.md) for GitHub/npm activation.
