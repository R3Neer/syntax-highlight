export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface EbnfDiagnostic {
  message: string;
  position: SourcePosition;
}

export type EbnfTerm =
  | { kind: "literal"; value: string; position: SourcePosition }
  | { kind: "reference"; name: string; position: SourcePosition }
  | { kind: "special"; value: string; position: SourcePosition }
  | { kind: "optional"; expression: EbnfExpression; position: SourcePosition }
  | { kind: "repetition"; expression: EbnfExpression; position: SourcePosition }
  | { kind: "group"; expression: EbnfExpression; position: SourcePosition };

export interface EbnfSequence {
  terms: EbnfTerm[];
}

export interface EbnfExpression {
  alternatives: EbnfSequence[];
}

export interface EbnfProduction {
  name: string;
  expression: EbnfExpression;
  position: SourcePosition;
}

export interface EbnfGrammar {
  productions: ReadonlyMap<string, EbnfProduction>;
  order: readonly string[];
}

type TokenKind =
  | "identifier"
  | "literal"
  | "special"
  | "definition"
  | "pipe"
  | "comma"
  | "semicolon"
  | "left-parenthesis"
  | "right-parenthesis"
  | "left-bracket"
  | "right-bracket"
  | "left-brace"
  | "right-brace"
  | "eof";

interface Token {
  kind: TokenKind;
  value: string;
  position: SourcePosition;
}

export class EbnfSyntaxError extends Error {
  constructor(
    message: string,
    readonly position: SourcePosition,
  ) {
    super(`${message} (${position.line}:${position.column})`);
  }
}

function positionAt(source: string, offset: number): SourcePosition {
  let line = 1;
  let column = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { offset, line, column };
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  const add = (kind: TokenKind, value: string, from: number): void => {
    tokens.push({ kind, value, position: positionAt(source, from) });
  };

  while (cursor < source.length) {
    if (/\s/.test(source[cursor] ?? "")) {
      cursor += 1;
      continue;
    }
    if (source.startsWith("(*", cursor)) {
      const closing = source.indexOf("*)", cursor + 2);
      if (closing < 0) {
        throw new EbnfSyntaxError(
          "Comentario EBNF sin cierre",
          positionAt(source, cursor),
        );
      }
      cursor = closing + 2;
      continue;
    }
    if (source.startsWith("::=", cursor)) {
      add("definition", "::=", cursor);
      cursor += 3;
      continue;
    }

    const character = source[cursor] ?? "";
    if (character === '"') {
      const from = cursor;
      cursor += 1;
      let value = "";
      while (cursor < source.length && source[cursor] !== '"') {
        if (source[cursor] === "\\" && cursor + 1 < source.length) {
          value += source[cursor + 1];
          cursor += 2;
        } else {
          value += source[cursor];
          cursor += 1;
        }
      }
      if (source[cursor] !== '"') {
        throw new EbnfSyntaxError(
          "Terminal EBNF sin cierre",
          positionAt(source, from),
        );
      }
      cursor += 1;
      add("literal", value, from);
      continue;
    }
    if (character === "?") {
      const from = cursor;
      const closing = source.indexOf("?", cursor + 1);
      if (closing < 0) {
        throw new EbnfSyntaxError(
          "Secuencia especial EBNF sin cierre",
          positionAt(source, from),
        );
      }
      add("special", source.slice(cursor + 1, closing).trim(), from);
      cursor = closing + 1;
      continue;
    }
    const identifier = /^[A-Za-z][A-Za-z0-9_-]*/.exec(source.slice(cursor));
    if (identifier !== null) {
      add("identifier", identifier[0], cursor);
      cursor += identifier[0].length;
      continue;
    }

    const punctuation: Record<string, TokenKind> = {
      "|": "pipe",
      ",": "comma",
      ";": "semicolon",
      "(": "left-parenthesis",
      ")": "right-parenthesis",
      "[": "left-bracket",
      "]": "right-bracket",
      "{": "left-brace",
      "}": "right-brace",
    };
    const kind = punctuation[character];
    if (kind !== undefined) {
      add(kind, character, cursor);
      cursor += 1;
      continue;
    }
    throw new EbnfSyntaxError(
      `Carácter EBNF inesperado ${JSON.stringify(character)}`,
      positionAt(source, cursor),
    );
  }

  add("eof", "", source.length);
  return tokens;
}

