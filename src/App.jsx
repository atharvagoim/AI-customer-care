import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import ChatPage from "./pages/ChatPage";

// Admin code (charts etc.) is split out so customers never download it.
const AdminLogin = lazy(() => import("./admin/AdminLogin"));
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminChats = lazy(() => import("./admin/AdminChats"));

export default function App() {
  return (
    <Suspense fallback={null}>
    <Routes>
      {/* Customer side */}
      <Route path="/" element={<Landing />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/chat/:id" element={<ChatPage />} />

      {/* Admin side */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="chats" element={<AdminChats />} />
        <Route path="chats/:id" element={<AdminChats />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
