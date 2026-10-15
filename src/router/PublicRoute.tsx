import { Navigate, Outlet } from "react-router-dom";
import { getDefaultHomePath, useAuthToken } from "../lib/auth";

const PublicRoute = () => {
  const token = useAuthToken();
  if (token) {
    return <Navigate to={getDefaultHomePath()} replace />;
  }
  return <Outlet />;
};

export default PublicRoute;
