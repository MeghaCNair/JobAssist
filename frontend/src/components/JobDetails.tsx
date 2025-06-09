import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Modal,
  LinearProgress
} from '@mui/material';
import { 
  Business, 
  LocationOn, 
  AttachMoney, 
  ArrowBack,
  CalendarToday,
  Description,
  Edit
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

interface SectionSuggestion {
  section: string;
  explanation: string;
}

interface ResumeSuggestions {
  bullet_points: (string | object)[];
  skills: (string | object)[];
  achievements: (string | object)[];
  keywords: (string | object)[];
  sections: SectionSuggestion[];
}

interface JobDetails {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string;
  requirements: string[];
  postedDate: string;
  status: string;
  url?: string;
  source?: string;
  matchScore?: number;
  matchDetails?: {
    matching_skills: string[];
    match_explanation: string;
  };
}

const JobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingToJob, setApplyingToJob] = useState(false);
  
  // States for AI features
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [generatingResumeSuggestions, setGeneratingResumeSuggestions] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeSuggestions, setResumeSuggestions] = useState<ResumeSuggestions | null>(null);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [showResumeSuggestions, setShowResumeSuggestions] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`http://localhost:8000/api/jobs/${jobId}`);
        setJob(response.data);
      } catch (err) {
        console.error('Error fetching job details:', err);
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Failed to fetch job details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId, navigate]);

  const handleApply = async () => {
    try {
      setApplyingToJob(true);
      const email = localStorage.getItem('userEmail');
      
      if (!email) {
        navigate('/login');
        return;
      }

      // Mark job as applied
      const response = await axios.post(
        `http://localhost:8000/api/jobs/${jobId}/apply?email=${encodeURIComponent(email)}`
      );

      if (response.data) {
        // Open LinkedIn URL in new tab
        if (job?.url) {
          window.open(job.url, '_blank');
        }
        // Navigate back to jobs page
        navigate('/jobs');
      }
    } catch (err) {
      console.error('Error applying to job:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to apply to job. Please try again.');
      }
    } finally {
      setApplyingToJob(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!user?.email) {
      navigate('/login');
      return;
    }

    setGeneratingCoverLetter(true);
    setAiError('');
    try {
      const response = await axios.post(`http://localhost:8000/api/jobs/${jobId}/cover-letter/${user.email}`);
      setCoverLetter(response.data.cover_letter);
      setShowCoverLetter(true);
    } catch (err: any) {
      setAiError(err.response?.data?.detail || 'Failed to generate cover letter');
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleEnhanceResume = async () => {
    if (!user?.email) {
      navigate('/login');
      return;
    }

    setGeneratingResumeSuggestions(true);
    setAiError('');
    try {
      const response = await axios.post(`http://localhost:8000/api/jobs/${jobId}/enhance-resume/${user.email}`);
      
      console.log('Resume suggestions response:', response.data);
      
      const suggestions = response.data;
      if (!suggestions) {
        throw new Error('No data received from server');
      }

      // Transform sections data to ensure proper structure
      const transformedSections = Array.isArray(suggestions.sections) 
        ? suggestions.sections.map((section: string | object) => {
            if (typeof section === 'string') {
              return { section: 'General', explanation: section };
            }
            try {
              const parsed = typeof section === 'object' ? section : JSON.parse(section);
              return {
                section: parsed.section || 'Unknown Section',
                explanation: parsed.explanation || parsed.toString()
              };
            } catch (e) {
              return { section: 'General', explanation: section.toString() };
            }
          })
        : [];

      const transformedSuggestions = {
        bullet_points: Array.isArray(suggestions.bullet_points) ? suggestions.bullet_points : [],
        skills: Array.isArray(suggestions.skills) ? suggestions.skills : [],
        achievements: Array.isArray(suggestions.achievements) ? suggestions.achievements : [],
        keywords: Array.isArray(suggestions.keywords) ? suggestions.keywords : [],
        sections: transformedSections
      };

      setResumeSuggestions(transformedSuggestions);
      setShowResumeSuggestions(true);
    } catch (err: any) {
      console.error('Resume enhancement error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to get resume suggestions';
      setAiError(errorMessage);
      setResumeSuggestions(null);
    } finally {
      setGeneratingResumeSuggestions(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/jobs')}
        >
          Back to Jobs
        </Button>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Job not found</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/jobs')}
          sx={{ mt: 2 }}
        >
          Back to Jobs
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/jobs')}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            color: 'text.primary',
            borderColor: 'grey.300',
            '&:hover': {
              backgroundColor: 'grey.50',
              borderColor: 'grey.400'
            }
          }}
        >
          Back to Jobs
        </Button>
      </Box>

      <Paper 
        elevation={1}
        sx={{ 
          p: 4,
          borderRadius: 2,
          backgroundColor: 'background.paper',
          boxShadow: (theme) => `0 2px 10px ${theme.palette.grey[100]}`
        }}
      >
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{ 
            color: 'text.primary',
            fontWeight: 600,
            mb: 3
          }}
        >
          {job.title}
        </Typography>

        <Stack 
          spacing={2.5} 
          sx={{ 
            mb: 4,
            '& .MuiSvgIcon-root': {
              color: 'grey.500'
            }
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Business />
            <Typography variant="h6" sx={{ color: 'text.primary' }}>{job.company}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <LocationOn />
            <Typography sx={{ color: 'text.secondary' }}>{job.location}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <AttachMoney />
            <Typography sx={{ color: 'text.secondary' }}>{job.salary}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <CalendarToday />
            <Typography sx={{ color: 'text.secondary' }}>
              Posted {format(new Date(job.postedDate), 'MMM dd, yyyy')}
            </Typography>
          </Box>
        </Stack>

        {job.matchScore && job.matchDetails && (
          <Box 
            sx={{ 
              mb: 4,
              p: 3,
              backgroundColor: 'grey.50',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <Typography variant="h6" gutterBottom color="text.primary">
              Match Score: {job.matchScore}%
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom color="text.secondary">
                Matching Skills:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {job.matchDetails.matching_skills.map((skill, index) => (
                  <Chip 
                    key={index} 
                    label={skill} 
                    variant="outlined"
                    sx={{ 
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText'
                      }
                    }} 
                  />
                ))}
              </Box>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {job.matchDetails.match_explanation}
            </Typography>
          </Box>
        )}

        {/* Job Actions */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2, 
            mb: 4,
            flexWrap: 'wrap'
          }}
        >
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={applyingToJob || generatingCoverLetter || generatingResumeSuggestions}
            sx={{ 
              borderRadius: 1,
              textTransform: 'none',
              minWidth: 200,
              py: 1.5,
              bgcolor: 'var(--color-primary)',
              color: '#fff',
              '&:hover': {
                bgcolor: 'var(--color-primary-dark)'
              },
              '&:disabled': {
                bgcolor: 'var(--color-secondary)',
                opacity: 0.7
              }
            }}
          >
            {applyingToJob ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} thickness={6} sx={{ color: '#fff' }} />
                <span>Applying...</span>
              </Box>
            ) : `Apply on ${job?.source || 'Company Website'}`}
          </Button>

          <Button
            variant="outlined"
            startIcon={generatingCoverLetter ? null : <Description />}
            onClick={handleGenerateCoverLetter}
            disabled={applyingToJob || generatingCoverLetter || generatingResumeSuggestions}
            sx={{ 
              borderRadius: 1,
              textTransform: 'none',
              minWidth: 200,
              py: 1.5,
              borderColor: 'var(--color-primary)',
              color: 'var(--color-primary)',
              position: 'relative',
              '&:hover': {
                borderColor: 'var(--color-primary-dark)',
                bgcolor: 'rgba(90, 125, 154, 0.04)'
              },
              '&:disabled': {
                borderColor: generatingCoverLetter ? 'var(--color-primary) !important' : 'var(--color-secondary)',
                color: generatingCoverLetter ? 'var(--color-primary) !important' : 'var(--color-secondary)',
                opacity: generatingCoverLetter ? 1 : 0.7
              }
            }}
          >
            {generatingCoverLetter ? (
              <>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                  <LinearProgress 
                    sx={{ 
                      height: 2,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'var(--color-primary)'
                      }
                    }} 
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} thickness={6} sx={{ color: 'var(--color-primary)' }} />
                  <span>Generating...</span>
                </Box>
              </>
            ) : 'Generate Cover Letter'}
          </Button>

          <Button
            variant="outlined"
            startIcon={generatingResumeSuggestions ? null : <Edit />}
            onClick={handleEnhanceResume}
            disabled={applyingToJob || generatingCoverLetter || generatingResumeSuggestions}
            sx={{ 
              borderRadius: 1,
              textTransform: 'none',
              minWidth: 200,
              py: 1.5,
              borderColor: 'var(--color-primary)',
              color: 'var(--color-primary)',
              position: 'relative',
              '&:hover': {
                borderColor: 'var(--color-primary-dark)',
                bgcolor: 'rgba(90, 125, 154, 0.04)'
              },
              '&:disabled': {
                borderColor: generatingResumeSuggestions ? 'var(--color-primary) !important' : 'var(--color-secondary)',
                color: generatingResumeSuggestions ? 'var(--color-primary) !important' : 'var(--color-secondary)',
                opacity: generatingResumeSuggestions ? 1 : 0.7
              }
            }}
          >
            {generatingResumeSuggestions ? (
              <>
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                  <LinearProgress 
                    sx={{ 
                      height: 2,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: 'var(--color-primary)'
                      }
                    }} 
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} thickness={6} sx={{ color: 'var(--color-primary)' }} />
                  <span>Analyzing...</span>
                </Box>
              </>
            ) : 'Enhance Resume'}
          </Button>
        </Box>

        {aiError && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 4,
              borderRadius: 2
            }}
          >
            {aiError}
          </Alert>
        )}

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              color: 'text.primary',
              fontWeight: 600,
              mb: 2
            }}
          >
            Job Description
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              whiteSpace: 'pre-line',
              color: 'text.secondary',
              lineHeight: 1.7
            }}
          >
            {job.description}
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              color: 'text.primary',
              fontWeight: 600,
              mb: 2
            }}
          >
            Requirements
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {job.requirements.map((req, index) => (
              <Chip 
                key={index} 
                label={req}
                sx={{
                  backgroundColor: 'grey.50',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'grey.200',
                  '&:hover': {
                    backgroundColor: 'grey.100'
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Cover Letter Modal */}
        <Modal
          open={showCoverLetter}
          onClose={() => setShowCoverLetter(false)}
          aria-labelledby="cover-letter-modal"
        >
          <Paper
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              maxWidth: 800,
              maxHeight: '90vh',
              overflow: 'auto',
              p: 4,
              bgcolor: 'var(--color-white)',
              borderRadius: 2,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'var(--color-text)',
                  fontWeight: 600
                }}
              >
                Generated Cover Letter
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setShowCoverLetter(false)}
                sx={{
                  borderColor: 'var(--color-secondary)',
                  color: 'var(--color-text)',
                  minWidth: 'auto',
                  p: 1,
                  '&:hover': {
                    borderColor: 'var(--color-primary)',
                    bgcolor: 'rgba(90, 125, 154, 0.04)'
                  }
                }}
              >
                ✕
              </Button>
            </Box>
            <Typography
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                my: 2,
                color: 'var(--color-text)',
                lineHeight: 1.6
              }}
            >
              {coverLetter}
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  navigator.clipboard.writeText(coverLetter);
                }}
                sx={{
                  bgcolor: 'var(--color-primary)',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: 'var(--color-primary-dark)'
                  }
                }}
              >
                Copy to Clipboard
              </Button>
            </Box>
          </Paper>
        </Modal>

        {/* Resume Suggestions Modal */}
        <Modal
          open={showResumeSuggestions && resumeSuggestions !== null}
          onClose={() => setShowResumeSuggestions(false)}
          aria-labelledby="resume-suggestions-modal"
        >
          <Paper
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              maxWidth: 800,
              maxHeight: '90vh',
              overflow: 'auto',
              p: 4,
              bgcolor: 'var(--color-white)',
              borderRadius: 2,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'var(--color-text)',
                  fontWeight: 600
                }}
              >
                Resume Enhancement Suggestions
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setShowResumeSuggestions(false)}
                sx={{
                  borderColor: 'var(--color-secondary)',
                  color: 'var(--color-text)',
                  minWidth: 'auto',
                  p: 1,
                  '&:hover': {
                    borderColor: 'var(--color-primary)',
                    bgcolor: 'rgba(90, 125, 154, 0.04)'
                  }
                }}
              >
                ✕
              </Button>
            </Box>
            
            {resumeSuggestions && (
              <Box sx={{ mt: 2 }}>
                {resumeSuggestions.bullet_points.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: 'var(--color-primary)',
                        mb: 2,
                        fontWeight: 600
                      }}
                    >
                      Suggested Bullet Points
                    </Typography>
                    <Box 
                      component="ul" 
                      sx={{ 
                        m: 0, 
                        pl: 3,
                        '& li': {
                          color: 'var(--color-text)',
                          mb: 1
                        }
                      }}
                    >
                      {resumeSuggestions.bullet_points.map((point: string | object, index: number) => (
                        <Box component="li" key={index} sx={{ mb: 1 }}>
                          <Typography variant="body1">
                            {typeof point === 'string' ? point : JSON.stringify(point)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {resumeSuggestions.skills.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: 'var(--color-primary)',
                        mb: 2,
                        fontWeight: 600
                      }}
                    >
                      Skills to Emphasize
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {resumeSuggestions.skills.map((skill: string | object, index: number) => (
                        <Chip
                          key={index}
                          label={typeof skill === 'string' ? skill : JSON.stringify(skill)}
                          sx={{
                            bgcolor: 'var(--color-accent)',
                            color: 'var(--color-text)',
                            borderColor: 'var(--color-primary)',
                            '&:hover': {
                              bgcolor: 'var(--color-secondary)'
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {resumeSuggestions.achievements.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: 'var(--color-primary)',
                        mb: 2,
                        fontWeight: 600
                      }}
                    >
                      Key Achievements
                    </Typography>
                    <Box 
                      component="ul" 
                      sx={{ 
                        m: 0, 
                        pl: 3,
                        '& li': {
                          color: 'var(--color-text)',
                          mb: 1
                        }
                      }}
                    >
                      {resumeSuggestions.achievements.map((achievement: string | object, index: number) => (
                        <Box component="li" key={index}>
                          <Typography variant="body1">
                            {typeof achievement === 'string' ? achievement : JSON.stringify(achievement)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {resumeSuggestions.keywords.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: 'var(--color-primary)',
                        mb: 2,
                        fontWeight: 600
                      }}
                    >
                      Important Keywords
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {resumeSuggestions.keywords.map((keyword: string | object, index: number) => (
                        <Chip
                          key={index}
                          label={typeof keyword === 'string' ? keyword : JSON.stringify(keyword)}
                          size="small"
                          sx={{
                            bgcolor: 'var(--color-accent)',
                            color: 'var(--color-text)',
                            '&:hover': {
                              bgcolor: 'var(--color-secondary)'
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {resumeSuggestions.sections.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: 'var(--color-primary)',
                        mb: 2,
                        fontWeight: 600
                      }}
                    >
                      Suggested Section Changes
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {resumeSuggestions.sections.map((sectionItem: SectionSuggestion, index: number) => (
                        <Paper
                          key={index}
                          elevation={1}
                          sx={{
                            p: 2,
                            backgroundColor: 'var(--color-white)',
                            borderLeft: '4px solid',
                            borderColor: 'var(--color-primary)',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              color: 'var(--color-primary)',
                              mb: 1
                            }}
                          >
                            {sectionItem.section}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'var(--color-text)',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {sectionItem.explanation}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={() => setShowResumeSuggestions(false)}
                sx={{
                  bgcolor: 'var(--color-primary)',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: 'var(--color-primary-dark)'
                  }
                }}
              >
                Close
              </Button>
            </Box>
          </Paper>
        </Modal>
      </Paper>
    </Container>
  );
};

export default JobDetails; 