import { Link } from "react-router-dom";

const columns = [
  {
    title: "Support",
    links: [
      { label: "New chat", to: "/chat" },
      { label: "Previous chats", to: "/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Contact", href: "mailto:support@example.com" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

const linkCls = "text-[14px] text-white/60 transition-colors hover:text-white";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full border-t border-white/10 bg-black/30 backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="text-[18px] font-bold tracking-tight text-white">AI Customer Care</div>
          <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-white/60">
            Instant AI answers, with a real person ready to step in whenever you need one.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/80 ring-1 ring-white/15">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            All systems operational
          </div>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-white/90">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className={linkCls}>
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className={linkCls}>
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-[13px] text-white/50 md:flex-row">
          <span>© {new Date().getFullYear()} AI Customer Care. All rights reserved.</span>
          <span>Available 24/7 · Human takeover on request</span>
        </div>
      </div>
    </footer>
  );
}
