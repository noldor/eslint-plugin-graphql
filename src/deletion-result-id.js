import { requireGraphQLSchema } from '@graphql-eslint/eslint-plugin';
import { isNonNullType, isObjectType, isScalarType } from 'graphql';
import { fieldPath, typeMap, typeNames } from './nodes.js';

function identifierResult(type, name) {
  if (type.kind !== 'NonNullType') return false;
  const inner = type.type;
  if (inner.kind === 'NamedType') return inner.name.value === name;
  return inner.kind === 'ListType' && inner.type.kind === 'NonNullType'
    && inner.type.type.kind === 'NamedType' && inner.type.type.name.value === name;
}

function identifierPayload(type, definition, schema, idTypes) {
  if (type.kind !== 'NonNullType' || type.type.kind !== 'NamedType' || type.type.name.value !== definition.type) return false;
  const payload = schema.getType(definition.type);
  if (!isObjectType(payload)) return false;
  const fields = Object.values(payload.getFields());
  return fields.length === definition.fields.length && fields.every(field =>
    definition.fields.includes(field.name) && isNonNullType(field.type)
    && isScalarType(field.type.ofType) && idTypes.includes(field.type.ofType.name));
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Return identifiers, not deleted models, from deletion mutations.' },
    schema: [{
      type: 'object', additionalProperties: false,
      properties: {
        idType: { type: 'string', pattern: '^[_A-Za-z][_0-9A-Za-z]*$' },
        idTypes: typeNames,
        fieldTypes: typeMap,
        mutationTypePattern: { type: 'string' },
        fieldPattern: { type: 'string' },
        deletionDirectives: { type: 'array', uniqueItems: true, items: { type: 'string' } },
        payloads: {
          type: 'object', additionalProperties: {
            type: 'object', additionalProperties: false, required: ['type', 'fields'],
            properties: { type: { type: 'string' }, fields: typeNames },
          },
        },
      },
    }],
    messages: { result: '{{path}} must return {{idType}}! or [{{idType}}!]!, or its explicitly configured identifier-only payload.' },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const schema = requireGraphQLSchema('deletion-result-id', context);
    const mutationRoot = schema.getMutationType()?.name;
    const mutationTypes = new RegExp(options.mutationTypePattern ?? 'Mutations$', 'u');
    const deletionNames = new RegExp(options.fieldPattern ?? '^(?:delete|destroy|forceDelete)(?:$|[A-Z_])', 'u');
    const directives = options.deletionDirectives ?? ['delete', 'forceDelete'];
    return {
      FieldDefinition(node) {
        if (!['ObjectTypeDefinition', 'ObjectTypeExtension'].includes(node.parent.kind)) return;
        if (node.parent.name.value !== mutationRoot && !mutationTypes.test(node.parent.name.value)) return;
        const raw = node.rawNode();
        if (!deletionNames.test(node.name.value) && !raw.directives?.some(d => directives.includes(d.name.value))) return;
        const path = fieldPath(node);
        const idType = options.fieldTypes?.[path] ?? options.idType ?? 'SerialID';
        if (identifierResult(raw.type, idType)) return;
        const payload = options.payloads?.[path];
        if (payload && identifierPayload(raw.type, payload, schema, options.idTypes ?? ['SerialID', 'UUID'])) return;
        context.report({ node: node.gqlType, messageId: 'result', data: { path, idType } });
      },
    };
  },
};
