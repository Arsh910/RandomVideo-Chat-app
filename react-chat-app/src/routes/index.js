import { Suspense, lazy, useEffect, useState } from "react"; // use to loading , loading screen until full page is load
import { Navigate, useRoutes } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

// layouts
import DashboardLayout from "../layouts/dashboard";
import MainLayout from "../layouts/main";

// config
import LoadingScreen from "../components/LoadingScreen";
//import Settings from "../pages/dashboard/Settings";

const LINK = process.env.REACT_APP_LINK_IP

const Loadable = (Component) => (props) => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Component {...props} />
    </Suspense>
  );
};

export default function Router() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    axios
      .get(`https://${LINK}/`, {
        headers: {
          Authorization: localStorage.getItem("access_token")
            ? "JWT " + localStorage.getItem("access_token")
            : null,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      })
      .then((response) => {
        if (response && response.data.user) {
          setUser(response.data.user);
          toast.info("welcome " + response.data.user.username);
        }
      })
      .catch((error)=>{
        console.log(`something is wrong : ${error}`);
      })
  }, []);

  return useRoutes([
    {
      path: "/auth",
      element: <MainLayout isAuthenticated={user} />,
      children: [
        { element: <LoginPage />, path: "login" },
        { element: <RegisterPage />, path: "register" },
        { element: <ResetPasswordPage />, path: "reset-password" },
        { element: <NewPasswordPage />, path: "new-password" },
      ],
    },
    {
      path: "/",
      element: <DashboardLayout user={user} />,
      children: [
        { path: "/", element: <RandomVideoPage user={user} /> },
        { path: "404", element: <Page404 /> },
      ],
    },
    { path: "*", element: <Navigate to="/404" replace /> },
  ]);
}

const LoginPage = Loadable(lazy(() => import("../pages/auth/Login")));

const RegisterPage = Loadable(lazy(() => import("../pages/auth/Register")));

const ResetPasswordPage = Loadable(
  lazy(() => import("../pages/auth/ResetPassword"))
);

const NewPasswordPage = Loadable(
  lazy(() => import("../pages/auth/NewPassword"))
);

const RandomVideoPage = Loadable(
  lazy(() => import("../pages/videochat/RandomVideo"))
);

const Page404 = Loadable(lazy(() => import("../pages/Page404")));
