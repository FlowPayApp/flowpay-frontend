import Layout from "../components/Layout";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthToken } from "../lib/auth";

const PrivateRoute = () => {
  const location = useLocation();
  const token = useAuthToken();

  if (token) {
    return <Layout />;
  }
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default PrivateRoute;
