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
  styled,
  LinearProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HistoryIcon from '@mui/icons-material/History';
import GetAppIcon from '@mui/icons-material/GetApp';
import { TextSnippet, Psychology, ExpandMore, ArrowForward, WorkOutline } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { buildApiUrl } from '../config/api';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Hidden input for file upload
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

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
  const [uploadProgress, setUploadProgress] = useState(false);
  
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
        fetch(buildApiUrl(`resumes/${encodedEmail}`), {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }),
        fetch(buildApiUrl(`resumes/${encodedEmail}/versions`), {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }),
        fetch(buildApiUrl(`resumes/${encodedEmail}/latest-analysis`), {
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
      setUploadProgress(true);
      setError('');
      setSuccess('');
      
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('email', email);

      const response = await fetch(buildApiUrl('resumes/upload'), {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Upload failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Reset file input and state before loading new data
      setSelectedFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Load new data before showing success message
      await loadResumeData();
      setSuccess('Resume uploaded successfully!');
      
    } catch (err) {
      console.error('Upload error:', err);
      if (err instanceof Error) {
        setError(`Failed to upload resume: ${err.message}`);
      } else {
        setError('Failed to upload resume. Please try again.');
      }
    } finally {
      setUploadProgress(false);
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

      const response = await fetch(`${buildApiUrl}/resumes/${encodedEmail}/version/${version}`, {
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
      const extractResponse = await fetch(buildApiUrl(`resumes/${encodedEmail}/extract-text${version ? `?version=${version}` : ''}`), {
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
      const response = await fetch(buildApiUrl(`resumes/${encodedEmail}/analyze${version ? `?version=${version}` : ''}`), {
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
      const response = await fetch(buildApiUrl(`resumes/${encodeURIComponent(email)}/extract-text`), {
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

    const formatMarkdown = (text: string) => {
      // Split text into lines
      const lines = text.split('\n');
      
      return lines.map((line, index) => {
        // Handle headings
        if (line.startsWith('#')) {
          const level = line.match(/^#+/)?.[0].length || 1;
          const content = line.replace(/^#+\s*/, '');
          return (
            <Typography
              key={index}
              variant={level === 1 ? 'h5' : level === 2 ? 'h6' : 'subtitle1'}
              sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}
            >
              {content}
            </Typography>
          );
        }

        // Handle bullet points
        if (line.trim().startsWith('- ')) {
          const content = line.replace(/^-\s*/, '');
          // Process bold text within bullet points
          const parts = content.split(/(\*\*.*?\*\*)/g);
          return (
            <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1, pl: 2 }}>
              <Typography sx={{ mr: 1, mt: 0.5 }}>•</Typography>
              <Typography>
                {parts.map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <Typography
                        key={i}
                        component="span"
                        sx={{ fontWeight: 'bold' }}
                      >
                        {part.slice(2, -2)}
                      </Typography>
                    );
                  }
                  return part;
                })}
              </Typography>
            </Box>
          );
        }

        // Handle numbered lists
        if (/^\d+\.\s/.test(line)) {
          const number = line.match(/^\d+/)?.[0];
          const content = line.replace(/^\d+\.\s*/, '');
          // Process bold text within numbered lists
          const parts = content.split(/(\*\*.*?\*\*)/g);
          return (
            <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1, pl: 2 }}>
              <Typography sx={{ mr: 1, minWidth: '1.5rem' }}>{number}.</Typography>
              <Typography>
                {parts.map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <Typography
                        key={i}
                        component="span"
                        sx={{ fontWeight: 'bold' }}
                      >
                        {part.slice(2, -2)}
                      </Typography>
                    );
                  }
                  return part;
                })}
              </Typography>
            </Box>
          );
        }

        // Regular text with bold formatting
        if (line.trim()) {
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <Typography key={index} sx={{ mb: 1 }}>
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <Typography
                      key={i}
                      component="span"
                      sx={{ fontWeight: 'bold' }}
                    >
                      {part.slice(2, -2)}
                    </Typography>
                  );
                }
                return part;
              })}
            </Typography>
          );
        }

        return null;
      });
    };

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
            <Box sx={{
              bgcolor: 'grey.50',
              borderRadius: 2,
              p: 2,
              border: '1px solid',
              borderColor: 'grey.200',
              mb: 1
            }}>
              {formatMarkdown(analysis.resume_feedback)}
            </Box>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Upskilling Suggestions</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{
              bgcolor: 'grey.50',
              borderRadius: 2,
              p: 2,
              border: '1px solid',
              borderColor: 'grey.200',
              mb: 1
            }}>
              {formatMarkdown(analysis.upskilling_suggestions)}
            </Box>
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Matching Roles</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{
              bgcolor: 'grey.50',
              borderRadius: 2,
              p: 2,
              border: '1px solid',
              borderColor: 'grey.200',
              mb: 1
            }}>
              {formatMarkdown(analysis.matching_roles)}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Resume Management
          </Typography>

          {/* Upload Section */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              mb: 4, 
              border: '1px solid',
              borderColor: 'divider',
              position: 'relative'
            }}
          >
            {uploadProgress && (
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                <LinearProgress />
              </Box>
            )}

            <Typography variant="h6" gutterBottom>
              Upload Resume
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              mb: 2,
              flexWrap: 'nowrap'
            }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={uploadProgress}
              >
                Select File
                <VisuallyHiddenInput
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx"
                />
              </Button>

              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!selectedFile || uploadProgress}
                startIcon={uploadProgress ? <CircularProgress size={20} /> : undefined}
              >
                {uploadProgress ? 'Uploading...' : 'Upload'}
              </Button>
            </Box>

            {selectedFile && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Selected file: {selectedFile.name}
              </Typography>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}
          </Paper>

          {/* Main Content */}
          {loading && !uploadProgress ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Current Resume Section */}
              {resumeUrl && (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    mb: 4, 
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
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
                </Paper>
              )}

              {/* Analysis Section */}
              {renderAnalysisResults()}
            </>
          )}
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
          className="side-nav"
          sx={{
            color: '#fff',
            minWidth: 'auto',
            width: 48,
            height: 48,
            borderRadius: '50%',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <ArrowForwardIcon sx={{ transform: 'rotate(180deg)' }} />
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
          className="side-nav"
          sx={{
            color: '#fff',
            minWidth: 'auto',
            width: 48,
            height: 48,
            borderRadius: '50%',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <ArrowForwardIcon />
        </Button>
      </Paper>
    </Box>
  );
};

export default ResumePage; 