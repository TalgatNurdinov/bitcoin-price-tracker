import React, { useState, useEffect } from 'react';
import bitcoinIcon from './bitcoin.svg';

function App() {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priceColor, setPriceColor] = useState('#FFFFFF');
  const [overlayColor, setOverlayColor] = useState('transparent');
  const [lastPrice, setLastPrice] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let isManualClose = false;

    const connect = () => {
      if (ws) {
        ws.close();
      }

      ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');

      const handlePriceChange = (currentPrice) => {
        if (lastPrice !== null) {
          if (currentPrice > lastPrice) {
            setPriceColor('#05C46B');
            setOverlayColor('#00140B');
          } else if (currentPrice < lastPrice) {
            setPriceColor('#F74343');
            setOverlayColor('#190707');
          }
          
          setTimeout(() => {
            setPriceColor('#FFFFFF');
            setOverlayColor('transparent');
          }, 500);
        }
        
        setLastPrice(currentPrice);
        setPrice(currentPrice);
      };

      ws.onopen = () => {
        setLoading(false);
        setError(null);
        setRetryCount(0);
      };

      ws.onmessage = (event) => {
        const currentPrice = parseFloat(JSON.parse(event.data).c);
        handlePriceChange(currentPrice);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        if (!isManualClose) {
          setError('Connection Lost');
          setLoading(true);
          
          const timeout = Math.min(1000 * Math.pow(2, retryCount), 30000);
          
          reconnectTimeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, timeout);
        }
      };
    };

    connect();

    return () => {
      isManualClose = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [lastPrice, retryCount]);

  const formatPrice = (price) => {
    if (!price) return '0.00';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'decimal'
    }).format(price);
  };

  const commonFontStyle = {
    fontFamily: "'Roboto Mono', monospace !important"
  };

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#000000',
      padding: '0 32px',
      ...commonFontStyle
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: overlayColor,
        transition: 'background-color 0.2s ease',
        pointerEvents: 'none'
      }} />

      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          padding: '8px 12px',
          color: '#9d9d9d',
          cursor: 'pointer',
          fontFamily: "'Roboto Mono', monospace",
          fontSize: '14px',
          zIndex: 10,
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          e.target.style.color = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.color = '#9d9d9d';
        }}
      >
        {isFullscreen ? '[-]' : '[+]'}
      </button>
      
      <div style={{
        position: 'relative',
        textAlign: 'center',
        width: '100%',
        zIndex: 1
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <img 
            src={bitcoinIcon} 
            alt="Bitcoin" 
            style={{
              width: 'clamp(16px, 2vw, 24px)',
              height: 'auto'
            }}
          />
          <p style={{
            fontSize: 'clamp(0.8rem, 1.5vw, 1.2rem)',
            color: '#9d9d9d',
            margin: 0,
            ...commonFontStyle
          }}>
            Bitcoin Price
          </p>
        </div>

        <p style={{
          fontSize: 'clamp(2rem, 8vw, 8rem)',
          fontWeight: '700',
          color: loading ? '#FFFFFF' : error ? '#F74343' : priceColor,
          transition: 'color 0.2s ease',
          margin: 0,
          ...commonFontStyle
        }}>
          {loading ? 'Loading...' : error ? error : `$${formatPrice(price)}`}
        </p>
      </div>
    </div>
  );
}

export default App;