import { fieldPath, namedType, typeMap, typeNames } from './nodes.js';

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require explicit identifier scalars instead of ID and primitive identifier fields.' },
    schema: [{
      type: 'object', additionalProperties: false,
      properties: {
        idTypes: typeNames,
        fieldTypes: typeMap,
      },
    }],
    messages: { scalar: '{{path}} must use {{expected}} instead of {{actual}}. Configure the actual identifier contract; this rule does not infer database types.' },
  },
  create(context) {
    const { idTypes = ['SerialID', 'UUID'], fieldTypes = {} } = context.options[0] ?? {};
    return {
      'FieldDefinition, InputValueDefinition'(node) {
        const path = fieldPath(node);
        const actual = namedType(node.rawNode().type);
        const expected = fieldTypes[path] ? [fieldTypes[path]] : idTypes;
        // A mutation such as loginById can return an object; its name is not an ID field.
        const identifier = /^(?:id|ids)$|Ids?$/u.test(node.name.value)
          && ['ID', 'Int', 'Float', 'String', 'Boolean', ...idTypes].includes(actual);
        if ((actual === 'ID' || identifier || Object.hasOwn(fieldTypes, path)) && !expected.includes(actual)) {
          context.report({ node: node.gqlType, messageId: 'scalar', data: {
            path, expected: expected.join(' or '), actual,
          } });
        }
      },
    };
  },
};
