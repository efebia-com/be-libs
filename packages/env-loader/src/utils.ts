export type ConvertToCamelCase<Key extends PropertyKey> =
  Key extends `${infer TFirst}_${infer TSecond}`
    ? `${Lowercase<TFirst>}${Capitalize<ConvertToCamelCase<TSecond>>}`
    : Key;

export const convertToCamelCase = (key: string): string => {
  return key
    .toLowerCase()
    .replace(/([_][a-z])/g, (group) => group.toUpperCase().replace("_", ""));
};

export type EnvValues<TKeys extends [...(keyof EnvSchema)[]]> = TKeys extends [
  infer TFirst,
  ...infer TRest
]
  ? TRest["length"] extends 0
    ? TFirst extends keyof EnvSchema
      ? EnvSchema[TFirst]
      : never
    : {
        [key in TRest[number] as key extends keyof EnvSchema
          ? key
          : never]: key extends keyof EnvSchema ? EnvSchema[key] : never;
      } & {
        [key in TRest[number] as key extends `${string}_${string}`
          ? ConvertToCamelCase<key>
          : never]: key extends keyof EnvSchema ? EnvSchema[key] : never;
      } & {
        [key in TFirst as key extends string
          ? ConvertToCamelCase<key>
          : never]: key extends keyof EnvSchema ? EnvSchema[key] : never;
      } & {
        [key in TFirst as key extends string ? key : never]: key extends keyof EnvSchema ? EnvSchema[key] : never;
      }
  : never;

export interface EnvSchema {}
