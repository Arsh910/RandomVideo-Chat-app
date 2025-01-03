import { Divider, IconButton, Stack } from '@mui/material'
import { GithubLogo, GoogleLogo, TwitterLogo } from 'phosphor-react'
import React from 'react'

const AuthSocial = () => {
  return (
    <div>
        <Divider sx={{my:2.5, typography:'overline', color:'text.disabled', '&::before, ::after':{
            borderTopStyle:'dashed'
        }}}>OR</Divider>
        <Stack direction={'row'} justifyContent='center' spacing={2}>
            <IconButton title='working on it'>
                <GoogleLogo color='#DF3E30'/>
            </IconButton>
            <IconButton color='inherit' title='working on it'>
                <GithubLogo />
            </IconButton>
            <IconButton title='working on it'>
                <TwitterLogo color='#1C9CEA'/>
            </IconButton>
        </Stack>
    </div>
  )
}

export default AuthSocial