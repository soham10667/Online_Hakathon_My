interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'react' {
  export type FC<T = any> = any;
  export type CSSProperties = any;
  export type MouseEvent<T = any> = any;
  export type FormEvent<T = any> = any;
  export type ComponentType<T = any> = any;
  export type ReactNode = any;
  export type RefObject<T> = { current: T };

  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useMemo<T>(factory: () => T, deps: any[] | undefined): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;

  export namespace React {
    export type FC<T = any> = any;
    export type CSSProperties = any;
    export type MouseEvent<T = any> = any;
    export type FormEvent<T = any> = any;
    export type ComponentType<T = any> = any;
    export type ReactNode = any;
    export type RefObject<T> = { current: T };
  }

  const anyVal: any;
  export default anyVal;
}

declare module 'react/jsx-runtime' {
  const content: any;
  export default content;
  export = content;
}

declare module 'socket.io-client' {
  export interface Socket {
    emit(event: string, ...args: any[]): any;
    on(event: string, callback: (...args: any[]) => void): any;
    off(event: string, callback?: (...args: any[]) => void): any;
    connect(): any;
    disconnect(): any;
  }
  export function io(...args: any[]): Socket;
}
declare module 'lucide-react';

declare namespace React {
  type MouseEvent = any;
  type FormEvent = any;
  type CSSProperties = any;
  type FC<T = any> = any;
}
