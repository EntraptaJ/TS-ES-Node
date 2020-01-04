// src/TS-ES-Node.ts
import { promises as fs } from 'fs';
import { builtinModules, ResolvedModule } from 'module';
import path from 'path';
import ts from 'typescript';
import { pathToFileURL, URL } from 'url';
import { SourceTextModule, SyntheticModule } from 'vm';
import globby from 'globby';

const baseURL = pathToFileURL(process.cwd()).href;

/**
 * Array of TypeScript file extensions. This is also used to find imported TypeScript files since for some reason
 * the extension can't be inferred by Node.JS' Resolver.
 */
const TS_EXTENSIONS = ['.ts', '.tsx'];

/**
 * Transpiles TypeScript source and loads the result ESNext code into the Node.JS VM
 * @param sourcePathURLString Node.JS URL field for the source TypeScript file
 * @returns Node.JS Experimental SourceTextModule with the resulting ESNext code
 */
async function transpileTypeScriptToModule(
  sourcePathURLString: string,
): Promise<SourceTextModule> {
  const sourceFileURL = new URL(sourcePathURLString);
  const sourceFile = await fs.readFile(sourceFileURL);

  // TypeScript code transpiled into ESNext.
  let transpiledModule = ts.transpileModule(sourceFile.toString(), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,
      skipLibCheck: true,
    },
    reportDiagnostics: true,
  });

  /**
   * Using the NodeJS Experimental Modules we can convert the ESNext source into an ESModule
   * and load it into the VM Context
   * @see https://nodejs.org/api/vm.html#vm_class_vm_sourcetextmodule
   */

  const sourceTextModule = new SourceTextModule(transpiledModule.outputText, {
    importModuleDynamically(specifier, parentModule) {
      return linker(specifier, parentModule);
    },
    initializeImportMeta(meta) {
      meta.url = sourcePathURLString;
    },
  });

  /**
   * We need to ensure the source path of the sourceTextModule is the path of the
   * TypeScript source import for static and dynamic imports from the VM Module
   */
  sourceTextModule.url = sourcePathURLString;

  // Ensure all imports are loaded into the context
  await sourceTextModule.link(linker);

  return sourceTextModule;
}

async function linker(
  specifier: string,
  parentModule: { url: string },
): Promise<SourceTextModule | SyntheticModule> {
  const { format, url } = await resolve(specifier, parentModule.url);

  /**
   * If the import is not TypeScript ("Dynamic soru")
   */
  if (format === 'commonjs' || format === 'module') {
    const link = await import(url);
    const linkKeys = Object.keys(link);

    return new SyntheticModule(linkKeys, async function() {
      for (const linkKey of linkKeys) this.setExport(linkKey, link[linkKey]);
    });
  } else if (format === 'dynamic') {
    return transpileTypeScriptToModule(url);
  } else throw new Error('INVALID Import type');
}

export async function dynamicInstantiate(url: string) {
  const sourceTextModule = await transpileTypeScriptToModule(url);

  return {
    exports: [],
    execute: () => sourceTextModule.evaluate(),
  };
}

/**
 * This is a Node.JS ESM Expiremental loading gook
 * @param specifier Pa
 * @param parentModuleURL
 * @param defaultResolverFn
 */
export async function resolve(
  specifier: string,
  parentModuleURL: string = baseURL,
  defaultResolverFn?: Function,
): Promise<ResolvedModule> {
  const parentURL = new URL(parentModuleURL);

  if (builtinModules.includes(specifier)) {
    return {
      url: specifier,
      format: 'builtin',
    };
  }

  if (!/^\.{0,2}[/]/.test(specifier) && !specifier.startsWith('file:')) {
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
        cwd: path.dirname(parentURL.pathname),
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
