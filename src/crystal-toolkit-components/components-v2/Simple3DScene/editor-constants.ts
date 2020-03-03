import { JSON3DObject } from './constants';

export enum FieldType {
  VEC3 = 'vec3',
  COLOR = 'color',
  NUMBER = 'number',
  LIST = 'list'
}

export interface Field {
  name: string;
  type: FieldType;
  id: string;
  listSize?: number; // -1 for non-bounded lists
}

const fieldColor = { id: 'color', name: 'Color', type: FieldType.COLOR };
const fieldRadius = { id: 'radius', name: 'Radius', type: FieldType.NUMBER };
const fieldWidth = { id: 'headWidth', name: 'Head Width', type: FieldType.NUMBER };
const fieldLength = { id: 'headLength', name: 'Head Length', type: FieldType.NUMBER };
const fieldScale = { id: 'scale', name: 'Scale', type: FieldType.VEC3 };
const positionPairs = { id: 'positionPairs', name: 'Position pairs', type: FieldType.LIST };
const position = { id: 'positions', name: 'Position', type: FieldType.LIST };

const fields = [
  fieldLength,
  fieldRadius,
  fieldWidth,
  fieldScale,
  positionPairs,
  position,
  fieldColor
];
export const fieldIndex = fields.reduce(
  (acc: { [id: string]: Field }, f) => ({ ...acc, [f.id]: f }),
  {}
);

//positionPairs:

//  color: 'red',/
//  radius: 0.07,
//  headLength: 0.24,
//  headWidth: 0.14,
//  type: 'arrows',
//  clickable: false

export const OBJECT_TO_FIELDS: { [K in JSON3DObject]: Field[] | null } = {
  [JSON3DObject.LABEL]: null,
  [JSON3DObject.CYLINDERS]: null,
  [JSON3DObject.ARROWS]: [fieldColor, fieldWidth, fieldLength],
  [JSON3DObject.SURFACES]: null,
  [JSON3DObject.CONVEX]: null,
  [JSON3DObject.SPHERES]: [fieldColor, fieldRadius],
  [JSON3DObject.LINES]: [],
  [JSON3DObject.ELLIPSOIDS]: [],
  [JSON3DObject.CUBES]: []
};
