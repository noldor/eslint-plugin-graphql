# Descriptions

The recommended preset configures the existing `@graphql-eslint/require-description`
rule; it does not duplicate that implementation. GraphQL descriptions are required on
all type definitions (including scalars, enums, unions and inputs), field definitions,
input fields, field/directive arguments, directive definitions and enum values.
Comments beginning with `#` are not descriptions. Extend declarations cannot carry
type descriptions in GraphQL grammar; their added fields must still be documented.

```graphql
"An account"
type User {
  "Numeric account identifier"
  id: SerialID!
}
```

Provide the complete schema for schema-aware checks. Generated types are not source
documents to lint; do not add repetitive generated descriptions to application SDL.
The rule checks presence, not factual accuracy, completeness or documentation language.
