// src/TS-ES-Node.ts
import { promises as fs } from 'fs';
import globby from 'globby';
import { ResolvedModule, ResolvedModuleFormatType } from 'module';
import path from 'path';
import ts from 'typescript';
import { pathToFileURL, URL, fileURLToPath } from 'url';
import {
  SourceTextModule,
  SyntheticModule,
  createContext,
  InstantiateReturn,
} from 'vm';
import { setRootPath, getTSConfig } from './Utils';
import { createTSError } from './TypeScriptError';

const baseURL = pathToFileURL(process.cwd()).href;

/**
 * Array of TypeScript file extensions. This is also used to find imported TypeScript files since for some reason
 * the extension can't be inferred by Node.JS' Resolver.
 */
const TS_EXTENSIONS = ['.ts', '.tsx'];

const moduleMap: Map<string, SourceTextModule | SyntheticModule> = new Map();

const moduleContext = createContext(global);

interface ModuleMeta {
  url: string;
}

interface ESCode {
  code: string;
  meta: string;
}

/**
 * Transpiles TypeScript source and loads the result ESNext code into the Node.JS VM
 * @param sourcePathURLString Node.JS URL field for the source TypeScript file
 * @returns Node.JS Experimental SourceTextModule with the resulting ESNext code
 */
async function transpileTypeScriptToModule(
  sourcePathURLString: string,
): Promise<ESCode> {
  const sourceFileURL = new URL(sourcePathURLString);
  const sourceFilePath = fileURLToPath(sourceFileURL);
  setRootPath(path.dirname(sourceFilePath));

  const sourceFile = await fs.readFile(sourceFileURL);

  const tsConfig = getTSConfig(path.dirname(sourceFilePath));
  /* 
  const compilerOptions: ts.CompilerOptions = {
    ...tsConfig,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
  }; */

  /*   if (rootModule) {
    const program = ts.createProgram([sourceFilePath], {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      skipLibCheck: true,
      strict: false,
      allowSyntheticDefaultImports: true,
    });

    const diagnostics = ts.getPreEmitDiagnostics(
      program,
      program.getSourceFile(sourceFilePath),
    );
    // if (diagnostics.length) throw createTSError(diagnostics);
  } */

  // TypeScript code transpiled into ESNext.
  let transpiledModule = ts.transpileModule(sourceFile.toString(), {
    compilerOptions: {
      ...tsConfig,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      skipLibCheck: true,
      strict: false,
      allowSyntheticDefaultImports: true,
    },
    reportDiagnostics: true,
  });

  /**
   * Using the NodeJS Experimental Modules we can convert the ESNext source into an ESModule
   * and load it into the VM Context
   * @see https://nodejs.org/api/vm.html#vm_class_vm_sourcetextmodule
   */

  // const sourceTextModule = new SourceTextModule(transpiledModule.outputText, {
  //   async importModuleDynamically(specifier, parentModule) {
  //     const dynamicModule = await linker(specifier, parentModule);
  //     if ('link' in dynamicModule) await dynamicModule.link(linker);

  //     return dynamicModule;
  //   },
  //   initializeImportMeta(meta) {
  //     meta.url = sourcePathURLString;
  //   },
  //   context: moduleContext,
  // });

  /**
   * We need to ensure the source path of the sourceTextModule is the path of the
   * TypeScript source import for static and dynamic imports from the VM Module
   */
  // sourceTextModule.url = sourcePathURLString;

  return { code: transpiledModule.outputText, meta: sourcePathURLString };
}

type ModuleCodeHandlerFn = (moduleUrlString: string) => Promise<ESCode>;

const moduleCodeHandler: {
  [type in ResolvedModuleFormatType]: undefined | ModuleCodeHandlerFn;
} = {
  builtin: undefined,
  commonjs: undefined,
  dynamic: transpileTypeScriptToModule,
  json: undefined,
  module: undefined,
  wasm: undefined,
};

async function linker(
  specifier: string,
  parentModule: { url: string },
): Promise<SourceTextModule | SyntheticModule> {
  const { format, url } = await resolve(specifier, parentModule.url);

  let source = moduleMap.get(url);
  if (source) return source;

  const transpiler = moduleCodeHandler[format];
  const transpiled = transpiler ? await transpiler(url) : undefined;

  if (!transpiled) {
    let dynamicImport = await import(url);
    if (dynamicImport.default)
      dynamicImport = { ...dynamicImport.default, ...dynamicImport };

    const linkKeys = Object.keys(dynamicImport);

    source = new SyntheticModule(
      Object.keys(dynamicImport),
      function() {
        for (const linkKey of linkKeys)
          this.setExport(linkKey, dynamicImport[linkKey]);
      },
      { context: moduleContext },
    );
  } else {
    source = new SourceTextModule(transpiled.code, {
      context: moduleContext,
      importModuleDynamically,
      initializeImportMeta(meta) {
        meta.url = fileURLToPath(url);
      },
    });
    source.url = url;
  }

  moduleMap.set(url, source);

  return source;
}

async function importModuleDynamically(
  specifier: string,
  parentModule: { url: string },
): Promise<any> {
  const source = await linker(specifier, parentModule);
  // @ts-ignore

  if ('evaluate' in source) {
    await source.link(linker);
    await source.evaluate();
  }

  return source;
}

export async function dynamicInstantiate(
  url: string,
): Promise<InstantiateReturn> {
  try {
    const sourceCode = await transpileTypeScriptToModule(url);

    const source = new SourceTextModule(sourceCode.code, {
      context: moduleContext,
      importModuleDynamically,
      initializeImportMeta(meta) {
        meta.url = fileURLToPath(url);
      },
    });
    source.url = url;

    // Ensure all imports are loaded into the context
    await source.link(linker);

    return {
      exports: [],
      execute: () => {
        source.evaluate();
      },
    };
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

/**
 * This is a Node.JS ESM Experimental loading gook
 * @param specifier Pa
 * @param parentModuleURL
 * @param defaultResolverFn
 */
export async function resolve(
  specifier: string,
  parentModuleURL: string = baseURL,
  defaultResolverFn?: Function,
): Promise<ResolvedModule> {
  const modTester = new RegExp('^.{0,2}[/]');

  if (!modTester.test(specifier) && !specifier.startsWith('file:')) {
    if (defaultResolverFn) return defaultResolverFn(specifier, parentModuleURL);

    return {
      format: 'module',
      url: specifier,
    };
  }

  const resolved = new URL(specifier, parentModuleURL);
  let ext = path.extname(resolved.pathname);

  if (ext === '' && resolved.protocol === 'file:') {
    const possibleFiles = await globby(
      `${specifier}{${TS_EXTENSIONS.join(',')}}`,
      {
        cwd: path.dirname(fileURLToPath(parentModuleURL)),
        absolute: true,
      },
    );

    if (possibleFiles.length === 1) {
      return {
        url: `file://${possibleFiles[0]}`,
        format: 'dynamic',
      };
    }
  }

  if (TS_EXTENSIONS.includes(ext)) {
    return {
      format: 'dynamic',
      url: resolved.href,
    };
  }

  return {
    url: resolved.href,
    format: 'module',
  };
}
