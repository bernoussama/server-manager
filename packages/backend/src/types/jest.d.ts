// Type definitions for Jest
declare namespace jest {
  function mock(moduleName: string, factory?: () => any): void;
  function requireActual(moduleName: string): any;
  function spyOn(object: any, methodName: string): any;
  function fn<T = any>(implementation?: (...args: any[]) => T): any;
  function resetAllMocks(): void;
  function clearAllMocks(): void;
  function restoreAllMocks(): void;
}

declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: any;
declare var beforeEach: (fn: () => void) => void;
declare var afterEach: (fn: () => void) => void;
declare var beforeAll: (fn: () => void) => void;
declare var afterAll: (fn: () => void) => void;
