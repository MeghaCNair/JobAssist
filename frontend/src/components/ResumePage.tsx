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
import { TextSnippet, Psychology, ExpandMore, ArrowForward } from '@mui/icons-material';
import { format } from 'date-fns';

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
    <Container maxWidth="lg">
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
                  {analyzing ? 'Analyzing...' : 'AI Analysis'}
                </Button>
                <Button
                  sx={{
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
                  onClick={() => navigate('/jobs')}
                  startIcon={<ArrowForward />}
                >
                  Next: Jobs
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
                    secondary={`Uploaded ${format(new Date(version.upload_date), 'PPp')} • ${formatFileSize(version.file_size)}`}
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
  );
};

export default ResumePage; 