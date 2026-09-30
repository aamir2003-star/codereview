'use client';

import React from 'react';

/**
 * Lightweight, zero-dependency VS Code Dark+ Syntax Tokenizer & Highlighter
 */
export function highlightVsCodeSyntax(code: string): React.ReactNode[] {
  if (!code) return [];

  // Token regex for common JS/TS/HTML/Python patterns
  const tokenRegex =
    /(\/\/.*$|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:import|export|from|const|let|var|function|return|if|else|for|while|switch|case|break|continue|async|await|try|catch|finally|throw|class|extends|implements|interface|type|enum|default|new|null|undefined|true|false|void|this|super|public|private|protected|readonly|static|as|typeof|instanceof|keyof)\b)|(\b(?:string|number|boolean|any|unknown|never|object|symbol|bigint|Record|Array|Promise|Partial|Required|Readonly|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|InstanceType|React|FC|Props|NextPage|Request|Response|NextResponse|NextRequest|ObjectId|Document|Schema|Model|User|Review|Comment|Error|Date|Math|JSON|Console)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())|([{}()[\].,;:?!=<>+\-*/%&|^~])/gm;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    const [fullMatch, comment, stringLiteral, keyword, typeName, numberLiteral, funcName, symbol] = match;
    const matchIndex = match.index;

    // Normal text before this token
    if (matchIndex > lastIndex) {
      elements.push(
        <span key={`text-${lastIndex}`} className="text-[#9cdcfe]">
          {code.slice(lastIndex, matchIndex)}
        </span>
      );
    }

    if (comment) {
      elements.push(
        <span key={`comment-${matchIndex}`} className="text-[#6a9955] italic">
          {comment}
        </span>
      );
    } else if (stringLiteral) {
      elements.push(
        <span key={`str-${matchIndex}`} className="text-[#ce9178]">
          {stringLiteral}
        </span>
      );
    } else if (keyword) {
      elements.push(
        <span key={`kw-${matchIndex}`} className="text-[#569cd6] font-medium">
          {keyword}
        </span>
      );
    } else if (typeName) {
      elements.push(
        <span key={`type-${matchIndex}`} className="text-[#4ec9b0]">
          {typeName}
        </span>
      );
    } else if (funcName) {
      elements.push(
        <span key={`fn-${matchIndex}`} className="text-[#dcdcaa]">
          {funcName}
        </span>
      );
    } else if (numberLiteral) {
      elements.push(
        <span key={`num-${matchIndex}`} className="text-[#b5cea8]">
          {numberLiteral}
        </span>
      );
    } else if (symbol) {
      elements.push(
        <span key={`sym-${matchIndex}`} className="text-[#d4d4d4]">
          {symbol}
        </span>
      );
    } else {
      elements.push(
        <span key={`other-${matchIndex}`} className="text-[#d4d4d4]">
          {fullMatch}
        </span>
      );
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Trailing text
  if (lastIndex < code.length) {
    elements.push(
      <span key={`tail-${lastIndex}`} className="text-[#9cdcfe]">
        {code.slice(lastIndex)}
      </span>
    );
  }

  return elements.length > 0 ? elements : [<span key="plain" className="text-[#d4d4d4]">{code}</span>];
}

/**
 * VS Code Dark+ styled Code Block
 */
export function VsCodeEditorBlock({
  code,
  filename = 'fix.ts',
  onCopy,
  copied,
}: {
  code: string;
  filename?: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="rounded-md border border-[#333333] bg-[#1e1e1e] overflow-hidden shadow-lg font-mono text-xs">
      {/* VS Code Tab Bar */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#2d2d2d] px-3 py-1.5">
        <div className="flex items-center gap-2">
          {/* Active Tab */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] text-[#cccccc] text-[11px] rounded-t border-t border-[#007acc]">
            <span className="text-[#4ec9b0] text-[10px] font-bold">TS</span>
            <span className="font-mono">{filename}</span>
          </div>
        </div>

        {onCopy && (
          <button
            onClick={onCopy}
            className="h-6 px-2.5 rounded bg-[#333333] hover:bg-[#3c3c3c] text-[#cccccc] hover:text-white text-[10px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copied ? (
              <span className="text-[#4ec9b0] font-medium">✓ Copied</span>
            ) : (
              <span>Copy</span>
            )}
          </button>
        )}
      </div>

      {/* Code Area with Line Numbers */}
      <div className="p-3 bg-[#1e1e1e] overflow-x-auto text-[12px] leading-5 font-mono select-text">
        {code.split('\n').map((line, i) => (
          <div key={i} className="flex">
            <span className="w-8 shrink-0 text-[#858585] text-right pr-3 select-none text-[11px]">
              {i + 1}
            </span>
            <span className="whitespace-pre flex-1">
              {highlightVsCodeSyntax(line)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
