import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { AdminNav } from "./AdminLayout";
import CountUp from "../components/CountUp";
import Dropdown from "../components/Dropdown";
import { useToast } from "../components/Toast";
import { relative } from "../lib/time";

const STATUS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_on_customer", label: "Waiting on customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];
const PRIORITY = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];
const SENTIMENT = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
  { value: "urgent", label: "Urgent" },
];
const BAR_COLORS = ["#35589E", "#688ECB", "#8AB2F0", "#B0CBF3"];
const PRIORITY_TONE = { low: "bg-card text-muted", medium: "bg-pill text-chart-1", high: "bg-[#fdebe3] text-accent", urgent: "bg-accent text-white" };
const label = (list, v) => list.find((o) => o.value === v)?.label || v;

const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
const item = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

export default function AdminDashboard() {
  const { logout, socket, unread } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [selected, setSelected] = useState(null);

  const onAuthError = useCallback(
    (e) => {
      if (e.status === 401 || e.status === 403) {
        navigate("/admin", { replace: true });
      } else toast(e.message, { tone: "error" });
    },
    [navigate, toast]
  );

  const loadStats = useCallback(() => api.get("/api/admin/dashboard").then(setStats).catch(onAuthError), [onAuthError]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Refresh numbers live when conversations change (debounced).
  const refreshTimer = useRef(null);
  useEffect(() => {
    if (!socket) return;
    const onChange = () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(loadStats, 800);
    };
    socket.on("conversation", onChange);
    return () => socket.off("conversation", onChange);
  }, [socket, loadStats]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams({ page, limit: 8 });
    if (query) params.set("search", query);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (sentiment) params.set("sentiment", sentiment);
    api
      .get(`/api/tickets?${params}`)
      .then((d) => {
        setTickets(d.tickets);
        setPages(Math.max(1, d.pages));
      })
      .catch(onAuthError);
  }, [query, status, priority, sentiment, page, onAuthError]);

  const updateTicket = async (id, patch) => {
    try {
      const t = await api.put(`/api/tickets/${id}`, patch);
      setTickets((list) => list.map((x) => (x._id === id ? t : x)));
      setSelected((s) => (s && s._id === id ? t : s));
      loadStats();
    } catch (e) {
      onAuthError(e);
    }
  };

  const resolved = stats?.resolvedTickets ?? 0;
  const unresolved = stats ? Math.max(stats.totalTickets - resolved, 0) : 0;
  const donut = useMemo(
    () => [
      { name: "unresolved", value: unresolved, color: "#35589E" },
      { name: "Resolved", value: resolved, color: "#8AB2F0" },
    ],
    [resolved, unresolved]
  );
  const bars = stats
    ? [
        { name: "Total conversations", value: stats.totalConversations },
        { name: "Active", value: stats.activeConversations },
        { name: "Escalated", value: stats.escalatedConversations },
        { name: "Open tickets", value: stats.openTickets },
      ]
    : [];

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 md:px-[38px] md:pt-[30px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <motion.h1 initial="initial" animate="animate" variants={item} className="text-[26px] font-bold text-brand md:text-[30px]">
            Dashboard
          </motion.h1>
          <AdminNav logout={logout} unread={unread} />
        </div>

        {/* Stat cards */}
        <motion.section
          variants={stagger}
          initial="initial"
          animate="animate"
          className="mt-5 grid grid-cols-2 gap-3 md:mt-[22px] md:grid-cols-[1fr_1fr_1fr_0.84fr] md:gap-[32px]"
        >
          <StatCard rows={[["Total conversation", stats?.totalConversations], ["In progress", stats?.inProgressTickets]]} />
          <StatCard rows={[["Active", stats?.activeConversations], ["Resolved", stats?.resolvedTickets]]} />
          <StatCard rows={[["Escalated", stats?.escalatedConversations], ["Open Tickets", stats?.openTickets]]} />
          <motion.div variants={item} whileHover={{ y: -3 }} className="flex flex-col items-center justify-center rounded-[14px] bg-card p-5 md:h-[230px]">
            <span className="text-[16px] text-muted md:text-[21px]">AI Resolution</span>
            <span className="mt-1 text-[38px] font-semibold text-accent md:mt-2 md:text-[46px]">
              {stats ? <CountUp value={stats.aiResolutionRate} suffix="%" /> : "—"}
            </span>
          </motion.div>
        </motion.section>

        {/* Analysis */}
        <motion.h2 variants={item} initial="initial" animate="animate" className="mt-7 text-[26px] font-bold text-brand md:mt-[30px] md:text-[30px]">
          Analysis
        </motion.h2>
        <motion.section variants={stagger} initial="initial" animate="animate" className="mt-3 grid gap-6 md:mt-4 md:grid-cols-2 md:gap-10">
          <motion.div variants={item} className="flex flex-col items-center">
            <div className="h-[220px] w-[220px] md:h-[236px] md:w-[236px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius="62%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" animationDuration={1100}>
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} tickets`, n]} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,.2)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center gap-4 text-[13px] text-muted">
              {donut.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="h-[11px] w-[11px]" style={{ background: d.color }} />
                  {d.name}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item} className="h-[260px] md:h-[272px]">
            <ResponsiveContainer>
              <BarChart data={bars} margin={{ top: 22, right: 8, left: -22, bottom: 0 }} barCategoryGap="28%">
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10, fill: "#111" }} />
                <YAxis domain={[0, "dataMax"]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#111" }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 30px -10px rgba(0,0,0,.2)" }} />
                <Bar dataKey="value" animationDuration={1100} barSize={64}>
                  {bars.map((b, i) => (
                    <Cell key={b.name} fill={BAR_COLORS[i]} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 12, fill: "#111" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.section>

        {/* Search + filters */}
        <motion.section variants={item} initial="initial" animate="animate" className="mt-6 flex flex-col gap-3 md:mt-[34px] md:flex-row md:items-center md:justify-between">
          <label className="flex h-[46px] w-full items-center gap-3 rounded-full bg-card px-5 md:h-[50px] md:w-[473px] md:px-[20px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7D7A7A" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[17px] text-[#555] outline-none placeholder:text-muted md:text-[20px]"
            />
          </label>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:gap-[24px] md:overflow-visible md:p-0">
            <Dropdown label="Status" value={status} options={STATUS} onChange={(v) => (setStatus(v), setPage(1))} />
            <Dropdown label="Priority" value={priority} options={PRIORITY} onChange={(v) => (setPriority(v), setPage(1))} />
            <Dropdown label="Sentiment" value={sentiment} options={SENTIMENT} onChange={(v) => (setSentiment(v), setPage(1))} align="right" />
          </div>
        </motion.section>

        {/* Tickets */}
        <section className="mt-5 space-y-3 md:mt-6">
          {tickets === null ? (
            [0, 1, 2].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-[14px] bg-card" />)
          ) : tickets.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[14px] bg-card py-10 text-center text-[16px] text-muted">
              No tickets match these filters.
            </motion.p>
          ) : (
            <AnimatePresence mode="popLayout">
              {tickets.map((t, i) => (
                <motion.button
                  key={t._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                  exit={{ opacity: 0 }}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelected(t)}
                  className="flex w-full flex-col gap-3 rounded-[14px] bg-card p-4 text-left transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)] md:flex-row md:items-center md:px-6 md:py-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold text-[#555] md:text-[18px]">{t.subject}</span>
                    <span className="mt-0.5 block truncate text-[14px] text-muted md:text-[15px]">
                      {t.name} · {t.message}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[12px] font-medium capitalize ${PRIORITY_TONE[t.priority]}`}>{t.priority}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-[12px] text-muted">{label(STATUS, t.status)}</span>
                    <span className="text-[12px] text-muted">{relative(t.createdAt)}</span>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2 text-[14px] text-muted">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full bg-card px-4 py-2 disabled:opacity-40">
                Previous
              </button>
              <span>
                {page} / {pages}
              </span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full bg-card px-4 py-2 disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </section>
      </div>

      <TicketModal ticket={selected} onClose={() => setSelected(null)} onUpdate={updateTicket} onOpenChat={(id) => navigate(`/admin/chats/${id}`)} />
    </motion.main>
  );
}

