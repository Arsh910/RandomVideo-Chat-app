import { yupResolver } from "@hookform/resolvers/yup";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as Yup from "yup";
import FormProvider from "../../components/hook-form/FormProvider";
import {
  Alert,
  Button,
  IconButton,
  InputAdornment,
  Stack,
} from "@mui/material";
import { RHFTextField } from "../../components/hook-form";
import { Eye, EyeSlash } from "phosphor-react";
import axios from "axios";
import { toast } from "react-toastify";

const LINK = process.env.REACT_APP_LINK_IP

const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [user_name , setusername] = useState(null);
  const [text , settext] = useState(null);
  const [user_email, setuseremail] = useState(null);
  const [emailtext, setemailtext] = useState(null);

  //validation rules
  const registerSchema = Yup.object().shape({
    username: Yup.string().required("Username is required"),
    email: Yup.string()
      .required("Email is required")
      .email("Email must be a valid email address"),
    password: Yup.string().required("Password is required"),
    password2: Yup.string().required("Confirm password is required"),
  });

  const methods = useForm({
    resolver: yupResolver(registerSchema),
  });

  const {
    handleSubmit,
    formState: { errors },
  } = methods;

  const onSubmit = async (data) => {
    const k = toast.loading("please wait");
    if(data.password === data.password2){
    axios
      .post(`https://${LINK}/signup/`, {
        email: data.email,
        password: data.password,
        password2: data.password2,
        username: data.username,
      })
      .then((response) => {
        console.log(response);
        localStorage.setItem("access_token", response.data.token.access);
        localStorage.setItem("refresh_token", response.data.token.refresh);
        window.location.href = "/random_video";
      })
      .catch((errors) => {
        console.log(errors);
        toast.update(k, {
          render: `${errors.response.data.error}`,
          autoClose: true,
          isLoading: false,
          type: "warning",
        });
      });
    }
    else{
      toast.update(k, {
        render: `password and confirm password not same`,
        autoClose: true,
        isLoading: false,
        type: "warning",
      });
    }
  };

  useEffect(()=>{
    if(user_name){
      if(user_name.length>5){
        axios.post(`https://${LINK}/exists/`,{
          username : user_name,
          email : null
        })
        .then((response)=>{  
          console.log(response.data.exists);
          if(response.data.exists){
            settext('Choose a different username ❌');
          }
          else{
            settext('Good username 👍');
          }
        })
      }
      else{
        settext('More than 5 characters ✏️');
      }
    }
    else{
      settext(null);
    }
  },[user_name])

  useEffect(()=>{
    if(user_email && user_email.includes("@")){
        axios.post(`https://${LINK}/exists/`,{
          username : null,
          email : user_email
        })
        .then((response)=>{  
          console.log(response.data.exists);
          if(response.data.exists){
            setemailtext('Choose a different email ❌');
          }
        })
    }
    else{
      setemailtext(null);
    }
  },[user_email])

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        {!!errors.afterSubmit && (
          <Alert severity="error">{errors.afterSubmit.message}</Alert>
        )}
        <RHFTextField name="username" label="User name" onKeyUp={(e)=>{setusername(e.target.value)}} />
        {text?text:''}
        <RHFTextField name="email" label="Email address" onKeyUp={(e)=>{setuseremail(e.target.value)}} />
        {emailtext?emailtext:''}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <RHFTextField
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            InputProps={{
                endAdornment: (
                <InputAdornment>
                    <IconButton
                    onClick={() => {
                        setShowPassword(!showPassword);
                    }}
                    >
                    {showPassword ? <Eye /> : <EyeSlash />}
                    </IconButton>
                </InputAdornment>
                ),
            }}
            />
            <RHFTextField
            name="password2"
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            InputProps={{
                endAdornment: (
                <InputAdornment>
                    <IconButton
                    onClick={() => {
                        setShowPassword(!showPassword);
                    }}
                    >
                    {showPassword ? <Eye /> : <EyeSlash />}
                    </IconButton>
                </InputAdornment>
                ),
            }}
            />
        </Stack>
        <Button
          fullWidth
          color="inherit"
          size="large"
          type="submit"
          variant="contained"
          sx={{
            bgcolor: "text.primary",
            color: (theme) =>
              theme.palette.mode === "light" ? "common.white" : "grey.800",
            "&:hover": {
              bgcolor: "text.primary",
              color: (theme) =>
                theme.palette.mode === "light" ? "common.white" : "grey.800",
            },
          }}
        >
          Create Account
        </Button>
      </Stack>
    </FormProvider>
  );
};

export default RegisterForm;
