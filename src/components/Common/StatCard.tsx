import { type ReactNode } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  RemoveRedEye,
} from '@mui/icons-material';

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: string;
}

export default function StatCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  color = 'primary.main',
}: StatCardProps) {
  const trendIcon = {
    up: <TrendingUp fontSize="small" />,
    down: <TrendingDown fontSize="small" />,
    neutral: <RemoveRedEye fontSize="small" />,
  };

  const trendColor = {
    up: 'success.main',
    down: 'error.main',
    neutral: 'text.secondary',
  } as const;

  return (
    <Card
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2,
        },
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: color,
              width: 48,
              height: 48,
              '& .MuiSvgIcon-root': { fontSize: 24 },
            }}
          >
            {icon}
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              icon={trendIcon[trend.direction]}
              label={`${trend.value}%`}
              size="small"
              sx={{
                bgcolor: 'transparent',
                color: trendColor[trend.direction],
                fontWeight: 600,
                fontSize: 12,
                pl: 0,
                '& .MuiChip-icon': { mr: 0.25 },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              vs last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
