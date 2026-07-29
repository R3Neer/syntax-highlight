import {
  compileGrammarHighlightConfig,
  compileMudHighlightConfig,
  DEFAULT_HIGHLIGHT_CONFIG,
  type MudHighlightConfig,
} from "./config";
import { tokenizeEbnf } from "./ebnf-tokenizer";
import type {
  LanguageProfileSettings,
  SyntaxPluginSettings,
} from "./settings";
import {
  tokenizeGrammar,
  tokenizeMud,
  type SyntaxToken,
} from "./tokenizer";

export interface LanguageStatus {
  state: "ready" | "loading" | "error";
  message: string;
  updatedAt: number | null;
}

export interface LanguageRuntime {
  settings: LanguageProfileSettings;
  status: LanguageStatus;
  revision: number;
  tokenize(source: string): SyntaxToken[];
}

export type GrammarSourceLoader = (path: string) => Promise<string>;
type Listener = () => void;

interface InternalRuntime extends LanguageRuntime {
  highlightConfig?: MudHighlightConfig;
}

export class LanguageRegistry {
  private readonly runtimes = new Map<string, InternalRuntime>();
  private readonly listeners = new Set<Listener>();

  constructor(
    settings: SyntaxPluginSettings,
    private readonly loadSource: GrammarSourceLoader,
  ) {
    this.replaceSettings(settings);
  }

  replaceSettings(settings: SyntaxPluginSettings): void {
    const incoming = new Set(settings.languages.map(({ id }) => id));
    for (const id of this.runtimes.keys()) {
      if (!incoming.has(id)) this.runtimes.delete(id);
    }
    for (const profile of settings.languages) {
      const existing = this.runtimes.get(profile.id);
      if (existing === undefined) {
        const runtime: InternalRuntime = {
          settings: profile,
          status:
            profile.engine === "ebnf"
              ? { state: "ready", message: "Tokenizador EBNF integrado", updatedAt: Date.now() }
              : { state: "loading", message: "Pendiente de cargar", updatedAt: null },
          revision: 0,
          highlightConfig:
            profile.engine === "mud" ? DEFAULT_HIGHLIGHT_CONFIG : undefined,
          tokenize: (source) => this.tokenize(profile.id, source),
        };
        this.runtimes.set(profile.id, runtime);
      } else {
        existing.settings = profile;
      }
    }
    this.notify();
  }

  async reloadAll(): Promise<void> {
    await Promise.all(
      [...this.runtimes.values()].map((runtime) => this.reload(runtime.settings.id)),
    );
  }

  async reload(id: string): Promise<void> {
    const runtime = this.runtimes.get(id);
    if (runtime === undefined || runtime.settings.engine === "ebnf") return;
    runtime.status = {
      state: "loading",
      message: "Cargando gramáticas…",
      updatedAt: runtime.status.updatedAt,
    };
    this.notify();
    try {
      const [lexical, syntax] = await Promise.all([
        this.loadSource(runtime.settings.lexicalGrammarPath),
        this.loadSource(runtime.settings.syntaxGrammarPath),
      ]);
      runtime.highlightConfig =
        runtime.settings.engine === "mud"
          ? compileMudHighlightConfig(lexical, syntax)
          : compileGrammarHighlightConfig(
              lexical,
              syntax,
              runtime.settings.categories,
              runtime.settings.lexicalStart,
              runtime.settings.syntaxStart,
            );
      runtime.revision += 1;
      runtime.status = {
        state: "ready",
        message: `${runtime.highlightConfig.words.keyword.length + runtime.highlightConfig.words.operator.length} palabras y ${runtime.highlightConfig.symbols.operator.length} operadores`,
        updatedAt: Date.now(),
      };
    } catch (error) {
      runtime.status = {
        state: "error",
        message: error instanceof Error ? error.message : String(error),
        updatedAt: runtime.status.updatedAt,
      };
    }
    this.notify();
  }

  affectedBy(path: string): LanguageRuntime[] {
    return [...this.runtimes.values()].filter(
      ({ settings }) =>
        settings.lexicalGrammarPath === path ||
        settings.syntaxGrammarPath === path,
    );
  }

  get(id: string): LanguageRuntime | undefined {
    return this.runtimes.get(id);
  }

  enabled(): LanguageRuntime[] {
    return [...this.runtimes.values()].filter(
      ({ settings }) => settings.enabled,
    );
  }

  byFence(fence: string): LanguageRuntime | undefined {
    const normalized = fence.toLocaleLowerCase();
    return this.enabled().find(({ settings }) =>
      settings.fences.some(
        (candidate) => candidate.toLocaleLowerCase() === normalized,
      ),
    );
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private tokenize(id: string, source: string): SyntaxToken[] {
    const runtime = this.runtimes.get(id);
    if (runtime === undefined) return [];
    if (runtime.settings.engine === "ebnf") return tokenizeEbnf(source);
    const config = runtime.highlightConfig ?? DEFAULT_HIGHLIGHT_CONFIG;
    return runtime.settings.engine === "mud"
      ? tokenizeMud(source, config)
      : tokenizeGrammar(source, config);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
