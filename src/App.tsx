import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Layout from "./components/Layout";
import { getSessionClaims } from "./lib/auth";
import ClientDetail from "./pages/ClientDetail";
import ClientLoads from "./pages/ClientLoads";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import ChargeDetail from "./pages/ChargeDetail";
import Cobros from "./pages/Cobros";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlatformOverview from "./pages/PlatformOverview";
import PlatformCompanies from "./pages/PlatformCompanies";
import PlatformAdmins from "./pages/PlatformAdmins";
import MessagingSettings from "./pages/MessagingSettings";

/** Compatibilidad con enlaces antiguos /invoices */
function LegacyInvoicesRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/cobros/${id}` : "/cobros"} replace />;
}

/** Superadmin no usa el resumen de cobranza de empresa: va al panel plataforma. */
function HomeEntry() {
  const role = getSessionClaims()?.role;
  if (role === "platform_admin") {
    return <Navigate to="/platform" replace />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route index element={<HomeEntry />} />
        <Route path="cobros" element={<Cobros />} />
        <Route path="cobros/:id" element={<ChargeDetail />} />
        <Route path="invoices" element={<Navigate to="/cobros" replace />} />
        <Route path="invoices/:id" element={<LegacyInvoicesRedirect />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/cargas" element={<ClientLoads />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="mensajes" element={<MessagingSettings />} />
        <Route path="platform" element={<PlatformOverview />} />
        <Route path="platform/companies" element={<PlatformCompanies />} />
        <Route path="platform/admins" element={<PlatformAdmins />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