class Parser {
  private cursor = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): EbnfGrammar {
    const productions = new Map<string, EbnfProduction>();
    const order: string[] = [];
    while (!this.at("eof")) {
      const name = this.consume("identifier", "Se esperaba una producción");
      this.consume("definition", `Falta ::= después de ${name.value}`);
      const expression = this.expression(new Set(["semicolon"]));
      this.consume("semicolon", `Falta ; al cerrar ${name.value}`);
      if (productions.has(name.value)) {
        throw new EbnfSyntaxError(
          `Producción duplicada: ${name.value}`,
          name.position,
        );
      }
      productions.set(name.value, {
        name: name.value,
        expression,
        position: name.position,
      });
      order.push(name.value);
    }
    return { productions, order };
  }

  private expression(stops: ReadonlySet<TokenKind>): EbnfExpression {
    const alternatives: EbnfSequence[] = [];
    while (true) {
      alternatives.push(this.sequence(new Set([...stops, "pipe"])));
      if (!this.at("pipe")) break;
      this.cursor += 1;
    }
    return { alternatives };
  }

  private sequence(stops: ReadonlySet<TokenKind>): EbnfSequence {
    const terms: EbnfTerm[] = [];
    let expectTerm = true;
    while (!stops.has(this.current().kind) && !this.at("eof")) {
      if (!expectTerm) {
        if (this.at("comma")) {
          this.cursor += 1;
          expectTerm = true;
          continue;
        }
        throw new EbnfSyntaxError(
          "Falta una coma entre términos EBNF",
          this.current().position,
        );
      }
      terms.push(this.term());
      expectTerm = false;
    }
    if (expectTerm && terms.length > 0) {
      throw new EbnfSyntaxError(
        "La secuencia EBNF termina después de una coma",
        this.current().position,
      );
    }
    if (terms.length === 0) {
      throw new EbnfSyntaxError(
        "Alternativa EBNF vacía",
        this.current().position,
      );
    }
    return { terms };
  }

  private term(): EbnfTerm {
    const token = this.current();
    if (token.kind === "literal") {
      this.cursor += 1;
      return { kind: "literal", value: token.value, position: token.position };
    }
    if (token.kind === "identifier") {
      this.cursor += 1;
      return { kind: "reference", name: token.value, position: token.position };
    }
    if (token.kind === "special") {
      this.cursor += 1;
      return { kind: "special", value: token.value, position: token.position };
    }
    const groups: Partial<
      Record<
        TokenKind,
        {
          close: TokenKind;
          kind: "optional" | "repetition" | "group";
        }
      >
    > = {
      "left-bracket": { close: "right-bracket", kind: "optional" },
      "left-brace": { close: "right-brace", kind: "repetition" },
      "left-parenthesis": { close: "right-parenthesis", kind: "group" },
    };
    const group = groups[token.kind];
    if (group !== undefined) {
      this.cursor += 1;
      const expression = this.expression(new Set([group.close]));
      this.consume(group.close, `Falta ${this.label(group.close)}`);
      return { kind: group.kind, expression, position: token.position };
    }
    throw new EbnfSyntaxError("Se esperaba un término EBNF", token.position);
  }

  private current(): Token {
    return this.tokens[this.cursor] ?? this.tokens[this.tokens.length - 1];
  }

  private at(kind: TokenKind): boolean {
    return this.current().kind === kind;
  }

  private consume(kind: TokenKind, message: string): Token {
    const token = this.current();
    if (token.kind !== kind) throw new EbnfSyntaxError(message, token.position);
    this.cursor += 1;
    return token;
  }

  private label(kind: TokenKind): string {
    const labels: Partial<Record<TokenKind, string>> = {
      "right-bracket": "]",
      "right-brace": "}",
      "right-parenthesis": ")",
    };
    return labels[kind] ?? kind;
  }
}

export function parseEbnf(source: string): EbnfGrammar {
  return new Parser(tokenize(source)).parse();
}

function referencedProductions(term: EbnfTerm): string[] {
  if (term.kind === "reference") return [term.name];
  if (
    term.kind === "optional" ||
    term.kind === "repetition" ||
    term.kind === "group"
  ) {
    return term.expression.alternatives.flatMap((alternative) =>
      alternative.terms.flatMap(referencedProductions),
    );
  }
  return [];
}

export function validateEbnf(
  grammar: EbnfGrammar,
  start?: string,
): EbnfDiagnostic[] {
  const diagnostics: EbnfDiagnostic[] = [];
  for (const production of grammar.productions.values()) {
    for (const reference of production.expression.alternatives.flatMap(
      (alternative) => alternative.terms.flatMap(referencedProductions),
    )) {
      if (
        /^[a-z]/.test(reference) &&
        !grammar.productions.has(reference)
      ) {
        diagnostics.push({
          message: `Producción indefinida: ${reference}`,
          position: production.position,
        });
      }
    }
  }
  if (start !== undefined && !grammar.productions.has(start)) {
    diagnostics.push({
      message: `Símbolo inicial inexistente: ${start}`,
      position: { offset: 0, line: 1, column: 1 },
    });
  }
  return diagnostics;
}

