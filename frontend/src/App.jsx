import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./landing/LandingPage.jsx";
import Login from "./auth/Login.jsx";
import Register from "./auth/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ResidentDashboard from "./resident/ResidentDashboard.jsx";
import NewComplaint from "./resident/NewComplaint.jsx";
import MyComplaints from "./resident/MyComplaints.jsx";
import Notices from "./resident/Notices.jsx";
import ComplaintDetails from "./components/ComplaintDetails.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminComplaints from "./admin/AdminComplaints.jsx";
import AdminAiTriage from "./admin/AdminAiTriage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute role="resident" />}>
        <Route path="/resident/dashboard" element={<ResidentDashboard />} />
        <Route path="/resident/complaints" element={<MyComplaints />} />
        <Route path="/resident/complaints/new" element={<NewComplaint />} />
        <Route path="/resident/complaints/:id" element={<ComplaintDetails role="resident" />} />
        <Route path="/resident/notices" element={<Notices role="resident" />} />
      </Route>
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/complaints" element={<AdminComplaints />} />
        <Route path="/admin/complaints/:id" element={<ComplaintDetails role="admin" />} />
        <Route path="/admin/ai-triage" element={<AdminAiTriage />} />
        <Route path="/admin/notices" element={<Notices role="admin" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

