import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <Typography variant="h1" fontWeight={700} color="text.disabled">
        404
      </Typography>
      <Typography variant="h5" fontWeight={600}>
        Page not found
      </Typography>
      <Typography variant="body1" color="text.secondary">
        The page you are looking for does not exist or has been moved.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default NotFoundPage;
