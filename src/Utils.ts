// src/Utils.ts
import { isAbsolute as isAbsolutePath, dirname } from 'path';
import ts, { CompilerOptions } from 'typescript';

let rootModulePath: string;

export function setRootPath(modulePath: string): string {
  if (!rootModulePath) rootModulePath = modulePath;

  return rootModulePath;
}

export function getRootPath(): string {
  if (!rootModulePath) return process.cwd();

  return rootModulePath;
}

let tsConfigCache: CompilerOptions;

/**
 * Finds the next closest `tsconfig.json`
 */
export function getTSConfig(
  modulePath: string = rootModulePath,
): CompilerOptions {
  if (tsConfigCache) return tsConfigCache;
  const tsConfigPath = ts.findConfigFile(modulePath, ts.sys.fileExists);

  if (!tsConfigPath || !isAbsolutePath(tsConfigPath))
    tsConfigCache = {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,
      skipLibCheck: true,
    };
  else {
    const tsConfigFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile)
      .config;

    tsConfigCache = ts.convertCompilerOptionsFromJson(
      tsConfigFile.compilerOptions,
      dirname(tsConfigPath),
    ).options;
  }

  return tsConfigCache;
}
