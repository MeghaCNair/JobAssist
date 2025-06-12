import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material';
import { buildApiUrl } from '../config/api';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: ''
  });

  // Job Preferences
  const [jobPreferences, setJobPreferences] = useState({
    desiredRole: '',
    desiredLocation: '',
    workType: 'hybrid', // 'remote', 'onsite', 'hybrid'
    expectedSalary: '',
    industries: [],
    skills: [],
    experience: '',
    willRelocate: false
  });

  // Add a state to track if profile is complete
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!mounted || isLoaded) return;
      
      try {
        setLoading(true);
        const email = localStorage.getItem('userEmail');
        if (!email) {
          navigate('/login');
          return;
        }

        // Properly encode the email for the URL
        const encodedEmail = encodeURIComponent(email);
        
        const response = await fetch(buildApiUrl(`api/users/${encodedEmail}`), {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned non-JSON response');
        }

        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login');
            return;
          }
          if (response.status === 404) {
            // If user not found, create a new user profile
            const createResponse = await fetch(buildApiUrl('api/users'), {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: email,
                name: email.split('@')[0] // Use part before @ as initial name
              })
            });

            if (!createResponse.ok) {
              throw new Error(`Failed to create user profile: HTTP ${createResponse.status}`);
            }

            const newUserData = await createResponse.json();
            if (newUserData.user) {
              setPersonalInfo({
                name: newUserData.user.name || '',
                email: newUserData.user.email || '',
                phone: '',
                location: '',
                linkedinUrl: '',
                githubUrl: '',
                portfolioUrl: ''
              });

              setJobPreferences({
                desiredRole: '',
                desiredLocation: '',
                workType: 'hybrid',
                expectedSalary: '',
                industries: [],
                skills: [],
                experience: '',
                willRelocate: false
              });

              if (mounted) {
                setSuccess('New profile created successfully!');
                setIsLoaded(true);
              }
              return;
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.user && mounted) {
          setPersonalInfo({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            location: data.user.location || '',
            linkedinUrl: data.user.linkedinUrl || '',
            githubUrl: data.user.githubUrl || '',
            portfolioUrl: data.user.portfolioUrl || ''
          });

          // Handle preferences data
          const preferences = data.user.preferences || {};
          setJobPreferences({
            desiredRole: preferences.desiredRole || '',
            desiredLocation: preferences.desiredLocation || '',
            workType: preferences.workType || 'hybrid',
            expectedSalary: preferences.expectedSalary || '',
            skills: typeof preferences.skills === 'string' ? preferences.skills.split(',').filter(Boolean) : (preferences.skills || []),
            industries: Array.isArray(preferences.industries) ? preferences.industries : [],
            experience: preferences.experience || '',
            willRelocate: Boolean(preferences.willRelocate)
          });

          // Set profile complete if essential fields are filled
          setIsProfileComplete(
            data.user.name && 
            data.user.email && 
            preferences.desiredRole && 
            preferences.desiredLocation
          );
          setIsLoaded(true);
        }
      } catch (err) {
        if (mounted) {
          console.error('Profile load error:', err);
          if (err instanceof Error) {
            setError(`Failed to load profile: ${err.message}`);
          } else {
            setError('Failed to load profile. Please try again.');
          }
          
          // If there's an authentication error, redirect to login
          if (err instanceof Error && err.message.includes('401')) {
            navigate('/login');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate, isLoaded]);

  const handlePersonalInfoChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPersonalInfo(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handlePreferencesChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setJobPreferences(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(buildApiUrl(`api/users/${encodedEmail}`), {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: personalInfo.name,
          email: personalInfo.email,
          phone: personalInfo.phone || '',
          location: personalInfo.location || '',
          linkedinUrl: personalInfo.linkedinUrl || '',
          githubUrl: personalInfo.githubUrl || '',
          portfolioUrl: personalInfo.portfolioUrl || '',
          preferences: {
            ...jobPreferences,
            skills: Array.isArray(jobPreferences.skills) ? jobPreferences.skills.join(',') : jobPreferences.skills,
            industries: Array.isArray(jobPreferences.industries) ? jobPreferences.industries : [],
            willRelocate: Boolean(jobPreferences.willRelocate)
          }
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        if (response.status === 404) {
          throw new Error('Profile not found. Please refresh the page.');
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Profile update error:', err);
      if (err instanceof Error) {
        setError(`Failed to update profile: ${err.message}`);
      } else {
        setError('Failed to update profile. Please try again.');
      }
      
      // If there's an authentication error, redirect to login
      if (err instanceof Error && err.message.includes('401')) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Container maxWidth="md">
        <Box py={2} sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
            Profile Settings
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Paper 
            sx={{ 
              p: 2,
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ 
              overflow: 'auto', 
              flex: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#666',
              }
            }}>
              {/* Personal Information Section */}
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Personal Information
              </Typography>
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={personalInfo.name}
                  onChange={handlePersonalInfoChange('name')}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Email"
                  value={personalInfo.email}
                  disabled
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Phone"
                  value={personalInfo.phone}
                  onChange={handlePersonalInfoChange('phone')}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Location"
                  value={personalInfo.location}
                  onChange={handlePersonalInfoChange('location')}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="LinkedIn URL"
                  value={personalInfo.linkedinUrl}
                  onChange={handlePersonalInfoChange('linkedinUrl')}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="GitHub URL"
                  value={personalInfo.githubUrl}
                  onChange={handlePersonalInfoChange('githubUrl')}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Portfolio URL"
                  value={personalInfo.portfolioUrl}
                  onChange={handlePersonalInfoChange('portfolioUrl')}
                  size="small"
                />
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* Job Preferences Section */}
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Job Preferences
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  fullWidth
                  label="Desired Role"
                  value={jobPreferences.desiredRole}
                  onChange={handlePreferencesChange('desiredRole')}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Desired Location"
                  value={jobPreferences.desiredLocation}
                  onChange={handlePreferencesChange('desiredLocation')}
                  size="small"
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Work Type</InputLabel>
                  <Select
                    value={jobPreferences.workType}
                    label="Work Type"
                    onChange={(e) => setJobPreferences(prev => ({
                      ...prev,
                      workType: e.target.value
                    }))}
                  >
                    <MenuItem value="remote">Remote</MenuItem>
                    <MenuItem value="onsite">On-site</MenuItem>
                    <MenuItem value="hybrid">Hybrid</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Expected Salary"
                  value={jobPreferences.expectedSalary}
                  onChange={handlePreferencesChange('expectedSalary')}
                  size="small"
                  sx={{
                    '& .MuiInputLabel-root': {
                      backgroundColor: 'white',
                      px: 0.5,
                    }
                  }}
                />
                <TextField
                  fullWidth
                  label="Years of Experience"
                  value={jobPreferences.experience}
                  onChange={handlePreferencesChange('experience')}
                  size="small"
                  sx={{
                    '& .MuiInputLabel-root': {
                      backgroundColor: 'white',
                      px: 0.5,
                    }
                  }}
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Willing to Relocate</InputLabel>
                  <Select
                    value={jobPreferences.willRelocate}
                    label="Willing to Relocate"
                    onChange={(e) => setJobPreferences(prev => ({
                      ...prev,
                      willRelocate: e.target.value === 'true'
                    }))}
                  >
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          </Paper>

          <Paper sx={{ 
            mt: 2, 
            p: 1.5, 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: 1,
            borderTop: '1px solid rgba(0, 0, 0, 0.12)'
          }}>
            <Button
              sx={{
                minWidth: 120,
                bgcolor: 'var(--color-primary)',
                color: '#fff',
                '&:hover': {
                  bgcolor: 'var(--color-primary-dark)'
                },
                '&:disabled': {
                  bgcolor: 'var(--color-secondary)',
                  opacity: 0.7
                },
                textTransform: 'none',
                px: 3,
                py: 1,
                borderRadius: 1
              }}
              onClick={handleSave}
              disabled={loading}
              size="small"
            >
              {loading ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
          </Paper>
        </Box>
      </Container>

      {(isProfileComplete || success) && (
        <Paper
          sx={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: '#848e89',
            borderRadius: '24px 0 0 24px',
            boxShadow: '0 3px 5px rgba(132, 142, 137, 0.3)',
            zIndex: 1000,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            '&:hover': {
              bgcolor: '#6b746f',
              '& .MuiButton-root': {
                transform: 'translateX(-5px)',
              },
              '& .button-label': {
                opacity: 1,
                transform: 'translateX(0)',
                visibility: 'visible',
                width: 'auto',
                marginLeft: 1
              }
            }
          }}
        >
          <Box
            className="button-label"
            sx={{
              color: '#fff',
              pr: 1,
              width: 0,
              fontSize: '0.875rem',
              fontWeight: 500,
              opacity: 0,
              transform: 'translateX(10px)',
              transition: 'all 0.3s ease-in-out',
              visibility: 'hidden',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}
          >
            Resume
          </Box>
          <Button
            onClick={() => navigate('/resume')}
            title="Go to Resume"
            sx={{
              color: '#fff',
              minWidth: 'auto',
              width: 48,
              height: 48,
              borderRadius: '50%',
              transition: 'all 0.2s ease-in-out',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <ArrowForward />
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default ProfilePage; 