import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSku } from '../store/slices/productSlice';

const SkuDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentSku, isLoading, error } = useAppSelector((state) => state.product);
  const { tenant } = useAppSelector((state) => state.auth);

  React.useEffect(() => {
    if (id && tenant?.id) {
      dispatch(fetchSku({ tenantId: tenant.id, skuId: id }));
    }
  }, [id, tenant?.id, dispatch]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentSku) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          Back
        </Button>
        <Typography color="text.secondary">SKU not found.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
        Back to Search
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          {currentSku.name}
        </Typography>
        <Chip label={currentSku.status} color={currentSku.status === 'active' ? 'success' : 'default'} />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Chip label={`SKU: ${currentSku.skuCode}`} variant="outlined" />
        <Chip label={`Stock: ${currentSku.stockLevel}`} variant="outlined" />
      </Box>

      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Product Details
        </Typography>
        {currentSku.description && (
          <Typography variant="body1" color="text.secondary" paragraph>
            {currentSku.description}
          </Typography>
        )}
        <Typography variant="body2" color="text.disabled" sx={{ mt: 2 }}>
          Full attribute display, image gallery, and related products coming in Phase 3.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SkuDetailPage;
