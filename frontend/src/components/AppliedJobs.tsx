import React, { useState, useEffect } from 'react';
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
  Alert,
  Paper
} from '@mui/material';
import { LocationOn, Business, AttachMoney, CalendarToday } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { buildApiUrl } from '../config/api';

interface AppliedJob {
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
  appliedDate: string;
}

const AppliedJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchAppliedJobs();
  }, [page]);

  const fetchAppliedJobs = async () => {
    try {
      setLoading(true);
      setError('');

      const email = localStorage.getItem('userEmail');
      if (!email) {
        navigate('/login');
        return;
      }

      const response = await axios.get(
        buildApiUrl(`api/jobs/applied/${encodeURIComponent(email)}?page=${page}&limit=6`)
      );

      setJobs(response.data.jobs || []);
      setTotalPages(response.data.totalPages || 0);
    } catch (err) {
      console.error('Error fetching applied jobs:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to fetch applied jobs. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo(0, 0);
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
    <Box sx={{ position: 'relative' }}>
      <Container maxWidth="md">
        <Box py={2} sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
            Applied Jobs
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
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
              {jobs.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                  <Typography variant="h6" color="text.secondary">
                    You haven't applied to any jobs yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {jobs.map((job) => (
                    <Card 
                      key={job._id}
                      sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-2px)',
                          transition: 'all 0.2s ease-in-out'
                        }
                      }}
                    >
                      <CardContent sx={{ p: '16px !important' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Box sx={{ flex: 1, mr: 2 }}>
                            <Typography variant="h6" component="h2" sx={{ 
                              fontSize: '1.1rem',
                              fontWeight: 500,
                              mb: 0.5
                            }}>
                              {job.title}
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Business fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                                <Typography variant="body2" color="text.secondary">{job.company}</Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <LocationOn fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                                <Typography variant="body2" color="text.secondary">{job.location}</Typography>
                              </Box>
                              {job.salary && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <AttachMoney fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                                  <Typography variant="body2" color="text.secondary">{job.salary}</Typography>
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          {(job.description || '').length > 200 
                            ? `${job.description.substring(0, 200)}...` 
                            : job.description || 'No description available'}
                        </Typography>

                        {job.requirements && job.requirements.length > 0 && (
                          <Box sx={{ mb: 1.5 }}>
                            {job.requirements.slice(0, 3).map((req, index) => (
                              <Chip 
                                key={index} 
                                label={req} 
                                size="small"
                                sx={{ 
                                  mr: 0.5, 
                                  mb: 0.5,
                                  fontSize: '0.75rem',
                                  bgcolor: 'rgba(var(--color-primary-rgb), 0.08)',
                                  color: 'var(--color-primary)',
                                  height: '24px'
                                }}
                              />
                            ))}
                            {job.requirements.length > 3 && (
                              <Chip 
                                label={`+${job.requirements.length - 3} more`} 
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.75rem',
                                  borderColor: 'var(--color-primary)',
                                  color: 'var(--color-primary)',
                                  height: '24px'
                                }}
                              />
                            )}
                          </Box>
                        )}

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Stack spacing={1}>
                            <Typography variant="caption" color="text.secondary">
                              Posted {format(new Date(job.postedDate), 'MMM dd, yyyy')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'var(--color-primary)' }}>
                              Applied {format(new Date(job.appliedDate), 'MMM dd, yyyy')}
                            </Typography>
                          </Stack>
                          <Button 
                            size="small"
                            sx={{
                              bgcolor: 'var(--color-primary)',
                              color: '#fff',
                              '&:hover': {
                                bgcolor: 'var(--color-primary-dark)'
                              },
                              textTransform: 'none',
                              minWidth: '100px'
                            }}
                            onClick={() => handleViewDetails(job._id)}
                          >
                            View Details
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange}
                size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: 'var(--color-primary)',
                    '&.Mui-selected': {
                      bgcolor: 'var(--color-primary)',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: 'var(--color-primary-dark)'
                      }
                    }
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default AppliedJobs; 