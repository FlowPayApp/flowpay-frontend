import Layout from "../components/Layout";
import { Navigate, useLocation } from "react-router-dom";

const PrivateRoute = () => {
  const location = useLocation();

  return localStorage.getItem("flowpay_token") ? (
    <Layout />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default PrivateRoute;