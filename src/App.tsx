import { useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, Switch } from '@mui/material';
import { Moon, Sun } from 'lucide-react';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: darkMode ? '#90caf9' : '#1976d2',
          },
          background: {
            default: darkMode ? '#121212' : '#fafafa',
            paper: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
        typography: {
          fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
        },
      }),
    [darkMode]
  );

  const handleToggle = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          padding: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          zIndex: 1000,
        }}
      >
        <Sun size={20} style={{ opacity: darkMode ? 0.5 : 1 }} />
        <Switch
          checked={darkMode}
          onChange={handleToggle}
          color="primary"
        />
        <Moon size={20} style={{ opacity: darkMode ? 1 : 0.5 }} />
      </Box>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 3,
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
              fontWeight: 600,
              marginBottom: 2,
              letterSpacing: '-0.02em',
            }}
          >
            Harvard Eats
          </Typography>

          <Typography
            variant="h5"
            component="p"
            color="text.secondary"
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: 700,
              margin: '0 auto',
            }}
          >
            Track your dining hall consumption, create diet goals, and monitor your nutritional intake.
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
