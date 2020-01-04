// src/TS-ES-Node.ts
import { promises as fs } from 'fs';
import { builtinModules, ResolvedModule, Resolver } from 'module';
import path from 'path';
import ts from 'typescript';
import { pathToFileURL, URL, fileURLToPath } from 'url';
import { SourceTextModule, SyntheticModule } from 'vm';
import globby from 'globby';

const baseURL = pathToFileURL(process.cwd()).href;

const TS_EXTENSIONS = ['.ts', '.tsx'];

async function transpileTypeScriptToModule(
  url: string,
): Promise<SourceTextModule> {
  const sourceFileURL = new URL(url);

  const sourceFile = await fs.readFile(sourceFileURL);

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

  const sourceTextModule = new SourceTextModule(transpiledModule.outputText, {
    importModuleDynamically(specifier) {
      return import(specifier);
    },
    initializeImportMeta(meta) {
      // Note: this object is created in the top context. As such,
      // Object.getPrototypeOf(import.meta.prop) points to the
      // Object.prototype in the top context rather than that in
      // the sandbox.
    },
  });

  sourceTextModule.url = url;
  // @ts-ignore
  await sourceTextModule.link(linker);

  return sourceTextModule;
}

async function linker(specifier: string, parentModule: { url: string }) {
  const { format, url } = await resolver(specifier, parentModule.url);

  if (format === 'commonjs' || format === 'module') {
    const link = await import(url);
    const linkKeys = Object.keys(link);

    return new SyntheticModule(linkKeys, async function() {
      for (const linkKey of linkKeys) this.setExport(linkKey, link[linkKey]);
    });
  } else if (format === 'dynamic') {
    return transpileTypeScriptToModule(url);
  }
}

export async function dynamicInstantiate(url: string) {
  const sourceTextModule = await transpileTypeScriptToModule(url);

  return {
    exports: [],
    execute: () => sourceTextModule.evaluate(),
  };
}

export async function resolver(
  specifier: string,
  parentModuleURL: string = baseURL,
): Promise<ResolvedModule> {
  if (builtinModules.includes(specifier)) {
    return {
      url: specifier,
      format: 'builtin',
    };
  }

  if (
    /^\.{0,2}[/]/.test(specifier) !== true &&
    !specifier.startsWith('file:')
  ) {
    return {
      format: 'module',
      url: specifier,
    };
  }

  const resolved = new URL(specifier, parentModuleURL);
  let ext = path.extname(resolved.pathname);

  if (ext === '' && resolved.protocol === 'file:') {
    const possibleFiles = await globby(
      `${resolved.pathname}{${TS_EXTENSIONS.join(',')}}`,
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

export async function resolve(
  specifier: string,
  parentModuleURL: string = baseURL,
  defaultResolver: Resolver,
): Promise<ResolvedModule> {
  if (builtinModules.includes(specifier)) {
    return {
      url: specifier,
      format: 'builtin',
    };
  }

  if (
    /^\.{0,2}[/]/.test(specifier) !== true &&
    !specifier.startsWith('file:')
  ) {
    return defaultResolver(specifier, parentModuleURL);
  }

  const resolved = new URL(specifier, parentModuleURL);
  const ext = path.extname(resolved.pathname);

  if (ext === '' && resolved.protocol === 'file:') {
    const possibleFiles = await globby(
      `${resolved.pathname}{${TS_EXTENSIONS.join(',')}}`,
    );
    if (possibleFiles.length === 1) {
      return {
        format: 'dynamic',
        url: possibleFiles[0],
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
