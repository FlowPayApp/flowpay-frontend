import Layout from "../components/Layout";
import Landing from "../pages/Landing";
import { Navigate, useLocation } from "react-router-dom";

const PrivateRoute = () => {
  const location = useLocation();

  if (localStorage.getItem("flowpay_token")) {
    return <Layout />;
  }
  if (location.pathname === "/") {
    return <Landing />;
  }
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default PrivateRoute;