function StatCard({ rows }) {
  return (
    <motion.div variants={item} whileHover={{ y: -3 }} className="flex flex-col justify-between gap-3 rounded-[14px] bg-card px-5 py-4 md:h-[230px] md:px-[38px] md:py-[22px]">
      {rows.map(([name, value]) => (
        <div key={name}>
          <div className="text-[15px] text-muted md:text-[21px]">{name}</div>
          <div className="text-[32px] font-light leading-tight text-muted md:text-[42px]">{value === undefined ? "—" : <CountUp value={value} />}</div>
        </div>
      ))}
    </motion.div>
  );
}

function TicketModal({ ticket, onClose, onUpdate, onOpenChat }) {
  useEffect(() => {
    if (!ticket) return;
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [ticket, onClose]);

  return (
    <AnimatePresence>
      {ticket && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[2px] md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-[24px] bg-white p-6 md:w-[520px] md:rounded-[24px]"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[20px] font-bold text-brand">{ticket.subject}</h3>
              <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card text-muted hover:text-ink">
                ×
              </button>
            </div>
            <p className="mt-1 text-[14px] text-muted">
              {ticket.name}
              {ticket.email && ` · ${ticket.email}`} · {relative(ticket.createdAt)}
            </p>
            <div className="mt-5 space-y-4 text-[15px] text-[#555]">
              <div className="rounded-[14px] bg-card p-4">
                <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Message</div>
                {ticket.message}
              </div>
              {ticket.aiSummary && (
                <div className="rounded-[14px] bg-pill p-4">
                  <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-chart-1">AI summary</div>
                  {ticket.aiSummary}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select value={ticket.status} options={STATUS} onChange={(v) => onUpdate(ticket._id, { status: v })} />
                </Field>
                <Field label="Priority">
                  <Select value={ticket.priority} options={PRIORITY} onChange={(v) => onUpdate(ticket._id, { priority: v })} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2 text-[13px]">
                <span className="rounded-full bg-card px-3 py-1 capitalize text-muted">{ticket.category}</span>
                <span className="rounded-full bg-card px-3 py-1 capitalize text-muted">{ticket.sentiment}</span>
              </div>
            </div>
            {ticket.conversation && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenChat(ticket.conversation)}
                className="mt-6 h-[46px] w-full rounded-full bg-brand text-[16px] font-semibold text-white"
              >
                Open chat
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[42px] w-full appearance-none rounded-full bg-card px-4 text-[15px] text-[#555] outline-none focus:ring-2 focus:ring-link/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
