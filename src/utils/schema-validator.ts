import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

// strict: false lets us load schemas with $schema meta keyword without warnings.
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export interface SchemaResult {
  ok: boolean;
  errors?: string;
  raw?: ErrorObject[] | null;
}

export function validateSchema(data: unknown, schema: object): SchemaResult {
  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (ok) return { ok: true };
  return { ok: false, errors: ajv.errorsText(validate.errors), raw: validate.errors };
}
