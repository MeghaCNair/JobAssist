import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import {
  Business,
  LocationOn,
  AttachMoney,
  CalendarToday,
  OpenInNew,
  ArrowBack
} from '@mui/icons-material';
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
  url: string;
  source: string;
  search_query: string;
  search_location: string;
  job_id: string;
  scraped_date: string;
}

const JobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/jobs/${jobId}`);
        setJob(response.data);
        setError('');
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Failed to fetch job details. Please try again later.');
          console.error('Error fetching job details:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId, navigate]);

  const handleBack = () => {
    navigate('/jobs');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !job) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error || 'Job not found'}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={handleBack}
        sx={{ mb: 3 }}
      >
        Back to Jobs
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {job.title}
        </Typography>

        <Stack spacing={2} sx={{ mb: 4 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Business color="action" />
            <Typography variant="h6">{job.company}</Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <LocationOn color="action" />
            <Typography>{job.location}</Typography>
          </Box>

          {job.salary && (
            <Box display="flex" alignItems="center" gap={1}>
              <AttachMoney color="action" />
              <Typography>{job.salary}</Typography>
            </Box>
          )}

          <Box display="flex" alignItems="center" gap={1}>
            <CalendarToday color="action" />
            <Typography>
              Posted: {format(new Date(job.postedDate), 'PPP')}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Job Description
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 4 }}>
          {job.description}
        </Typography>

        {job.requirements && job.requirements.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              Requirements
            </Typography>
            <Box sx={{ mb: 4 }}>
              {job.requirements.map((req, index) => (
                <Chip
                  key={index}
                  label={req}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Additional Information
          </Typography>
          <Stack spacing={2}>
            <Typography>
              Source: {job.source}
            </Typography>
            <Typography>
              Location: {job.search_location}
            </Typography>
            {job.url && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<OpenInNew />}
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Apply on {job.source}
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default JobDetails; 