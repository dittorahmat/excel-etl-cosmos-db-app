declare module '@testing-library/react' {
  import { ReactElement, ComponentType } from 'react';

  export interface RenderResult {
    container: HTMLElement;
    baseElement: HTMLElement;
    debug: (element?: HTMLElement | HTMLElement[]) => void;
    rerender: (ui: ReactElement) => void;
    unmount: () => void;
    asFragment: () => DocumentFragment;
  }

  export interface RenderOptions {
    container?: HTMLElement;
    baseElement?: HTMLElement;
    hydrate?: boolean;
    wrapper?: ComponentType<any>;
  }

  export function render(ui: ReactElement, options?: RenderOptions): RenderResult & typeof import('@testing-library/dom');
  export function cleanup(): void;
  export const screen: typeof import('@testing-library/dom').screen;
  export const fireEvent: typeof import('@testing-library/dom').fireEvent;
  export const waitFor: typeof import('@testing-library/dom').waitFor;
  export const act: typeof import('react-dom/test-utils').act;
  export const within: typeof import('@testing-library/dom').within;
  export const queries: typeof import('@testing-library/dom').queries;
}