import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Pagination,
  Container,
  CircularProgress,
  Chip,
  Stack,
  Button,
  TextField,
  InputAdornment,
  Alert,
  Paper
} from '@mui/material';
import { LocationOn, Business, AttachMoney, Search, WorkOutline, Psychology } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string;
  requirements: string[];
  postedDate: string;
  status: string;
  matchDetails?: {
    overall_match: number;
    key_skills: string[];
    matching_skills: string[];
    seniority_match: string;
    role_alignment: string;
    match_explanation: string;
  };
  showMatchDetails?: boolean;
  analysisError?: string;
}

const REGULAR_ITEMS_PER_PAGE = 6;
const VECTOR_ITEMS_PER_PAGE = 5;

const JobsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isVectorSearch, setIsVectorSearch] = useState(false);
  const [analyzingJobs, setAnalyzingJobs] = useState<{ [key: string]: boolean }>({});
  const [initialized, setInitialized] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentController = useRef<AbortController | null>(null);

  // Handle initial load and vector search
  useEffect(() => {
    const initializeSearch = async () => {
      const params = new URLSearchParams(location.search);
      const isVector = params.get('vectorSearch') === 'true';
      
      // Create a new abort controller for this effect
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (isVector) {
          console.log('Initializing vector search...');
          setIsVectorSearch(true);
          await fetchJobs(true);
        } else {
          setIsVectorSearch(false);
          await fetchJobs(false);
        }
      } catch (err) {
        // Only set error if this request wasn't cancelled
        if (!axios.isCancel(err)) {
          console.error('Search initialization error:', err);
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            setIsVectorSearch(false);
            navigate('/login');
          } else {
            setError('Failed to load jobs. Please try again or contact support.');
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setInitialized(true);
        }
      }
    };

    initializeSearch();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [location.search]); // Only depend on location.search

  // Handle pagination
  useEffect(() => {
    if (initialized && !isVectorSearch && page > 1) {
      fetchJobs(false).catch(err => {
        if (!axios.isCancel(err)) {
          console.error('Pagination error:', err);
        }
      });
    }
  }, [page, initialized]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearch = async () => {
    if (isVectorSearch) {
      await fetchJobs(true);
    } else {
      await fetchJobs(false);
    }
  };

  const handleToggleSearchType = () => {
    setIsVectorSearch(!isVectorSearch);
    // Reset search term when toggling
    setSearchTerm('');
    // Fetch jobs with the new search type
    fetchJobs(!isVectorSearch);
  };

  const fetchJobs = async (isVectorFetch: boolean = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Create AbortController for this request
      const controller = new AbortController();
      
      // Cancel any ongoing requests
      if (currentController.current) {
        currentController.current.abort();
      }
      currentController.current = controller;

      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      let url = isVectorFetch
        ? `http://localhost:8000/api/jobs/vector-search/${encodeURIComponent(email)}?page=${page}&limit=${VECTOR_ITEMS_PER_PAGE}`
        : `http://localhost:8000/api/jobs?page=${page}&limit=${REGULAR_ITEMS_PER_PAGE}&email=${encodeURIComponent(email)}`;

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      console.log('Fetching jobs from:', url);
      const response = await axios.get(url, {
        signal: currentController.current.signal
      });
      
      // Only update state if this request wasn't cancelled
      if (!currentController.current?.signal.aborted) {
        if (isVectorFetch && (!response.data.jobs || response.data.jobs.length === 0)) {
          throw new Error('No matching jobs found. Try adjusting your resume or search criteria.');
        }
        
        setJobs(response.data.jobs || []);
        setTotalPages(Math.ceil((response.data.total || 0) / (isVectorFetch ? VECTOR_ITEMS_PER_PAGE : REGULAR_ITEMS_PER_PAGE)));
        setError('');
      }
    } catch (err) {
      // Only update error state if this request wasn't cancelled
      if (!currentController.current?.signal.aborted) {
        if (axios.isCancel(err)) {
          console.log('Request cancelled');
          return;
        }
        console.error('Error fetching jobs:', err);
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          navigate('/login');
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch jobs. Please try again later.';
          setError(errorMessage);
          setJobs([]);
          setTotalPages(0);
        }
        throw err;
      }
    } finally {
      // Only update loading state if this request wasn't cancelled
      if (!currentController.current?.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo(0, 0);
  };

  const handleViewDetails = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const generateMatchAnalysis = async (jobId: string) => {
    try {
      setAnalyzingJobs(prev => ({ ...prev, [jobId]: true }));
      
      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      const response = await axios.post(
        `http://localhost:8000/api/jobs/${jobId}/match-analysis/${encodeURIComponent(email)}`
      );

      // Update the job with match details and show them
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job._id === jobId 
            ? { 
                ...job, 
                matchDetails: response.data,
                showMatchDetails: true,
                analysisError: undefined 
              }
            : job
        )
      );
    } catch (err) {
      console.error('Error generating match analysis:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/login');
      } else {
        setJobs(prevJobs =>
          prevJobs.map(job =>
            job._id === jobId
              ? {
                  ...job,
                  analysisError: 'Failed to generate analysis. Please try again.'
                }
              : job
          )
        );
      }
    } finally {
      setAnalyzingJobs(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const toggleMatchDetails = (jobId: string) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job._id === jobId
          ? { ...job, showMatchDetails: !job.showMatchDetails }
          : job
      )
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Search Section */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4, 
          backgroundColor: 'var(--color-primary)',
          borderRadius: 2
        }}
      >
        <Typography 
          variant="h5" 
          gutterBottom
          sx={{ 
            color: '#fff',
            mb: 2,
            fontWeight: 500
          }}
        >
          Find Your Next Opportunity
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder="Search jobs by title, skills, or company..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: {
                backgroundColor: '#fff',
                borderRadius: 1,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'transparent'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'transparent'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'transparent'
                }
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              bgcolor: '#fff',
              color: 'var(--color-primary)',
              minWidth: 120,
              '&:hover': {
                bgcolor: '#f5f5f5'
              }
            }}
          >
            Search
          </Button>
          <Button
            variant="contained"
            onClick={handleToggleSearchType}
            sx={{
              bgcolor: isVectorSearch ? '#fff' : 'rgba(255, 255, 255, 0.1)',
              color: isVectorSearch ? 'var(--color-primary)' : '#fff',
              minWidth: 180,
              '&:hover': {
                bgcolor: isVectorSearch ? '#f5f5f5' : 'rgba(255, 255, 255, 0.2)'
              }
            }}
            startIcon={isVectorSearch ? <Psychology /> : <WorkOutline />}
          >
            {isVectorSearch ? 'Resume Match' : 'Regular Search'}
          </Button>
        </Box>
      </Paper>

      {/* Error/Loading States */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4,
            borderRadius: 2
          }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px'
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Jobs Grid */}
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 3,
              mb: 4
            }}
          >
            {jobs.map((job) => (
              <Card
                key={job._id}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography 
                    variant="h6" 
                    component="h2" 
                    gutterBottom
                    sx={{
                      color: 'text.primary',
                      fontWeight: 500,
                      fontSize: '1.1rem',
                      lineHeight: 1.4,
                      mb: 2
                    }}
                  >
                    {job.title}
                  </Typography>

                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                      <Typography variant="body2" color="text.secondary">
                        {job.company}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                      <Typography variant="body2" color="text.secondary">
                        {job.location}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoney sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                      <Typography variant="body2" color="text.secondary">
                        {job.salary}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      flex: 1
                    }}
                  >
                    {job.description}
                  </Typography>

                  <Box sx={{ mt: 'auto' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {job.requirements.slice(0, 3).map((req, index) => (
                        <Chip
                          key={index}
                          label={req}
                          size="small"
                          sx={{
                            backgroundColor: 'grey.100',
                            color: 'text.primary',
                            fontSize: '0.75rem'
                          }}
                        />
                      ))}
                      {job.requirements.length > 3 && (
                        <Chip
                          label={`+${job.requirements.length - 3}`}
                          size="small"
                          sx={{
                            backgroundColor: 'grey.100',
                            color: 'text.primary',
                            fontSize: '0.75rem'
                          }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Posted {format(new Date(job.postedDate), 'MMM dd, yyyy')}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => handleViewDetails(job._id)}
                        sx={{
                          color: 'var(--color-primary)',
                          '&:hover': {
                            backgroundColor: 'rgba(var(--color-primary-rgb), 0.04)'
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: 'text.primary'
                  },
                  '& .Mui-selected': {
                    backgroundColor: 'var(--color-primary) !important',
                    color: '#fff'
                  }
                }}
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default JobsPage; 