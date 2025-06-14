import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../utils/api';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  CircularProgress,
  Button,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Storage as StorageIcon,
  History as HistoryIcon,
  Description as FileIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

export const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalRecords: 0,
    lastUpload: null as Date | null,
  });
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    action: string;
    timestamp: Date;
    status: 'success' | 'warning' | 'error';
    details: string;
  }>>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // In a real app, you would fetch this data from your API
        // const statsResponse = await api.get('/api/dashboard/stats');
        // const activityResponse = await api.get('/api/dashboard/activity');
        
        // Mock data for demonstration
        setTimeout(() => {
          setStats({
            totalFiles: 24,
            totalRecords: 1245,
            lastUpload: new Date('2025-06-10T14:30:00'),
          });
          
          setRecentActivity([
            {
              id: '1',
              action: 'File Upload',
              timestamp: new Date('2025-06-10T14:30:00'),
              status: 'success',
              details: 'products.xlsx (24 records)'
            },
            {
              id: '2',
              action: 'Data Validation',
              timestamp: new Date('2025-06-09T11:15:00'),
              status: 'warning',
              details: '3 validation warnings in customers.xlsx'
            },
            {
              id: '3',
              action: 'Error',
              timestamp: new Date('2025-06-08T09:45:00'),
              status: 'error',
              details: 'Failed to process inventory.xlsx'
            },
            {
              id: '4',
              action: 'File Upload',
              timestamp: new Date('2025-06-07T16:20:00'),
              status: 'success',
              details: 'suppliers.csv (18 records)'
            },
            {
              id: '5',
              action: 'Data Update',
              timestamp: new Date('2025-06-06T10:05:00'),
              status: 'success',
              details: 'Updated pricing for 42 products'
            },
          ]);
          
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, navigate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }


  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.name?.split(' ')[0] || 'User'}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's what's happening with your data today.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <FileIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Total Files
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                {stats.totalFiles}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Files uploaded to the system
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <StorageIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Total Records
                </Typography>
              </Box>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                {stats.totalRecords.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Records processed in total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ height: '100%', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <UploadIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Last Upload
                </Typography>
              </Box>
              {stats.lastUpload ? (
                <>
                  <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {format(new Date(stats.lastUpload), 'MMM d, yyyy')}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {format(new Date(stats.lastUpload), 'h:mm a')}
                  </Typography>
                </>
              ) : (
                <Typography variant="body1" color="textSecondary">
                  No uploads yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
            <CardHeader
              title="Recent Activity"
              action={
                <Button
                  color="primary"
                  size="small"
                  onClick={() => navigate('/history')}
                  endIcon={<HistoryIcon />}
                >
                  View All
                </Button>
              }
            />
            <Divider />
            <List sx={{ p: 0 }}>
              {recentActivity.map((activity) => (
                <div key={activity.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(activity.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" component="span">
                            {activity.action}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {format(activity.timestamp, 'MMM d, h:mm a')}
                          </Typography>
                        </Box>
                      }
                      secondary={activity.details}
                      secondaryTypographyProps={{ color: 'textSecondary' }}
                    />
                  </ListItem>
                  <Divider component="li" />
                </div>
              ))}
            </List>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
            <CardHeader title="Quick Actions" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<UploadIcon />}
                    onClick={() => navigate('/upload')}
                    sx={{ justifyContent: 'flex-start', py: 1.5, mb: 1 }}
                  >
                    Upload New File
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<StorageIcon />}
                    onClick={() => navigate('/data')}
                    sx={{ justifyContent: 'flex-start', py: 1.5, mb: 1 }}
                  >
                    View All Data
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => navigate('/history')}
                    sx={{ justifyContent: 'flex-start', py: 1.5 }}
                  >
                    View History
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
