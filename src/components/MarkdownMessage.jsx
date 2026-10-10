// Minimal, dependency-free markdown for chat bubbles: **bold**, *italic*,
// `code`, ```blocks```, [links](https://…) and line breaks. Input is escaped first.

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/5 text-[0.85em]">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2">$1</a>'
  );
  return s;
}

export default function MarkdownMessage({ text }) {
  const blocks = String(text).split(/```/);
  return (
    <div className="whitespace-pre-wrap break-words">
      {blocks.map((block, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="my-1 overflow-x-auto rounded-lg bg-black/5 p-2 text-[0.8em]">
            <code>{block.replace(/^\w*\n/, "")}</code>
          </pre>
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderInline(block) }} />
        )
      )}
    </div>
  );
}
