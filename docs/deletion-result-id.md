# deletion-result-id

Deletion mutation fields return `SerialID!` or `[SerialID!]!` by default. This prevents
returning deleted models whose relationships can no longer be resolved. No automatic
fix is offered: the resolver must actually return identifiers and retain authorization,
transactions, events and response contracts.

Fields are checked on the compiled schema's mutation root and object types/extensions
matching `mutationTypePattern` (default `Mutations$`). Within those types, deletion is
recognized by `delete`, `destroy`, `forceDelete` with an optional uppercase/underscore
suffix, or the `delete`/`forceDelete` directive. `removeMember` is not assumed to delete
a model. Configure patterns for other conventions; arbitrary custom resolver behavior
cannot be discovered statically.

Options:

| Option | Default | Purpose |
| --- | --- | --- |
| `idType` | `SerialID` | Default result scalar |
| `fieldTypes` | `{}` | Exact `Type.field` to expected scalar, e.g. UUID |
| `mutationTypePattern` | `Mutations$` | Additional mutation namespace type regex |
| `fieldPattern` | `^(?:delete|destroy|forceDelete)(?:$|[A-Z_])` | Deletion field name regex |
| `deletionDirectives` | `["delete", "forceDelete"]` | Deletion directive names |
| `payloads` | `{}` | Explicit identifier-only result objects by `Type.field` |
| `idTypes` | `["SerialID", "UUID"]` | Scalars allowed in payload fields |

```js
['error', {
  fieldTypes: { 'DocumentMutations.delete': 'UUID' },
  payloads: {
    'MessageMutations.delete': { type: 'DeletedMessage', fields: ['id', 'chatId'] },
  },
}]
```

A payload must be non-null, have exactly the configured fields, and every field must
be a non-null scalar from `idTypes`. A model with extra fields is rejected even when
configured by mistake. Payload structure is read from the complete schema. This rule
cannot prove that a resolver returns the declared payload or that an ID belongs to the
deleted record; exercise those boundaries in application tests.
