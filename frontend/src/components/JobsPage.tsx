import { useState, useEffect } from 'react';
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
  InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid';
import axios from 'axios';
import { format } from 'date-fns';
import {LocationOn, Business, AttachMoney, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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
}

const ITEMS_PER_PAGE = 6;

const JobsPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [page]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (page === 1) {
        fetchJobs();
      } else {
        setPage(1);
      }
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await axios.get(`http://localhost:8000/api/jobs?${params.toString()}`);
      setJobs(response.data.jobs || []);
      setTotalPages(Math.ceil((response.data.total || 0) / ITEMS_PER_PAGE));
      setError('');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to fetch jobs. Please try again later.');
        console.error('Error fetching jobs:', err);
      }
      setJobs([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo(0, 0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleViewDetails = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Available Jobs
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search jobs by title, description, or requirements..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mt: 2 }}
        />
      </Box>

      {jobs.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <Typography variant="h6" color="text.secondary">
            No jobs available at the moment.
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {jobs.map((job) => (
              <Grid xs={12} md={6} key={job._id} sx={{ display: 'flex' }}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    width: '100%',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                      {job.title}
                    </Typography>

                    <Stack spacing={2} sx={{ mb: 2 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Business color="action" />
                        <Typography variant="body1">{job.company}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LocationOn color="action" />
                        <Typography variant="body1">{job.location}</Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <AttachMoney color="action" />
                        <Typography variant="body1">{job.salary}</Typography>
                      </Box>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {(job.description || '').length > 200 
                        ? `${job.description.substring(0, 200)}...` 
                        : job.description || 'No description available'}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      {(job.requirements || []).slice(0, 3).map((req, index) => (
                        <Chip 
                          key={index} 
                          label={req} 
                          size="small" 
                          sx={{ mr: 1, mb: 1 }} 
                        />
                      ))}
                      {(job.requirements || []).length > 3 && (
                        <Chip 
                          label={`+${job.requirements.length - 3} more`} 
                          size="small" 
                          variant="outlined" 
                        />
                      )}
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Posted {format(new Date(job.postedDate || new Date()), 'MMM dd, yyyy')}
                      </Typography>
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={() => handleViewDetails(job._id)}
                      >
                        View Details
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4} mb={4}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default JobsPage; 