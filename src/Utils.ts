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

/**
 * Finds the next closest `tsconfig.json`
 */
export async function getTSConfig(
  modulePath: string = rootModulePath,
): Promise<CompilerOptions> {
  const tsConfigPath = ts.findConfigFile(modulePath, ts.sys.fileExists);

  if (!tsConfigPath || !isAbsolutePath(tsConfigPath))
    return {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,
      skipLibCheck: true,
    };

  const tsConfigFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile).config;

  return ts.convertCompilerOptionsFromJson(
    tsConfigFile.compilerOptions,
    dirname(tsConfigPath),
  ).options;
}
