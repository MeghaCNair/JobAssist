import { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Avatar,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import WorkIcon from '@mui/icons-material/Work';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Only check login status when component mounts
  useEffect(() => {
    checkLoginStatus();
  }, []); // Empty dependency array means it only runs once when mounted

  const checkLoginStatus = () => {
    const email = localStorage.getItem('userEmail');
    setIsLoggedIn(!!email);
    setUserEmail(email || '');
  };

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPreferences');
    setIsLoggedIn(false);
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        bgcolor: 'var(--color-white)',
        borderBottom: '1px solid',
        borderColor: 'var(--color-secondary)',
        color: 'var(--color-text)'
      }}
    >
      <Container maxWidth="lg">
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 0 }, py: 1 }}>
          {/* Logo and Brand */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              gap: 1.5
            }} 
            onClick={() => navigate('/')}
          >
            <Avatar
              sx={{
                bgcolor: 'var(--color-primary)',
                width: 40,
                height: 40,
              }}
            >
              <WorkIcon />
            </Avatar>
            <Typography 
              variant="h6" 
              component="div"
              sx={{
                fontFamily: 'Inter',
                fontWeight: 600,
                color: 'var(--color-primary)',
                fontSize: '1.25rem'
              }}
            >
              CareerAssist
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!isLoggedIn ? (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  sx={{
                    color: 'var(--color-text)',
                    fontWeight: isActive('/login') ? 600 : 400,
                    borderBottom: isActive('/login') ? 2 : 0,
                    borderColor: 'var(--color-primary)',
                    borderRadius: 0,
                    px: 2,
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: 'var(--color-primary)',
                    }
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/signup')}
                  sx={{
                    bgcolor: 'var(--color-primary)',
                    color: 'var(--color-white)',
                    fontWeight: 500,
                    px: 3,
                    '&:hover': {
                      bgcolor: '#4A6B86',
                    }
                  }}
                >
                  Sign Up
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/jobs')}
                  sx={{
                    color: 'var(--color-text)',
                    fontWeight: isActive('/jobs') ? 600 : 400,
                    borderBottom: isActive('/jobs') ? 2 : 0,
                    borderColor: 'var(--color-primary)',
                    borderRadius: 0,
                    px: 2,
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: 'var(--color-primary)',
                    }
                  }}
                >
                  Jobs
                </Button>
                <Button
                  onClick={() => navigate('/jobs/applied')}
                  sx={{
                    color: 'var(--color-text)',
                    fontWeight: isActive('/jobs/applied') ? 600 : 400,
                    borderBottom: isActive('/jobs/applied') ? 2 : 0,
                    borderColor: 'var(--color-primary)',
                    borderRadius: 0,
                    px: 2,
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: 'var(--color-primary)',
                    }
                  }}
                >
                  Applied Jobs
                </Button>
                <Button
                  onClick={() => navigate('/profile')}
                  startIcon={<PersonIcon />}
                  sx={{
                    color: 'var(--color-text)',
                    fontWeight: isActive('/profile') ? 600 : 400,
                    borderBottom: isActive('/profile') ? 2 : 0,
                    borderColor: 'var(--color-primary)',
                    borderRadius: 0,
                    px: 2,
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: 'var(--color-primary)',
                    }
                  }}
                >
                  Profile
                </Button>
                <Button
                  onClick={() => navigate('/resume')}
                  startIcon={<DescriptionIcon />}
                  sx={{
                    color: 'var(--color-text)',
                    fontWeight: isActive('/resume') ? 600 : 400,
                    borderBottom: isActive('/resume') ? 2 : 0,
                    borderColor: 'var(--color-primary)',
                    borderRadius: 0,
                    px: 2,
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: 'var(--color-primary)',
                    }
                  }}
                >
                  Resume
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleLogout}
                  startIcon={<LogoutIcon />}
                  sx={{
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)',
                    '&:hover': {
                      borderColor: '#4A6B86',
                      bgcolor: 'rgba(90, 125, 154, 0.04)',
                    }
                  }}
                >
                  Logout
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default NavBar; 