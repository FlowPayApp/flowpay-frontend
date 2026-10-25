import Layout from "../components/Layout";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthToken } from "../lib/auth";
import { CompanyChannelsProvider } from "../lib/companyChannels";

const PrivateRoute = () => {
  const location = useLocation();
  const token = useAuthToken();

  if (token) {
    return (
      <CompanyChannelsProvider>
        <Layout />
      </CompanyChannelsProvider>
    );
  }
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default PrivateRoute;
