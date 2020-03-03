import React, { useEffect, useState } from 'react';
import { Field, fieldIndex, OBJECT_TO_FIELDS } from './editor-constants';

export function SceneField({ fieldType, value, handleChange }) {
  const [componentValue, setComponentValue] = useState('');

  useEffect(() => {
    setComponentValue(value);
  }, [value]);

  return <input type="text" value={componentValue} onChange={handleChange} />;
}

export default function SceneEditor({ objectJson }) {
  // that would be the good way to do it
  const fieldDefinitions = OBJECT_TO_FIELDS[objectJson.type].reduce(
    (acc, f) => ({ ...acc, [f.id]: f }),
    {}
  );
  const extractedField = Object.entries(objectJson).reduce((acc: Field[], [k, v]) => {
    if (fieldDefinitions[k]) {
      acc.push(fieldDefinitions[k]);
    }
    return acc;
  }, []);

  return extractedField.map(field => {
    <SceneField handleChange={() => {}} fieldType={field.type} value={objectJson[field.id]} />;
  });
}
