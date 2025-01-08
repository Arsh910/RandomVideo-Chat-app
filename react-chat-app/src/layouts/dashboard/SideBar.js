import React ,{ useState } from 'react';
import { Avatar, Box, IconButton, Menu, MenuItem, Stack, Switch } from '@mui/material';
import { useTheme } from "@mui/material/styles";
import { Nav_Buttons, Profile_Menu } from '../../data'
import useSettings from '../../hooks/useSettings';
import AntSwitch from '../../components/AntSwitch';
import Logo from '../../assets/Images/logo.ico';
import { useNavigate } from 'react-router-dom';
import { toast } from "react-toastify";

const getPath = (index) =>{
  switch (index) {
    case 0:
      return '/'

    default:
      break;
  }
};

const SideBar = ({user}) => {

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const username = user.username;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (index) => {
    setAnchorEl(null);
    navigate(getMenuPath(index));
  };

    const theme = useTheme();
    const navigate = useNavigate();
     // state for selected button
    const [selected, setSelected] = useState(0); // by default 0 index button is selected
    //switch themes
    const {onToggleMode} = useSettings();

    console.log("my name is "+username);

    const getMenuPath = (index) =>{
      switch (index) {
        case 0:
          toast.loading("please wait");
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth/login';
          
        default:
          break;
      }
    }

    return (
    <Box p={2} sx={{ backgroundColor: theme.palette.background.paper,overflow:'scroll',scrollbarWidth:'None',msOverflowX:"None",
        boxShadow: "0px 0px 2px rgba(0,0,0,0.25)", width:'10vw', height: "100vh", display:"flex" }}>
        <Stack direction="column" alignItems={"center"} justifyContent="space-between" 
          sx={{ width: "100%" }} spacing={3}>
          <Stack alignItems={"center"} spacing={4}>
          <Box sx={{
            backgroundColor: theme.palette.primary.main,
            width: 45,
            borderRadius: 1.5
          }}>
            <img src={Logo} alt={'Logo icon'} />
          </Box>
          <Stack sx={{ width: "max-content" }} direction="column" alignItems="center" spacing={3}>
            {Nav_Buttons.map((el) => (
              el.index === selected ?
                <Box key={""} sx={{ backgroundColor: theme.palette.primary.main, borderRadius: 1.5 }}>
                  <IconButton sx={{ width: "max-content", color: "#fff" }} key={el.index}>
                    {el.icon}
                  </IconButton>
                </Box>
                :
                <IconButton onClick={() => { setSelected(el.index); navigate(getPath(el.index)) }} 
                sx={{ width: "max-content", color:theme.palette.mode === 'light' ? "#000" 
                : theme.palette.text.primary }} key={el.index}>
                  {el.icon}
                </IconButton>
            ))}

          </Stack>

          </Stack>
          
          <Stack spacing={4}>
            <AntSwitch onChange={()=>{
                onToggleMode();
            }} defaultChecked/>
            <Avatar id='basic-button' sx={{cursor:'pointer'}}
            aria-controls={open ? 'basic-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}/>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
              anchorOrigin={{vertical:'bottom', horizontal:'right'}}
              transformOrigin={{vertical:'bottom', horizontal:'left'}}
            >
            <Stack spacing={1} px={1}>
              {Profile_Menu.map((el, idx)=>(
                  <MenuItem key={idx} onClick={()=>{handleMenuItemClick(idx)}}>
                    <Stack onClick={()=>{
                        navigate(getMenuPath(idx))
                    }} sx={{width:100}} direction='row' alignItems={'center'}
                     justifyContent='space-between'>
                      <span>{el.title}</span>
                      {el.icon}
                    </Stack>  
                  </MenuItem>
              ))}
            </Stack>
          </Menu>
          </Stack>   
        </Stack>
      </Box>
  )
}

export default SideBar
