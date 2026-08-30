# MCP Apps integration

`@r3nner/syntax-highlight-mcp` exposes helpers for a portable MCP App. Register
the returned HTML as `ui://syntax-highlight/code.html` with MIME type
`text/html;profile=mcp-app`, and attach the same URI to the highlighting tool as
`_meta.ui.resourceUri`.

The tool result contains semantic data in `structuredContent`; it remains useful
to clients that do not render the UI. The bundled iframe listens for
`ui/notifications/tool-result`, uses text nodes for untrusted source, and sends
`ui/initialize` through the standard postMessage bridge. A host may optionally
add its own `window.openai` integration, but the component does not require it.

For ABCoda, create an ABC language pack and pass its `HighlightDocument` to
`createRenderToolResult`. No ChatGPT-specific tokenizer is needed.
