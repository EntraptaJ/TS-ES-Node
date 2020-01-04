// src/TS-ES-Node.ts
import { promises as fs } from 'fs';
import { builtinModules, ResolvedModule } from 'module';
import path from 'path';
import ts from 'typescript';
import { pathToFileURL, URL } from 'url';
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
    importModuleDynamically(specifier, parentModule) {
      return linker(specifier, parentModule);
    },
    initializeImportMeta(meta) {
      meta.url = url;
    },
  });

  sourceTextModule.url = url;

  await sourceTextModule.link(linker);

  return sourceTextModule;
}

async function linker(
  specifier: string,
  parentModule: { url: string },
): Promise<SourceTextModule | SyntheticModule> {
  const { format, url } = await resolve(specifier, parentModule.url);

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

export async function resolve(
  specifier: string,
  parentModuleURL: string = baseURL,
  defaultResolverFn?: Function,
): Promise<ResolvedModule> {
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
