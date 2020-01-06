declare module 'vm' {
  import { Context } from 'vm';

  type Linker = (
    specifier: string,
    referencingModule: SourceTextModule,
  ) => Promise<SourceTextModule | SyntheticModule>;

  interface ModuleOptions {
    context?: Context;
    initializeImportMeta?: (
      meta: { url: string },
      module: SourceTextModule,
    ) => void;
    importModuleDynamically?: Linker;
  }

  interface ModuleEvaluateOptions {
    timeout?: number;
    breakOnSigint?: boolean;
  }

  class SourceTextModule {
    constructor(code: string, options?: ModuleOptions);

    dependencySpecifiers: string[];
    error: any;
    linkingStatus: 'unlinked' | 'linking' | 'linked' | 'errored';
    namespace: object;
    status:
      | 'uninstantiated'
      | 'instantiating'
      | 'instantiated'
      | 'evaluating'
      | 'evaluated'
      | 'errored';
    url: string;

    link(linker: Linker): Promise<SourceTextModule | SyntheticModule>;
    instantiate(): void;
    evaluate(options?: ModuleEvaluateOptions): Promise<{ result: unknown }>;
  }

  interface SyntheticModuleOptions {
    identifer: string;
    context: Context;
  }

  class SyntheticModule {
    constructor(
      exportNames: string[],
      evaluateCallback: (this: SyntheticModule) => Promise<void>,
      options?: Partial<SyntheticModuleOptions>,
    );

    setExport: (exportName: string, thing: any) => void;
  }
}
