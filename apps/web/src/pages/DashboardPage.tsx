import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import { useAppSelector } from '../store';

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const statCards: StatCard[] = [
  { label: 'Total SKUs', value: '—', icon: <InventoryIcon />, color: '#3b82f6' },
  { label: 'Categories', value: '—', icon: <CategoryIcon />, color: '#10b981' },
  { label: 'Searches Today', value: '—', icon: <SearchIcon />, color: '#f59e0b' },
  { label: 'Active Users', value: '—', icon: <PeopleIcon />, color: '#8b5cf6' },
];

const DashboardPage: React.FC = () => {
  const { user, tenant } = useAppSelector((state) => state.auth);

  const greeting = user?.firstName ? `Welcome back, ${user.firstName}!` : 'Welcome back!';

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {greeting}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here is an overview of your {tenant?.name ?? 'workspace'}.
        </Typography>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Card
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${card.color}15`,
                    color: card.color,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity placeholder */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Recent Activity
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
              {[...Array(5)].map((_, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton width="60%" height={16} />
                    <Skeleton width="40%" height={14} />
                  </Box>
                  <Skeleton width={60} height={14} />
                </Box>
              ))}
            </Box>
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ mt: 3, textAlign: 'center' }}
            >
              Activity feed coming in Phase 4
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Quick Actions
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 2 }}>
              Quick actions coming in Phase 2
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
