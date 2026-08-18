import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import PublicRoute from './PublicRoute';
import Login from '../pages/Login';
import PrivateRoute from './PrivateRoute';
import Register from '../pages/Register';
import Cobros from '../pages/Cobros';
import ChargeDetail from '../pages/ChargeDetail';
import { getSessionClaims } from '../lib/auth';
import { isCompanyAdmin } from '../lib/roles';
import Dashboard from '../pages/Dashboard';
import Clients from '../pages/Clients';
import ClientLoads from '../pages/ClientLoads';
import ClientDetail from '../pages/ClientDetail';
import MessagingSettings from '../pages/MessagingSettings';
import Equipo from '../pages/Equipo';
import PlatformOverview from '../pages/PlatformOverview';
import PlatformCompanies from '../pages/PlatformCompanies';
import PlatformAdmins from '../pages/PlatformAdmins';
import PayPage from '../pages/PayPage';
import PayReturnPage from '../pages/PayReturnPage';

const AppRouter = () => {

  function LegacyInvoicesRedirect() {
    const { id } = useParams();
    return <Navigate to={id ? `/cobros/${id}` : "/cobros"} replace />;
  }

  function AdminOnly({ children }: { children: ReactNode }) {
    if (!isCompanyAdmin()) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  function HomeEntry() {
    const role = getSessionClaims()?.role;
    if (role === "platform_admin") {
      return <Navigate to="/platform" replace />;
    }
    return <Dashboard />;
  }

  return (
    <>
      <Routes>
        <Route path="/pay/:token" element={<PayPage />} />
        <Route path="/pay/:token/return" element={<PayReturnPage />} />
        <Route path="/*" element={<PublicRoute />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        <Route path="/*" element={<PrivateRoute />}>
          <Route index element={<HomeEntry />} />
          <Route path="cobros" element={<Cobros />} />
          <Route path="cobros/:id" element={<ChargeDetail />} />
          <Route path="invoices" element={<Navigate to="/cobros" replace />} />
          <Route path="invoices/:id" element={<LegacyInvoicesRedirect />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/cargas" element={<AdminOnly><ClientLoads /></AdminOnly>} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="mensajes" element={<AdminOnly><MessagingSettings /></AdminOnly>} />
          <Route path="equipo" element={<AdminOnly><Equipo /></AdminOnly>} />
          <Route path="platform" element={<PlatformOverview />} />
          <Route path="platform/companies" element={<PlatformCompanies />} />
          <Route path="platform/admins" element={<PlatformAdmins />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
};

export default AppRouter;