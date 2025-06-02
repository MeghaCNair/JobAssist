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

const ProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      // Properly encode the email for the URL
      const encodedEmail = encodeURIComponent(email);
      
      const response = await fetch(`http://localhost:8000/api/users/${encodedEmail}`, {
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
          const createResponse = await fetch('/api/users', {
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

            setSuccess('New profile created successfully!');
            return;
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.user) {
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
      }
    } catch (err) {
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
    } finally {
      setLoading(false);
    }
  };

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

      // Properly encode the email for the URL
      const encodedEmail = encodeURIComponent(email);

      const response = await fetch(`http://localhost:8000/api/users/${encodedEmail}`, {
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
            // Convert skills array to string if it's an array
            skills: Array.isArray(jobPreferences.skills) ? jobPreferences.skills.join(',') : jobPreferences.skills,
            // Ensure industries is an array
            industries: Array.isArray(jobPreferences.industries) ? jobPreferences.industries : [],
            // Ensure willRelocate is a boolean
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
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
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

        <Grid container spacing={3}>
          {/* Personal Information Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={personalInfo.name}
                  onChange={handlePersonalInfoChange('name')}
                />
                <TextField
                  fullWidth
                  label="Email"
                  value={personalInfo.email}
                  disabled
                />
                <TextField
                  fullWidth
                  label="Phone"
                  value={personalInfo.phone}
                  onChange={handlePersonalInfoChange('phone')}
                />
                <TextField
                  fullWidth
                  label="Location"
                  value={personalInfo.location}
                  onChange={handlePersonalInfoChange('location')}
                />
                <TextField
                  fullWidth
                  label="LinkedIn URL"
                  value={personalInfo.linkedinUrl}
                  onChange={handlePersonalInfoChange('linkedinUrl')}
                />
                <TextField
                  fullWidth
                  label="GitHub URL"
                  value={personalInfo.githubUrl}
                  onChange={handlePersonalInfoChange('githubUrl')}
                />
                <TextField
                  fullWidth
                  label="Portfolio URL"
                  value={personalInfo.portfolioUrl}
                  onChange={handlePersonalInfoChange('portfolioUrl')}
                />
              </Stack>
            </Paper>
          </Grid>

          {/* Job Preferences Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Job Preferences
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Desired Role"
                  value={jobPreferences.desiredRole}
                  onChange={handlePreferencesChange('desiredRole')}
                />
                <TextField
                  fullWidth
                  label="Desired Location"
                  value={jobPreferences.desiredLocation}
                  onChange={handlePreferencesChange('desiredLocation')}
                />
                <FormControl fullWidth>
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
                />
                <TextField
                  fullWidth
                  label="Years of Experience"
                  value={jobPreferences.experience}
                  onChange={handlePreferencesChange('experience')}
                />
                <FormControl fullWidth>
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
            </Paper>

            <Box display="flex" justifyContent="flex-end" mt={2} gap={2}>
              <Button
                sx={{
                  minWidth: 120,
                  bgcolor: 'var(--color-primary)',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: 'var(--color-primary-dark)',
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
              >
                {loading ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
              {(isProfileComplete || success) && (
                <Button
                  sx={{
                    minWidth: 120,
                    bgcolor: '#6B2E7E',
                    color: '#fff',
                    '&:hover': {
                      bgcolor: '#4E1D5E',
                    },
                    fontWeight: 500,
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                    borderRadius: 1
                  }}
                  onClick={() => navigate('/resume')}
                  startIcon={<ArrowForward />}
                >
                  Next: Resume
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ProfilePage; 