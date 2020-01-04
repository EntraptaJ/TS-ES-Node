declare module 'module' {
  type ResolvedModuleFormatType =
    | 'builtin'
    | 'commonjs'
    | 'dynamic'
    | 'json'
    | 'module'
    | 'wasm';

  interface ResolvedModule {
    url: string;
    format: ResolvedModuleFormatType;
  }

  type Resolver = (
    specifier: string,
    parentModuleURL?: string,
    defaultResolver?: Resolver,
  ) => ResolvedModule;
}
