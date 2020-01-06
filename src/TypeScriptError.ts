// src/TypeScriptError.ts
import ts from 'typescript';
import { inspect } from 'util';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (path) => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

/**
 * @internal
 */
export const INSPECT_CUSTOM = inspect.custom || 'inspect';

export class TSError extends SyntaxError {
  name = 'TSError';

  constructor(public diagnosticText: string) {
    super(`⨯ Unable to compile TypeScript:\n${diagnosticText}`);
  }

  [INSPECT_CUSTOM]() {
    return this.diagnosticText;
  }
}

export function createTSError(
  diagnostics: ReadonlyArray<ts.Diagnostic>,
): TSError {
  const diagnosticText = ts.formatDiagnosticsWithColorAndContext(
    diagnostics,
    formatHost,
  );

  const diagnosticCodes = diagnostics.map((x) => x.code);
  return new TSError(diagnosticText);
}