export function collectLiterals(
  grammar: EbnfGrammar,
  productionName: string,
): ReadonlySet<string> {
  const result = new Set<string>();
  const visited = new Set<string>();

  const visitExpression = (expression: EbnfExpression): void => {
    for (const alternative of expression.alternatives) {
      for (const term of alternative.terms) visitTerm(term);
    }
  };
  const visitTerm = (term: EbnfTerm): void => {
    if (term.kind === "literal") {
      result.add(term.value);
    } else if (term.kind === "reference") {
      if (visited.has(term.name)) return;
      const production = grammar.productions.get(term.name);
      if (production === undefined) return;
      visited.add(term.name);
      visitExpression(production.expression);
    } else if (
      term.kind === "optional" ||
      term.kind === "repetition" ||
      term.kind === "group"
    ) {
      visitExpression(term.expression);
    }
  };

  const production = grammar.productions.get(productionName);
  if (production !== undefined) {
    visited.add(productionName);
    visitExpression(production.expression);
  }
  return result;
}

function directFirstLiterals(term: EbnfTerm): ReadonlySet<string> {
  if (term.kind === "literal") return new Set([term.value]);
  if (
    term.kind === "optional" ||
    term.kind === "repetition" ||
    term.kind === "group"
  ) {
    const result = new Set<string>();
    for (const alternative of term.expression.alternatives) {
      const first = alternative.terms[0];
      if (first !== undefined) {
        for (const value of directFirstLiterals(first)) result.add(value);
      }
    }
    return result;
  }
  return new Set();
}

function directLastLiterals(term: EbnfTerm): ReadonlySet<string> {
  if (term.kind === "literal") return new Set([term.value]);
  if (
    term.kind === "optional" ||
    term.kind === "repetition" ||
    term.kind === "group"
  ) {
    const result = new Set<string>();
    for (const alternative of term.expression.alternatives) {
      const last = alternative.terms.at(-1);
      if (last !== undefined) {
        for (const value of directLastLiterals(last)) result.add(value);
      }
    }
    return result;
  }
  return new Set();
}

export interface LiteralContext {
  value: string;
  previous: ReadonlySet<string>;
  next: ReadonlySet<string>;
}

export function findLiteralContexts(
  grammar: EbnfGrammar,
  values: ReadonlySet<string>,
): LiteralContext[] {
  const contexts: LiteralContext[] = [];

  const visitExpression = (
    expression: EbnfExpression,
    outerPrevious: ReadonlySet<string>,
    outerNext: ReadonlySet<string>,
  ): void => {
    for (const alternative of expression.alternatives) {
      alternative.terms.forEach((term, index) => {
        const previousTerm = alternative.terms[index - 1];
        const nextTerm = alternative.terms[index + 1];
        const previous =
          previousTerm === undefined
            ? outerPrevious
            : directLastLiterals(previousTerm);
        const next =
          nextTerm === undefined ? outerNext : directFirstLiterals(nextTerm);
        visitTerm(term, previous, next);
      });
    }
  };
  const visitTerm = (
    term: EbnfTerm,
    previous: ReadonlySet<string>,
    next: ReadonlySet<string>,
  ): void => {
    if (term.kind === "literal" && values.has(term.value)) {
      contexts.push({ value: term.value, previous, next });
    } else if (
      term.kind === "optional" ||
      term.kind === "repetition" ||
      term.kind === "group"
    ) {
      visitExpression(term.expression, previous, next);
    }
  };

  for (const production of grammar.productions.values()) {
    visitExpression(production.expression, new Set(), new Set());
  }
  return contexts;
}

export function literalsBeforeReference(
  grammar: EbnfGrammar,
  referenceName: string,
): ReadonlySet<string> {
  const result = new Set<string>();
  const visitExpression = (expression: EbnfExpression): void => {
    for (const alternative of expression.alternatives) {
      alternative.terms.forEach((term, index) => {
        if (term.kind === "reference" && term.name === referenceName) {
          const previous = alternative.terms[index - 1];
          if (previous !== undefined) {
            for (const value of directLastLiterals(previous)) result.add(value);
          }
        }
        if (
          term.kind === "optional" ||
          term.kind === "repetition" ||
          term.kind === "group"
        ) {
          visitExpression(term.expression);
        }
      });
    }
  };
  for (const production of grammar.productions.values()) {
    visitExpression(production.expression);
  }
  return result;
}
