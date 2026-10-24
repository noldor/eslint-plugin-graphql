export function namedType(node) {
  while (node.kind !== 'NamedType') node = node.type;
  return node.name.value;
}

export function fieldPath(node) {
  const parent = node.parent;
  if (parent.kind === 'FieldDefinition' || parent.kind === 'DirectiveDefinition') {
    const owner = parent.parent?.name?.value;
    return [owner, parent.name.value, node.name.value].filter(Boolean).join('.');
  }
  return `${parent.name.value}.${node.name.value}`;
}

export const typeMap = {
  type: 'object',
  additionalProperties: { type: 'string', pattern: '^[_A-Za-z][_0-9A-Za-z]*$' },
};

export const typeNames = {
  type: 'array', minItems: 1, uniqueItems: true,
  items: { type: 'string', pattern: '^[_A-Za-z][_0-9A-Za-z]*$' },
};
