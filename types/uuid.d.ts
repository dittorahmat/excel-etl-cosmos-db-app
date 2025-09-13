declare module 'uuid' {
  export function v1(options?: any): string;
  export function v4(options?: any): string;
  export function v5(name: string | Uint8Array, namespace: string): string;
  export function validate(uuid: string): boolean;
  export function version(uuid: string): number;
  export const NIL: string;
}