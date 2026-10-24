# prefer-id-scalars

Rejects built-in `ID` in every output field, input field and argument. Also checks
primitive scalar fields/arguments named `id`, `ids` or ending in `Id`/`Ids`, requiring
`SerialID` or `UUID`. Nullability and list shape remain unchanged. Object-returning
operations such as `loginById` are not interpreted as identifier fields.

The rule does not infer database column types or validate relationships. Both identifier
scalars are accepted until an explicit field mapping selects the actual contract.
Custom scalar names not listed in `idTypes` are not guessed to be primitive identifiers;
use a field mapping when adopting an existing custom scalar contract.

| Option | Default | Purpose |
| --- | --- | --- |
| `idTypes` | `["SerialID", "UUID"]` | Allowed identifier scalars |
| `fieldTypes` | `{}` | Exact path to expected named type, including legacy exceptions |

Paths: `User.id`, `CreateUser.tenantId`, `UserQueries.user.id` for a field argument,
or `directiveName.argument` for a directive argument. An override constrains the exact
type; it does not disable the check for that field or allow the same legacy scalar
globally.

```js
['error', {
  fieldTypes: {
    'Document.id': 'UUID',
    'AccessToken.id': 'String', // Opaque Passport token, not a numeric identifier.
    'WebhookDelivery.id': 'ID', // Existing MongoDB public contract.
  },
}]
```

Renaming scalars may change coercion, variable declarations and serialization. There
are no automatic fixes. Migrate an existing public contract deliberately; preserve
legitimate opaque-string and MongoDB identifiers using exact mappings.
