# Reachable types

The recommended preset enables the existing
`@graphql-eslint/no-unreachable-types` rule. It reports authored definitions and
extensions that cannot be reached from the query, mutation or subscription roots.
This includes unused object, interface, input, union, enum and scalar types, and
unused schema directives. A cycle of types disconnected from the roots is still
unreachable. Types referenced through fields, arguments, union members, interface
implementations and used directives remain reachable. Executable-operation
directives and their argument types follow the upstream rule's reachability rules.

```graphql
type Query {
    account: Account
}

type Account {
    displayName: String
}

# Reported: nothing reachable refers to this type.
type ForgottenAccount {
    displayName: String
}
```

Load the **complete schema** through GraphQL Config, including imports, root
extensions, generated types and directive definitions. Lint authored files only:
generated SDL can provide dependencies without becoming a lint target. For
Lighthouse, use the complete compiled schema plus generated directive definitions,
as described in the [installation example](../README.md). A partial schema can
incorrectly make a legitimate type appear unused, or fail to load altogether.
When using SDL imports, each imported file must also import the definitions it
depends on, as required by the GraphQL Tools loader.

The rule offers editor suggestions to remove unreachable declarations. Suggestions
require a deliberate choice; ESLint `--fix` does not remove declarations. Review
public compatibility before removing a type. The rule proves schema reachability,
not whether an operation is used by clients.

See the [upstream rule documentation](https://the-guild.dev/graphql/eslint/rules/no-unreachable-types).
