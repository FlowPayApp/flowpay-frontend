import Layout from '../components/Layout';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const PrivateRoute = () => {
  const location = useLocation();

  return localStorage.getItem('flowpay_token') ? (
    <>
      <div className="hidden sm:block">
        <Layout />
      </div>
      <Outlet />
    </>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default PrivateRoute;