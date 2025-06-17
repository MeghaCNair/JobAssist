import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  Paper,
  Link,
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Form validation
    if (!email.trim() || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(buildApiUrl('api/users/login'), {
        email,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Store user data
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', response.data.user.name);
      localStorage.setItem('userPreferences', JSON.stringify(response.data.user.preferences || {}));

      // Navigate to profile page
      navigate('/profile');
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Invalid email or password');
        } else {
          setError(err.response?.data?.detail || 'Failed to login. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: 'calc(100vh - 64px)',
        bgcolor: 'var(--color-background)',
        width: '100%',
        mt: 0
      }}
    >
      <Container 
        maxWidth="lg"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 4, md: 8 },
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 4, md: 6 },
          height: '100%'
        }}
      >
        {/* Left side - Welcome text */}
        <Box 
          sx={{ 
            flex: 1,
            maxWidth: { md: '600px' }
          }}
        >
          <Typography 
            variant="h2" 
            gutterBottom 
            sx={{ 
              color: 'var(--color-primary)',
              fontWeight: 600,
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.75rem' },
              lineHeight: 1.2,
              fontFamily: 'Inter'
            }}
          >
            Welcome Back
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'var(--color-text)',
              fontWeight: 400,
              lineHeight: 1.6,
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
              maxWidth: '500px',
              fontFamily: 'Inter'
            }}
          >
            Continue your career journey with Jobassist. Access your profile, track applications, and discover new opportunities.
          </Typography>
        </Box>

        {/* Right side - Login form */}
        <Box 
          sx={{ 
            width: { xs: '100%', md: '400px' }
          }}
        >
          <Paper
            elevation={2}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 'var(--radius-lg)',
              bgcolor: 'var(--color-white)',
              width: '100%',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <Box component="form" onSubmit={handleSubmit}>
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 'var(--radius-md)',
                    '& .MuiAlert-icon': {
                      color: 'var(--color-error)'
                    }
                  }}
                >
                  {error}
                </Alert>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                error={!!error && !email}
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 'var(--radius-md)',
                    '&:hover fieldset': {
                      borderColor: 'var(--color-secondary)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--color-primary)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'var(--color-text)',
                    '&.Mui-focused': {
                      color: 'var(--color-primary)',
                    },
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                error={!!error && !password}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 'var(--radius-md)',
                    '&:hover fieldset': {
                      borderColor: 'var(--color-secondary)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--color-primary)',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'var(--color-text)',
                    '&.Mui-focused': {
                      color: 'var(--color-primary)',
                    },
                  },
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  bgcolor: 'var(--color-primary)',
                  fontFamily: 'Inter',
                  '&:hover': {
                    bgcolor: '#4A6B86',
                    transform: 'translateY(-1px)',
                  },
                  '&:disabled': {
                    bgcolor: 'var(--color-secondary)',
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <Box 
                    className="loading-spinner"
                    sx={{ 
                      width: '20px', 
                      height: '20px',
                      borderWidth: '2px',
                    }} 
                  />
                ) : (
                  'Sign In'
                )}
              </Button>
              <Box sx={{ mt: 2.5, textAlign: 'center' }}>
                <Link 
                  onClick={() => navigate('/signup')}
                  sx={{ 
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontFamily: 'Inter',
                    '&:hover': {
                      textDecoration: 'underline',
                      color: 'var(--color-secondary)'
                    }
                  }}
                >
                  Don't have an account? Sign up
                </Link>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage; 