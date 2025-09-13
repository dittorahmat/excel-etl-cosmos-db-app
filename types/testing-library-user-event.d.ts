declare module '@testing-library/user-event' {
  import { UserEvent } from '@testing-library/user-event/dist/types/setup';

  const userEvent: {
    setup(options?: any): UserEvent;
  };

  export default userEvent;
  export const PointerEventsCheckLevel: any;
}

declare module '@testing-library/user-event/dist/types/setup' {
  export interface UserEvent {
    click: (element: Element) => Promise<void>;
    dblClick: (element: Element) => Promise<void>;
    type: (element: Element, text: string, options?: any) => Promise<void>;
    clear: (element: Element) => Promise<void>;
    tab: (options?: { shift?: boolean }) => Promise<void>;
    hover: (element: Element) => Promise<void>;
    unhover: (element: Element) => Promise<void>;
    upload: (element: Element, file: File | File[]) => Promise<void>;
    selectOptions: (element: Element, values: string | string[]) => Promise<void>;
    deselectOptions: (element: Element, values: string | string[]) => Promise<void>;
    paste: (element: Element, text: string) => Promise<void>;
    keyboard: (text: string) => Promise<void>;
  }
  
  export interface UserEventSetupOptions {
    delay?: number;
    keyboardMap?: any[];
    pointerMap?: any[];
    pointerEventsCheck?: any;
    skipAutoClose?: boolean;
    skipClick?: boolean;
    skipHover?: boolean;
    writeToClipboard?: boolean;
    advanceTimers?: (delay: number) => Promise<void> | void;
  }
  
  export function setup(options?: UserEventSetupOptions): UserEvent;
}