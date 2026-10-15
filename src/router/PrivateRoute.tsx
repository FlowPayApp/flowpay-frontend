import Layout from "../components/Layout";
import Landing from "../pages/Landing";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthToken } from "../lib/auth";

const PrivateRoute = () => {
  const location = useLocation();
  const token = useAuthToken();

  if (token) {
    return <Layout />;
  }
  if (location.pathname === "/") {
    return <Landing />;
  }
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default PrivateRoute;
