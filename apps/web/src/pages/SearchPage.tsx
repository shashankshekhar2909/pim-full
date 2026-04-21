import React from 'react';
import { Box, Typography, Paper, TextField, InputAdornment, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const SearchPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Search Products
      </Typography>

      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}
      >
        <TextField
          fullWidth
          placeholder="Search by SKU code, name, or attributes..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            Popular:
          </Typography>
          {['Electronics', 'Clothing', 'Home & Garden'].map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" clickable />
          ))}
        </Box>
      </Paper>

      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          color: 'text.disabled',
        }}
      >
        <SearchIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
        <Typography variant="h6">Full-text search with faceting coming in Phase 3</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Will include Elasticsearch integration, faceted filters, and real-time results.
        </Typography>
      </Box>
    </Box>
  );
};

export default SearchPage;
