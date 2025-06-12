import React, { useState } from 'react';
import { Button, Modal, CircularProgress, Alert, Box, Typography, Paper } from '@mui/material';
import { Description, Edit } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

interface JobActionsProps {
  jobId: string;
  onApply: () => void;
}

const JobActions: React.FC<JobActionsProps> = ({ jobId, onApply }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [resumeSuggestions, setResumeSuggestions] = useState<any>(null);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [showResumeSuggestions, setShowResumeSuggestions] = useState(false);

  const handleGenerateCoverLetter = async () => {
    setLoading('cover-letter');
    setError('');
    try {
      const response = await axios.post(buildApiUrl(`api/jobs/${jobId}/cover-letter/${user?.email}`));
      setCoverLetter(response.data.cover_letter);
      setShowCoverLetter(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate cover letter');
    } finally {
      setLoading('');
    }
  };

  const handleEnhanceResume = async () => {
    setLoading('resume');
    setError('');
    try {
      const response = await axios.post(buildApiUrl(`api/jobs/${jobId}/enhance-resume/${user?.email}`));
      setResumeSuggestions(response.data);
      setShowResumeSuggestions(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get resume suggestions');
    } finally {
      setLoading('');
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', my: 2 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={onApply}
        disabled={loading !== ''}
      >
        Apply Now
      </Button>

      <Button
        variant="outlined"
        color="primary"
        startIcon={<Description />}
        onClick={handleGenerateCoverLetter}
        disabled={loading !== ''}
      >
        {loading === 'cover-letter' ? (
          <CircularProgress size={20} />
        ) : (
          'Generate Cover Letter'
        )}
      </Button>

      <Button
        variant="outlined"
        color="primary"
        startIcon={<Edit />}
        onClick={handleEnhanceResume}
        disabled={loading !== ''}
      >
        {loading === 'resume' ? (
          <CircularProgress size={20} />
        ) : (
          'Enhance Resume'
        )}
      </Button>

      {error && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      )}

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
          }}
        >
          <Typography variant="h6" gutterBottom>
            Generated Cover Letter
          </Typography>
          <Typography
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              my: 2,
            }}
          >
            {coverLetter}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              navigator.clipboard.writeText(coverLetter);
            }}
          >
            Copy to Clipboard
          </Button>
        </Paper>
      </Modal>

      {/* Resume Suggestions Modal */}
      <Modal
        open={showResumeSuggestions}
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
          }}
        >
          <Typography variant="h6" gutterBottom>
            Resume Enhancement Suggestions
          </Typography>
          
          {resumeSuggestions && (
            <>
              <Typography variant="h6" sx={{ mt: 2 }}>
                Suggested Bullet Points
              </Typography>
              <ul>
                {resumeSuggestions.bullet_points.map((point: string, index: number) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Skills to Emphasize
              </Typography>
              <ul>
                {resumeSuggestions.skills.map((skill: string, index: number) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Key Achievements
              </Typography>
              <ul>
                {resumeSuggestions.achievements.map((achievement: string, index: number) => (
                  <li key={index}>{achievement}</li>
                ))}
              </ul>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Important Keywords
              </Typography>
              <ul>
                {resumeSuggestions.keywords.map((keyword: string, index: number) => (
                  <li key={index}>{keyword}</li>
                ))}
              </ul>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Suggested Section Changes
              </Typography>
              <ul>
                {resumeSuggestions.sections.map((section: string, index: number) => (
                  <li key={index}>{section}</li>
                ))}
              </ul>
            </>
          )}
        </Paper>
      </Modal>
    </Box>
  );
};

export default JobActions; 