import {
  compileGrammarHighlightConfig,
  compileMudHighlightConfig,
  DEFAULT_HIGHLIGHT_CONFIG,
  type MudHighlightConfig,
} from "./config";
import {
  BUILTIN_DESCRIPTORS,
  validateLanguageDescriptor,
  type LanguageDescriptor,
} from "./descriptor";
import { tokenizeAsdl } from "./asdl-tokenizer";
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
  descriptor: LanguageDescriptor;
  status: LanguageStatus;
  revision: number;
  tokenize(source: string): SyntaxToken[];
}

export type SourceLoader = (path: string) => Promise<string>;
type Listener = () => void;

interface InternalRuntime extends LanguageRuntime {
  highlightConfig?: MudHighlightConfig;
}

function fallbackDescriptor(profile: LanguageProfileSettings): LanguageDescriptor {
  const source =
    profile.embeddedDescriptor ??
    BUILTIN_DESCRIPTORS[profile.id] ??
    BUILTIN_DESCRIPTORS.generic;
  const descriptor = structuredClone(source);
  if (descriptor.id === "generic") {
    descriptor.id = profile.id;
    descriptor.name = profile.id;
    descriptor.fences = [profile.id];
    descriptor.extensions = [profile.id];
  }
  return descriptor;
}

function comparablePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\/+/, "");
}

export class LanguageRegistry {
  private readonly runtimes = new Map<string, InternalRuntime>();
  private readonly listeners = new Set<Listener>();

  constructor(
    settings: SyntaxPluginSettings,
    private readonly loadSource: SourceLoader,
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
        const descriptor = fallbackDescriptor(profile);
        const runtime: InternalRuntime = {
          settings: profile,
          descriptor,
          status: {
            state: "ready",
            message: `Descriptor integrado: ${descriptor.categories.length} categorías`,
            updatedAt: Date.now(),
          },
          revision: 0,
          highlightConfig:
            descriptor.engine === "mud" ? DEFAULT_HIGHLIGHT_CONFIG : undefined,
          tokenize: (source) => this.tokenize(profile.id, source),
        };
        this.runtimes.set(profile.id, runtime);
      } else {
        existing.settings = profile;
        if (!profile.descriptorPath && profile.embeddedDescriptor !== undefined) {
          existing.descriptor = structuredClone(profile.embeddedDescriptor);
          existing.revision += 1;
        }
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
    if (runtime === undefined) return;
    runtime.status = {
      state: "loading",
      message: "Cargando descriptor y gramáticas…",
      updatedAt: runtime.status.updatedAt,
    };
    this.notify();
    try {
      const descriptor = await this.loadDescriptor(runtime.settings);
      if (descriptor.id !== runtime.settings.id) {
        throw new Error(
          `El descriptor declara el id ${descriptor.id}, pero el perfil usa ${runtime.settings.id}.`,
        );
      }
      let highlightConfig = runtime.highlightConfig;
      if (descriptor.engine === "mud" || descriptor.engine === "grammar") {
        const [lexical, syntax] = await Promise.all([
          this.loadRequired(runtime.settings.lexicalGrammarPath, "gramática léxica"),
          this.loadRequired(runtime.settings.syntaxGrammarPath, "gramática sintáctica"),
        ]);
        highlightConfig =
          descriptor.engine === "mud"
            ? compileMudHighlightConfig(lexical, syntax, descriptor)
            : compileGrammarHighlightConfig(
                lexical,
                syntax,
                descriptor,
                runtime.settings.lexicalStart,
                runtime.settings.syntaxStart,
              );
      } else {
        highlightConfig = undefined;
      }
      runtime.descriptor = descriptor;
      runtime.highlightConfig = highlightConfig;
      runtime.revision += 1;
      runtime.status = {
        state: "ready",
        message: `${descriptor.categories.length} categorías · descriptor válido`,
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
    const target = comparablePath(path);
    return [...this.runtimes.values()].filter(
      ({ settings }) =>
        comparablePath(settings.descriptorPath) === target ||
        comparablePath(settings.lexicalGrammarPath) === target ||
        comparablePath(settings.syntaxGrammarPath) === target,
    );
  }

  get(id: string): LanguageRuntime | undefined {
    return this.runtimes.get(id);
  }

  enabled(): LanguageRuntime[] {
    return [...this.runtimes.values()].filter(({ settings }) => settings.enabled);
  }

  byFence(fence: string): LanguageRuntime | undefined {
    const normalized = fence.toLocaleLowerCase();
    return this.enabled().find(({ descriptor }) =>
      descriptor.fences.some(
        (candidate) => candidate.toLocaleLowerCase() === normalized,
      ),
    );
  }

  byExtension(extension: string): LanguageRuntime | undefined {
    const normalized = extension.toLocaleLowerCase().replace(/^\./, "");
    return this.enabled().find(({ descriptor }) =>
      descriptor.extensions.some(
        (candidate) => candidate.toLocaleLowerCase() === normalized,
      ),
    );
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async loadDescriptor(
    profile: LanguageProfileSettings,
  ): Promise<LanguageDescriptor> {
    if (profile.descriptorPath) {
      const source = await this.loadSource(profile.descriptorPath);
      let value: unknown;
      try {
        value = JSON.parse(source);
      } catch (error) {
        throw new Error(
          `JSON inválido en ${profile.descriptorPath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error },
        );
      }
      return validateLanguageDescriptor(value);
    }
    if (profile.embeddedDescriptor !== undefined) {
      return validateLanguageDescriptor(profile.embeddedDescriptor);
    }
    return fallbackDescriptor(profile);
  }

  private async loadRequired(path: string, label: string): Promise<string> {
    if (!path) throw new Error(`Falta la ruta de la ${label}.`);
    return this.loadSource(path);
  }

  private tokenize(id: string, source: string): SyntaxToken[] {
    const runtime = this.runtimes.get(id);
    if (runtime === undefined) return [];
    if (runtime.descriptor.engine === "ebnf") return tokenizeEbnf(source);
    if (runtime.descriptor.engine === "asdl") return tokenizeAsdl(source);
    const config = runtime.highlightConfig ?? DEFAULT_HIGHLIGHT_CONFIG;
    return runtime.descriptor.engine === "mud"
      ? tokenizeMud(source, config)
      : tokenizeGrammar(source, config);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
