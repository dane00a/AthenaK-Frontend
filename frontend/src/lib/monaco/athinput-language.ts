// Custom Monaco language: .athinput.
// - Block headers like <mesh>
// - key = value pairs
// - # line comments
// Plus trivial snippets for common blocks.

import type * as MonacoNS from "monaco-editor";

type Monaco = typeof MonacoNS;
export const ATHINPUT_LANGUAGE_ID = "athinput";

let registered = false;

export function registerAthinputLanguage(monaco: Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({ id: ATHINPUT_LANGUAGE_ID, extensions: [".athinput"] });

  monaco.languages.setLanguageConfiguration(ATHINPUT_LANGUAGE_ID, {
    comments: { lineComment: "#" },
    brackets: [["<", ">"]],
    autoClosingPairs: [{ open: "<", close: ">" }],
  });

  monaco.languages.setMonarchTokensProvider(ATHINPUT_LANGUAGE_ID, {
    defaultToken: "",
    tokenizer: {
      root: [
        [/^\s*#.*$/, "comment"],
        [/^\s*<[^>]+>\s*$/, "type.identifier"],
        [/^\s*[A-Za-z_][\w.-]*\s*(?==)/, "variable.name"],
        [/=/, "operator"],
        [/[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?/, "number"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/#.*$/, "comment"],
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider(ATHINPUT_LANGUAGE_ID, {
    triggerCharacters: ["<"],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );
      const blocks = [
        "<comment>\nproblem = ${1:name}\n",
        "<job>\nbasename = ${1:name}\n",
        "<mesh>\nnx1 = ${1:256}\nx1min = ${2:-0.5}\nx1max = ${3:0.5}\nix1_bc = ${4:outflow}\nox1_bc = ${4:outflow}\n",
        "<time>\nintegrator = ${1:rk2}\ncfl_number = ${2:0.8}\ntlim = ${3:0.25}\n",
        "<hydro>\neos = ${1:ideal}\ngamma = ${2:1.4}\nreconstruct = ${3:plm}\nrsolver = ${4:llf}\n",
        "<problem>\n${0}",
        "<output1>\nfile_type = ${1:hst}\ndt = ${2:0.01}\nvariable = ${3:hydro_w}\n",
      ];
      return {
        suggestions: blocks.map((ins, i) => ({
          label: ins.slice(0, ins.indexOf(">") + 1),
          kind: monaco.languages.CompletionItemKind.Module,
          insertText: ins,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: String(i).padStart(3, "0"),
        })),
      };
    },
  });
}
