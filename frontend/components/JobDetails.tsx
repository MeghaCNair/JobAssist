import React from 'react';
import { Box, Typography, Paper, Chip, Divider } from '@mui/material';
import JobActions from './JobActions';
import { formatDate } from '../utils/dateUtils';

interface JobDetailsProps {
  job: {
    _id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    requirements: string[];
    salary: string;
    postedDate: string;
    matchScore?: number;
    matchDetails?: {
      matching_skills: string[];
      match_explanation: string;
    };
  };
  onApply: () => void;
}

const JobDetails: React.FC<JobDetailsProps> = ({ job, onApply }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {job.title}
      </Typography>
      
      <Typography variant="h6" color="primary" gutterBottom>
        {job.company}
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {job.location} • Posted {formatDate(job.postedDate)}
      </Typography>
      
      {job.salary && (
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Salary: {job.salary}
        </Typography>
      )}

      {job.matchScore && (
        <Box sx={{ my: 2 }}>
          <Typography variant="h6" gutterBottom>
            Match Score: {job.matchScore}%
          </Typography>
          {job.matchDetails?.matching_skills && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Matching Skills:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {job.matchDetails.matching_skills.map((skill, index) => (
                  <Chip key={index} label={skill} color="primary" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
          {job.matchDetails?.match_explanation && (
            <Typography variant="body1" sx={{ mb: 2 }}>
              {job.matchDetails.match_explanation}
            </Typography>
          )}
        </Box>
      )}

      <JobActions jobId={job._id} onApply={onApply} />

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Job Description
      </Typography>
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
        {job.description}
      </Typography>

      {job.requirements && job.requirements.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Requirements
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            {job.requirements.map((req, index) => (
              <Typography component="li" key={index} variant="body1">
                {req}
              </Typography>
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
};

export default JobDetails; 