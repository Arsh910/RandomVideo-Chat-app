import { Navigate, Outlet } from "react-router-dom";
import { Stack } from '@mui/material';
import SideBar from "./SideBar";

const DashboardLayout = ({user}) => {

if(!user){
  return <Navigate to='/auth/login'/>;
}

  return (
    <Stack direction='row'>
      {/* SideBar */}
      <SideBar user={user}/>
      <Outlet />
    </Stack>
    
  );
};

export default DashboardLayout;
