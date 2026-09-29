import type { StreamParser, StringStream } from "@codemirror/language";

interface PrologState {
  blockComment: boolean;
  quote: "'" | '"' | null;
}

function quoted(stream: StringStream, quote: "'" | '"'): boolean {
  while (!stream.eol()) {
    const character = stream.next();
    if (character === "\\") {
      stream.next();
    } else if (character === quote) {
      if (stream.peek() === quote) {
        stream.next();
      } else {
        return true;
      }
    }
  }
  return false;
}

/** Small SWI-style Prolog mode for ordinary clauses, queries and directives. */
export const prolog: StreamParser<PrologState> = {
  name: "prolog",
  startState: () => ({ blockComment: false, quote: null }),
  copyState: (state) => ({ ...state }),
  token(stream, state) {
    if (state.blockComment) {
      while (!stream.eol()) {
        if (stream.match("*/")) {
          state.blockComment = false;
          break;
        }
        stream.next();
      }
      return "comment";
    }
    if (state.quote !== null) {
      const style = state.quote === "'" ? "atom" : "string";
      const closed = quoted(stream, state.quote);
      if (closed) state.quote = null;
      return style;
    }
    if (stream.eatSpace()) return null;
    if (stream.match("%")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match("/*")) {
      state.blockComment = true;
      while (!stream.eol()) {
        if (stream.match("*/")) {
          state.blockComment = false;
          break;
        }
        stream.next();
      }
      return "comment";
    }
    if (stream.match(/^["']/)) {
      state.quote = stream.current() as "'" | '"';
      const style = state.quote === "'" ? "atom" : "string";
      const closed = quoted(stream, state.quote);
      if (closed) state.quote = null;
      return style;
    }
    if (stream.match(/^(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/)) {
      return "number";
    }
    if (stream.match(/^[A-Z_][\w]*/)) return "variable";
    if (stream.match(/^[a-z][\w]*/)) {
      return /^(?:is|mod|div|not|true|fail|false|dynamic|multifile|module|use_module)$/
        .test(stream.current()) ? "keyword" : "atom";
    }
    if (stream.match(/^(?::-|\?-|-->|=:=|=\\=|\\==|==|=<|>=|\\+|\*\*|\/\/)/)) {
      return "operator";
    }
    if (stream.match(/^[+*=<>&|!\\~-]+/) || stream.eat("/")) return "operator";
    stream.next();
    return "punctuation";
  },
  languageData: {
    commentTokens: { line: "%", block: { open: "/*", close: "*/" } },
  },
};
