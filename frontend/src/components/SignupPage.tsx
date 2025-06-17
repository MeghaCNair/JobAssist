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

const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Form validation
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required');
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

    // Password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(buildApiUrl('api/users/signup'), {
        name,
        email,
        password,
        preferences: {}
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Store user data
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', name);
      localStorage.setItem('userPreferences', JSON.stringify({}));

      setSuccess('Account created successfully! Redirecting to profile setup...');
      
      // Redirect to profile page after a short delay
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
      
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError('Email already exists. Please use a different email.');
        } else {
          setError(err.response?.data?.detail || 'Failed to create account. Please try again.');
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
            Create Account
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
            Join Jobassist to kickstart your professional journey. Create a profile, showcase your skills, and connect with opportunities that match your career goals.
          </Typography>
        </Box>

        {/* Right side - Signup form */}
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
              {success && (
                <Alert 
                  severity="success" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 'var(--radius-md)',
                    bgcolor: 'var(--color-accent)',
                    color: 'var(--color-text)'
                  }}
                >
                  {success}
                </Alert>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                error={!!error && !name}
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
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                error={!!error && !password}
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
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                error={!!error && !confirmPassword}
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
                  'Sign Up'
                )}
              </Button>
              <Box sx={{ mt: 2.5, textAlign: 'center' }}>
                <Link 
                  onClick={() => navigate('/login')}
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
                  Already have an account? Sign in
                </Link>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default SignupPage; 