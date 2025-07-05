export type JSONValue = | string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

export function isJSONValue(value: unknown): value is JSONValue {
  if (value === null) {
    return true;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJSONValue);
  }
  if (typeof value === 'object') {
    return Object.values(value).every(isJSONValue);
  }
  return false;
}