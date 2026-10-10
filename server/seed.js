/**
 * Demo data so the dashboard and inbox look populated right away.
 * Usage: npm run seed   (wipes FAQs, tickets, conversations and messages first)
 */
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import FAQ from "./models/FAQ.js";
import Ticket from "./models/Ticket.js";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";
import Setting from "./models/Setting.js";
import { preview } from "./services/conversation.service.js";

const FAQS = [
  { category: "orders", question: "How do I check my order status?", answer: "Go to 'My Orders' in your account and select the order to see its current status and tracking link." },
  { category: "orders", question: "Can I change my order after placing it?", answer: "Orders can be modified within 1 hour of placing them by contacting support — after that, items are already being prepared for shipment." },
  { category: "shipping", question: "How long does shipping take?", answer: "Standard shipping takes 3-5 business days domestically and 7-14 days internationally." },
  { category: "shipping", question: "Do you ship internationally?", answer: "Yes, we ship to over 40 countries. Shipping cost and time are calculated at checkout based on destination." },
  { category: "payments", question: "What payment methods do you accept?", answer: "We accept all major credit/debit cards, UPI, and popular digital wallets." },
  { category: "payments", question: "My payment failed but money was deducted, what do I do?", answer: "This usually reverses automatically within 5-7 business days. If it doesn't, please open a support ticket with your transaction ID." },
  { category: "returns", question: "What is your return policy?", answer: "Items can be returned within 30 days of delivery if unused and in original packaging." },
  { category: "returns", question: "How do I start a return?", answer: "Go to 'My Orders', select the item, and click 'Start Return'. You'll get a prepaid shipping label." },
  { category: "refunds", question: "How long do refunds take?", answer: "Refunds are processed within 5-7 business days after we receive the returned item, back to your original payment method." },
  { category: "products", question: "Do products come with a warranty?", answer: "Most products include a 1-year manufacturer warranty; details are listed on each product page." },
  { category: "account", question: "How do I reset my password?", answer: "Click 'Forgot password' on the login page and follow the emailed reset link." },
  { category: "account", question: "How do I delete my account?", answer: "Contact support to request account deletion — this is handled manually to protect your data." },
  { category: "technical", question: "The website isn't loading properly, what should I do?", answer: "Try clearing your browser cache or using a different browser. If the issue persists, let us know your browser and device." },
  { category: "general", question: "How can I contact support?", answer: "Use this chat assistant any time, or ask to talk to a human agent for complex issues." },
];

const DEMO_TICKETS = [
  {
    name: "Aditi Sharma",
    email: "aditi.sharma@example.com",
    subject: "Escalation: order not received",
    message: "My order #A1042 was supposed to arrive 5 days ago and tracking hasn't updated.",
    aiSummary: "Customer's order is delayed with no tracking updates for 5+ days. Requested delivery investigation.",
    category: "shipping",
    sentiment: "negative",
    priority: "high",
    status: "open",
  },
  {
    name: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    subject: "Refund not processed",
    message: "I returned my item 10 days ago but haven't received my refund yet.",
    aiSummary: "Customer returned an item 10 days ago; refund is overdue per the 5-7 day policy.",
    category: "refunds",
    sentiment: "negative",
    priority: "high",
    status: "in_progress",
  },
  {
    name: "Sara Khan",
    email: "sara.khan@example.com",
    subject: "Payment deducted twice",
    message: "I was charged twice for the same order, please refund the duplicate charge.",
    aiSummary: "Duplicate charge reported for a single order; needs payments team verification.",
    category: "payments",
    sentiment: "urgent",
    priority: "urgent",
    status: "open",
  },
  {
    name: "Liam Carter",
    email: "liam.carter@example.com",
    subject: "Product question",
    message: "Does the wireless keyboard work with a Mac?",
    aiSummary: "Customer asking about Mac compatibility for wireless keyboard.",
    category: "products",
    sentiment: "neutral",
    priority: "low",
    status: "resolved",
  },
  {
    name: "Aditi Sharma",
    email: "aditi.sharma@example.com",
    subject: "Account login issue",
    message: "I can't log in even after resetting my password twice.",
    aiSummary: "Repeated login failures after password reset; likely needs manual account check.",
    category: "account",
    sentiment: "negative",
    priority: "medium",
    status: "waiting_on_customer",
  },
  {
    name: "Guest",
    email: "guest.buyer@example.com",
    subject: "Return window question",
    message: "Is it too late to return an item I bought 25 days ago?",
    aiSummary: "Customer asking if a 25-day-old purchase still qualifies for return.",
    category: "returns",
    sentiment: "neutral",
    priority: "low",
    status: "closed",
  },
];

const CONVERSATIONS = [
  {
    guestName: "Aditi Sharma",
    guestEmail: "aditi.sharma@example.com",
    status: "escalated",
    intent: "shipping_question",
    sentiment: "negative",
    priority: "high",
    category: "shipping",
    summary: "Order delayed 5+ days, customer wants an update.",
    messages: [
      { sender: "user", text: "My order hasn't arrived yet, it's been 5 days late." },
      { sender: "ai", text: "I'm sorry about the delay! Could you share your order number so I can look into it?" },
      { sender: "user", text: "It's A1042" },
    ],
  },
  {
    guestName: "Liam Carter",
    guestEmail: "liam.carter@example.com",
    status: "active",
    intent: "product_question",
    sentiment: "neutral",
    priority: "low",
    category: "products",
    summary: "Asked about Mac compatibility for a wireless keyboard.",
    messages: [
      { sender: "user", text: "Does the wireless keyboard work with a Mac?" },
      { sender: "ai", text: "Yes, our wireless keyboards are compatible with macOS via Bluetooth pairing." },
    ],
  },
  {
    guestName: "Guest",
    guestEmail: "",
    status: "active",
    intent: "general_question",
    sentiment: "positive",
    priority: "low",
    category: "general",
    summary: "General greeting, no issue yet.",
    messages: [{ sender: "user", text: "Hi, just checking out your store!" }, { sender: "ai", text: "Welcome! Let me know if you have any questions." }],
  },
];

await connectDB();
console.log("🌱 Seeding…");
await Promise.all([FAQ.deleteMany({}), Ticket.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({}), Setting.deleteMany({})]);

await FAQ.insertMany(FAQS);
await Ticket.insertMany(DEMO_TICKETS);

for (const { messages, ...data } of CONVERSATIONS) {
  const firstUser = messages.find((m) => m.sender === "user");
  const last = messages[messages.length - 1];
  const convo = await Conversation.create({
    ...data,
    visitorId: "00000000-0000-4000-8000-000000000000", // demo chats belong to no real browser
    aiEnabled: data.status !== "escalated",
    title: firstUser ? preview(firstUser.text) : "New conversation",
    lastMessage: preview(last.text),
    lastMessageAt: new Date(),
    unreadByAdmin: last.sender === "user" ? 1 : 0,
  });
  await Message.insertMany(messages.map((m, i) => ({ ...m, conversation: convo._id, createdAt: new Date(Date.now() - (messages.length - i) * 60_000) })));
}

console.log(`  ✅ ${FAQS.length} FAQs, ${DEMO_TICKETS.length} tickets, ${CONVERSATIONS.length} conversations`);
await mongoose.disconnect();
