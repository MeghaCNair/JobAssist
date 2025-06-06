import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  styled
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HistoryIcon from '@mui/icons-material/History';
import GetAppIcon from '@mui/icons-material/GetApp';
import { TextSnippet, Psychology, ExpandMore, ArrowForward, WorkOutline } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// Hidden input for file upload
const VisuallyHiddenInput = styled('input')`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

interface ResumeVersion {
  version: number;
  upload_date: string;
  filename: string;
  file_size: number;
}

interface AIAnalysis {
  resume_feedback: string;
  upskilling_suggestions: string;
  matching_roles: string;
  analysis_date: string;
}

const ResumePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Resume state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const [vectorSearchLoading, setVectorSearchLoading] = useState(false);

  useEffect(() => {
    loadResumeData();
  }, []);

  const loadResumeData = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      // Properly encode the email for URLs
      const encodedEmail = encodeURIComponent(email);

      // Fetch current resume URL, versions, and analysis
      const [resumeResponse, versionsResponse, analysisResponse] = await Promise.all([
        fetch(`http://localhost:8000/resumes/${encodedEmail}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }),
        fetch(`http://localhost:8000/resumes/${encodedEmail}/versions`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }),
        fetch(`http://localhost:8000/resumes/${encodedEmail}/latest-analysis`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
      ]);

      // Check resume response
      if (resumeResponse.ok) {
        const resumeData = await resumeResponse.json();
        setResumeUrl(resumeData.url);
      } else if (resumeResponse.status === 401) {
        navigate('/login');
        return;
      }

      // Check versions response
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setResumeVersions(versionsData.versions);
      }

      // Check analysis response
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        if (analysisData.analysis) {
          setAnalysis(analysisData.analysis);
          setHasExistingAnalysis(true);
        }
      }
    } catch (err) {
      console.error('Resume load error:', err);
      if (err instanceof Error) {
        setError(`Failed to load resume data: ${err.message}`);
      } else {
        setError('Failed to load resume data. Please try again.');
      }
      
      // If there's an authentication error, redirect to login
      if (err instanceof Error && err.message.includes('401')) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file type
      if (!file.name.toLowerCase().match(/\.(pdf|doc|docx)$/)) {
        setError('Please select a PDF, DOC, or DOCX file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('email', email); // No need to encode here as it's form data

      const response = await fetch('http://localhost:8000/resumes/upload', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
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
        const errorData = await response.json();
        throw new Error(errorData.detail || `Upload failed: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setSuccess(`Resume uploaded successfully! (Version ${data.version})`);
      setSelectedFile(null);
      
      // Reload resume data
      await loadResumeData();
    } catch (err) {
      console.error('Upload error:', err);
      if (err instanceof Error) {
        setError(`Failed to upload resume: ${err.message}`);
      } else {
        setError('Failed to upload resume. Please try again.');
      }
      
      // If there's an authentication error, redirect to login
      if (err instanceof Error && err.message.includes('401')) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = async (version: number) => {
    try {
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      // Properly encode the email for URL
      const encodedEmail = encodeURIComponent(email);

      const response = await fetch(`http://localhost:8000/resumes/${encodedEmail}/version/${version}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error(`Failed to fetch resume version: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Version fetch error:', err);
      if (err instanceof Error) {
        setError(`Failed to fetch resume version: ${err.message}`);
      } else {
        setError('Failed to fetch resume version. Please try again.');
      }
    }
  };

  const handleAnalyzeResume = async (version?: number) => {
    try {
      setAnalyzing(true);
      setAnalysisError('');
      
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      // Properly encode the email for URL
      const encodedEmail = encodeURIComponent(email);

      // First extract text from the resume
      console.log('Extracting text from resume...');
      const extractResponse = await fetch(`http://localhost:8000/resumes/${encodedEmail}/extract-text${version ? `?version=${version}` : ''}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.detail || `Text extraction failed: HTTP ${extractResponse.status}`);
      }

      // Then analyze the resume
      console.log('Analyzing resume...');
      const response = await fetch(`http://localhost:8000/resumes/${encodedEmail}/analyze${version ? `?version=${version}` : ''}`, {
        method: 'POST',
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
        const errorData = await response.json();
        throw new Error(errorData.detail || `Analysis failed: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.analysis) {
        throw new Error('No analysis data received from server');
      }
      
      setAnalysis(data.analysis);
      setSuccess('Resume analysis completed successfully!');
    } catch (err) {
      console.error('Analysis error:', err);
      if (err instanceof Error) {
        setAnalysisError(`Failed to analyze resume: ${err.message}`);
      } else {
        setAnalysisError('Failed to analyze resume. Please try again.');
      }
      
      // If there's an authentication error, redirect to login
      if (err instanceof Error && err.message.includes('401')) {
        navigate('/login');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVectorSearch = async () => {
    try {
      setVectorSearchLoading(true);
      setError('');
      
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      // First check if we have a valid embedding
      const response = await fetch(`http://localhost:8000/resumes/${encodeURIComponent(email)}/extract-text`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Text extraction failed: HTTP ${response.status}`);
      }

      // Now navigate to jobs page with vector search parameter
      console.log('Starting vector search...');
      navigate('/jobs?vectorSearch=true', { replace: true });
    } catch (err) {
      console.error('Vector search error:', err);
      if (err instanceof Error) {
        setError(`Failed to perform vector search: ${err.message}`);
      } else {
        setError('Failed to perform vector search. Please try again.');
      }
    } finally {
      setVectorSearchLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatUploadDate = (dateStr: string) => {
    try {
      // Parse the ISO string to a Date object
      const utcDate = parseISO(dateStr);
      
      // Format the date in local timezone
      return formatInTimeZone(
        utcDate,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        'PPp'
      );
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const renderAnalysisResults = () => {
    if (!analysis) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          AI Analysis Results
        </Typography>
        <Typography variant="caption" display="block" gutterBottom>
          Analysis performed on: {format(new Date(analysis.analysis_date), 'PPp')}
        </Typography>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Resume Feedback</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {analysis.resume_feedback}
            </Typography>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Upskilling Suggestions</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {analysis.upskilling_suggestions}
            </Typography>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Matching Roles</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {analysis.matching_roles}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
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
        <Box py={4}>
          <Typography variant="h4" gutterBottom>
            Resume Management
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

          {analysisError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {analysisError}
            </Alert>
          )}

          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Resume Upload
              </Typography>
              {resumeVersions.length > 0 && (
                <IconButton 
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  sx={{ ml: 1 }}
                >
                  <HistoryIcon />
                </IconButton>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
              >
                Select Resume
                <VisuallyHiddenInput 
                  type="file" 
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />
              </Button>
              
              {selectedFile && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    sx={{
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
                    onClick={handleUpload}
                    disabled={loading}
                  >
                    {loading ? 'Uploading...' : 'Upload'}
                  </Button>
                </Box>
              )}

              {resumeUrl && !selectedFile && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    sx={{
                      bgcolor: 'var(--color-primary)',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: 'var(--color-primary-dark)',
                      },
                      textTransform: 'none',
                      px: 3,
                      py: 1,
                      borderRadius: 1
                    }}
                    onClick={() => window.open(resumeUrl, '_blank')}
                    startIcon={<GetAppIcon />}
                  >
                    View Resume
                  </Button>
                  <Button
                    sx={{
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
                    onClick={() => handleAnalyzeResume()}
                    disabled={analyzing}
                    startIcon={<Psychology />}
                  >
                    {analyzing ? 'Analyzing...' : 'Get Resume Feedback'}
                  </Button>
                  <Button
                    sx={{
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
                    onClick={handleVectorSearch}
                    disabled={vectorSearchLoading}
                    startIcon={<WorkOutline />}
                  >
                    {vectorSearchLoading ? 'Searching...' : 'Match with Jobs'}
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>

          {showVersionHistory && resumeVersions.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Version History
              </Typography>
              <List>
                {resumeVersions.map((version) => (
                  <ListItem
                    key={version.version}
                    sx={{
                      borderBottom: '1px solid #eee',
                      '&:last-child': { borderBottom: 'none' },
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                    }}
                  >
                    <ListItemText
                      primary={`Version ${version.version}`}
                      secondary={`Uploaded ${formatUploadDate(version.upload_date)} • ${formatFileSize(version.file_size)}`}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        onClick={() => handleVersionClick(version.version)}
                        title="Download"
                      >
                        <GetAppIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleAnalyzeResume(version.version)}
                        title="AI Analysis"
                        disabled={analyzing}
                      >
                        <Psychology />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {renderAnalysisResults()}
        </Box>
      </Container>

      {/* Back to Profile button */}
      <Paper
        sx={{
          position: 'fixed',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          bgcolor: '#848e89',
          borderRadius: '0 24px 24px 0',
          boxShadow: '0 3px 5px rgba(132, 142, 137, 0.3)',
          zIndex: 1000,
          ml: 2,
          display: 'flex',
          alignItems: 'center',
          '&:hover': {
            bgcolor: '#6b746f',
            '& .MuiButton-root': {
              transform: 'translateX(5px)',
            },
            '& .button-label': {
              opacity: 1,
              transform: 'translateX(0)',
              visibility: 'visible',
              width: 'auto',
              marginRight: 1
            }
          }
        }}
      >
        <Button
          onClick={() => navigate('/profile')}
          title="Back to Profile"
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
          <ArrowForward sx={{ transform: 'rotate(180deg)' }} />
        </Button>
        <Box
          className="button-label"
          sx={{
            color: '#fff',
            pl: 1,
            width: 0,
            fontSize: '0.875rem',
            fontWeight: 500,
            opacity: 0,
            transform: 'translateX(-10px)',
            transition: 'all 0.3s ease-in-out',
            visibility: 'hidden',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}
        >
          Profile
        </Box>
      </Paper>

      {/* Next to Jobs button */}
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
          Jobs
        </Box>
        <Button
          onClick={() => navigate('/jobs')}
          title="Go to Jobs"
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
    </Box>
  );
};

export default ResumePage; 