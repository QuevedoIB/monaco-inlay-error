import { monaco } from "./monaco/index";
import { emmetHTML } from "emmet-monaco-es";
import { loadWASM } from "onigasm";
import { Registry } from "monaco-textmate";
import { wireTmGrammars } from "monaco-editor-textmate";
import * as syntaxes from "../src/assets/syntaxes";

import "../style.css";

monaco.languages.register({ id: "javascript" });
monaco.languages.register({ id: "typescript" });
monaco.languages.register({ id: "css" });
monaco.languages.register({ id: "html" });

emmetHTML(monaco);

export async function createEditors(configs) {
  try {
    const response = await window.fetch(
      "https://cdn.jsdelivr.net/npm/onigasm@2.2.5/lib/onigasm.wasm"
    );
    const buffer = await response.arrayBuffer();
    await loadWASM(buffer);

    const registry = new Registry({
      getGrammarDefinition: async (scopeName) => {
        try {
          const extension = scopeName.split(".")[1];
          const data = {
            format: "json",
            content: JSON.stringify(syntaxes[extension]),
          };
          return data;
        } catch (error) {
          console.log("Failed to load tmLanguages files", error);
        }
      },
    });

    const grammars = new Map();
    grammars.set("css", "source.css");
    grammars.set("html", "text.html.basic");
    grammars.set("typescript", "source.ts");
    grammars.set("javascript", "source.js");

    const configureTheme = async () => {
      monaco.editor.defineTheme("custom", { base: "vs" });

      await import(
        "monaco-editor/esm/vs/language/typescript/monaco.contribution"
      );
      await import("monaco-editor/esm/vs/language/css/monaco.contribution");
      await import("monaco-editor/esm/vs/language/html/monaco.contribution");
    };

    await configureTheme();

    const editors = {};

    await Promise.all(
      configs.map(async ({ language, value, domElement }) => {
        const editor = monaco.editor.create(domElement, {
          value,
          language,
          theme: "solarized",
        });
        editors[language] = editor;
        return await wireTmGrammars(monaco, registry, grammars, editor);
      })
    );

    return editors;
  } catch (error) {
    console.log("Error while setting up editors", error);
  }
}

(async () => {
  await createEditors([
    {
      domElement: document.querySelector(".html"),
      language: "html",
      value: ``,
    },
    { domElement: document.querySelector(".css"), language: "css", value: `` },
    {
      domElement: document.querySelector(".js"),
      language: "javascript",
      value: ``,
    },
  ]);
})();

const convertTheme = (theme) => {
  const returnTheme = {
    inherit: false,
    base: "vs-dark",
    colors: theme.colors,
    rules: [],
    encodedTokensColors: [],
  };
  theme.tokenColors.forEach((color) => {
    if (typeof color.scope === "string") {
      const split = color.scope.split(",");
      if (split.length > 1) {
        color.scope = split;
        evalAsArray();
        return;
      }
      returnTheme.rules.push(
        Object.assign({}, color.settings, {
          // token: color.scope.replace(/\s/g, '')
          token: color.scope,
        })
      );
      return;
    }
    evalAsArray();
    function evalAsArray() {
      if (color.scope) {
        color.scope.forEach((scope) => {
          returnTheme.rules.push(
            Object.assign({}, color.settings, {
              token: scope,
            })
          );
        });
      }
    }
  });
  returnTheme.rules.push({
    token: "",
    foreground: returnTheme.colors["editor.foreground"],
  });
  return returnTheme;
};
