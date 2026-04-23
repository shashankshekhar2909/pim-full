import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';

interface Props {
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  loading?: boolean;
  showBack?: boolean;
  showNext?: boolean;
}

const WizardNav: React.FC<Props> = ({
  onNext,
  onBack,
  nextLabel = 'Next',
  backLabel = 'Previous',
  nextDisabled,
  backDisabled,
  loading,
  showBack = true,
  showNext = true,
}) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
    <Box>
      {showBack && (
        <Button variant="outlined" onClick={onBack} disabled={backDisabled || loading}>
          {backLabel}
        </Button>
      )}
    </Box>
    <Box>
      {showNext && (
        <Button variant="contained" onClick={onNext} disabled={nextDisabled || loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : nextLabel}
        </Button>
      )}
    </Box>
  </Box>
);

export default WizardNav;
