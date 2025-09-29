import React, { useState, useEffect } from 'react';
import './App.css';
import OrderItemBreakdown from './components/OrderItemBreakdown';

// PUBLIC_INTERFACE
function App() {
  /** App root with theme toggler and renders the Order Item Breakdown page. */
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="App">
      <header className="App-header" style={{minHeight: 'auto', padding: '12px 16px', alignItems: 'flex-start'}}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </header>
      <OrderItemBreakdown />
    </div>
  );
}

export default App;
