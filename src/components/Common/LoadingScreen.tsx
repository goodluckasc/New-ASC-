import { Box, CircularProgress, Typography, Avatar } from '@mui/material';

export default function LoadingScreen() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
        bgcolor: 'background.default',
      }}
    >
      <Avatar
        src="/logo.png"
        alt="ASC"
        sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}
      >
        ASC
      </Avatar>
      <Typography variant="h6" sx={{ fontWeight: 700 }} color="text.primary">
        ASC APP
      </Typography>
      <CircularProgress size={32} sx={{ mt: 1 }} />
    </Box>
  );
}
