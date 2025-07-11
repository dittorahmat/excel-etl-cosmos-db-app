import { Operator } from "./types";

export const OPERATORS_BY_TYPE: Record<string, Operator[]> = {
  string: [
    { value: "=", label: "equals", inputType: "text" },
    { value: "!=", label: "not equals", inputType: "text" },
    { value: "contains", label: "contains", inputType: "text" },
    { value: "!contains", label: "not contains", inputType: "text" },
    { value: "startsWith", label: "starts with", inputType: "text" },
    { value: "endsWith", label: "ends with", inputType: "text" },
    { value: "empty", label: "is empty" },
    { value: "!empty", label: "is not empty" },
  ],
  number: [
    { value: "=", label: "equals", inputType: "number" },
    { value: "!=", label: "not equals", inputType: "number" },
    { value: ">", label: "greater than", inputType: "number" },
    { value: ">=", label: "greater than or equal", inputType: "number" },
    { value: "<", label: "less than", inputType: "number" },
    { value: "<=", label: "less than or equal", inputType: "number" },
    {
      value: "between",
      label: "between",
      inputType: "number",
      needsSecondValue: true,
    },
  ],
  boolean: [{ value: "=", label: "is", inputType: "select" }],
  date: [
    { value: "=", label: "on", inputType: "date" },
    { value: ">", label: "after", inputType: "date" },
    { value: "<", label: "before", inputType: "date" },
    {
      value: "between",
      label: "between",
      inputType: "date",
      needsSecondValue: true,
    },
  ],
  array: [
    { value: "contains", label: "contains", inputType: "text" },
    { value: "!contains", label: "does not contain", inputType: "text" },
    { value: "empty", label: "is empty" },
    { value: "!empty", label: "is not empty" },
  ],
  object: [
    { value: "exists", label: "exists" },
    { value: "!exists", label: "does not exist" },
  ],
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
