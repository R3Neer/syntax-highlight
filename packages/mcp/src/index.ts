import type { HighlightDocument } from "@r3nner/syntax-highlight-core";

export const MCP_HIGHLIGHT_RESOURCE_URI = "ui://syntax-highlight/code.html";
export const MCP_HIGHLIGHT_MIME_TYPE = "text/html;profile=mcp-app";

export interface McpHighlightPayload {
  document: HighlightDocument;
  title?: string;
}

export function createRenderToolResult(
  payload: McpHighlightPayload,
  resourceUri = MCP_HIGHLIGHT_RESOURCE_URI,
): {
  structuredContent: McpHighlightPayload;
  content: Array<{ type: "text"; text: string }>;
  _meta: { ui: { resourceUri: string }; "openai/outputTemplate": string };
} {
  return {
    structuredContent: payload,
    content: [{ type: "text", text: `Rendered ${payload.document.languageId} source code.` }],
    _meta: {
      ui: { resourceUri },
      "openai/outputTemplate": resourceUri,
    },
  };
}

function widgetHtml(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>
:root{color-scheme:light dark}body{margin:0;padding:8px;background:transparent;color:CanvasText}
.frame{border:1px solid color-mix(in srgb,CanvasText 18%,transparent);border-radius:10px;overflow:hidden}
.title{padding:8px 12px;border-bottom:1px solid color-mix(in srgb,CanvasText 14%,transparent);font:600 12px system-ui}
pre{margin:0;padding:12px;overflow:auto;white-space:pre;tab-size:4;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}
.sh-token--comment{color:#6a9955}.sh-token--reserved-word,.sh-token--contextual-word{color:#c586c0}
.sh-token--builtin-type,.sh-token--type-reference,.sh-token--unit{color:#4ec9b0}
.sh-token--declared-name{color:#4fc1ff}.sh-token--invocation-name{color:#dcdcaa}
.sh-token--text,.sh-token--character{color:#ce9178}
.sh-token--exact-number,.sh-token--rumber,.sh-token--point-literal{color:#b5cea8}
.sh-token--symbolic-operator{color:#d4d4d4}.sh-token--literal-constant{color:#569cd6}
</style></head><body><div class="frame"><div class="title" hidden></div><pre><code></code></pre></div>
<script>
const code=document.querySelector("code");const title=document.querySelector(".title");
function render(payload){const doc=payload&&payload.document;if(!doc||typeof doc.source!=="string"||!Array.isArray(doc.spans))return;
 code.replaceChildren();let cursor=0;for(const span of doc.spans){if(!Number.isInteger(span.from)||!Number.isInteger(span.to)||span.from<cursor||span.to>doc.source.length)continue;
  code.append(document.createTextNode(doc.source.slice(cursor,span.from)));const el=document.createElement("span");
  el.className="sh-token sh-token--"+(/^[a-z][a-z0-9-]*$/.test(span.categoryId)?span.categoryId:"unknown");
  el.textContent=doc.source.slice(span.from,span.to);code.append(el);cursor=span.to}
 code.append(document.createTextNode(doc.source.slice(cursor)));title.textContent=payload.title||doc.languageId;title.hidden=false}
window.addEventListener("message",event=>{if(event.source!==window.parent)return;const message=event.data;
 if(message&&message.jsonrpc==="2.0"&&message.method==="ui/notifications/tool-result")render(message.params&&message.params.structuredContent)});
window.parent.postMessage({jsonrpc:"2.0",id:1,method:"ui/initialize",params:{protocolVersion:"2026-01-26",capabilities:{}}},"*");
</script></body></html>`;
}

export function createMcpHighlightResource(
  resourceUri = MCP_HIGHLIGHT_RESOURCE_URI,
): {
  uri: string;
  mimeType: string;
  text: string;
  _meta: { ui: { prefersBorder: boolean } };
} {
  return {
    uri: resourceUri,
    mimeType: MCP_HIGHLIGHT_MIME_TYPE,
    text: widgetHtml(),
    _meta: { ui: { prefersBorder: false } },
  };
}
