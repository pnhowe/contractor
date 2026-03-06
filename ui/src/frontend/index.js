import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createRoot } from 'react-dom/client';
import App from './component/App';

const rootEl = document.getElementById('app');
const root = createRoot(rootEl);

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5893df',
    },
    secondary: {
      main: '#2ec5d3',
    },
    background: {
      default: '#192231',
      paper: '#24344d',
    },
  },
});

root.render(
  <ThemeProvider theme={ theme }>
    <App />
  </ThemeProvider>
);

if (module.hot) {
  module.hot.accept('./component/App', () => {
    const NextApp = require('./component/App').default;
    render(NextApp);
  });
}
