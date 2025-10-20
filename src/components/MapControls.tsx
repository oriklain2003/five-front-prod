import React, { useState } from 'react';
import { useMap } from '../contexts/MapContext';

const MapControls: React.FC = () => {
  const { map, radarsVisible, toggleRadars, triggerObjectClick } = useMap();
  const [objectId, setObjectId] = useState('');
  const [message, setMessage] = useState('');

  const handleTriggerClick = () => {
    if (!objectId.trim()) {
      setMessage('Please enter an object ID');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const success = triggerObjectClick(objectId.trim());
    if (success) {
      setMessage('Object clicked!');
      setObjectId('');
    } else {
      setMessage('Object not found');
    }
    setTimeout(() => setMessage(''), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTriggerClick();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <button
        onClick={toggleRadars}
        style={{
          padding: '10px 20px',
          backgroundColor: radarsVisible ? '#3b82f6' : '#fff',
          color: radarsVisible ? '#fff' : '#333',
          border: '2px solid #3b82f6',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
      >
        {radarsVisible ? '📡 Hide Radars' : '📡 Show Radars'}
      </button>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        backgroundColor: '#fff',
        padding: '10px',
        borderRadius: '5px',
        border: '2px solid #3b82f6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <label style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          Trigger Object Click
        </label>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter Object ID"
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '14px',
              flex: 1,
              minWidth: '150px'
            }}
          />
          <button
            onClick={handleTriggerClick}
            style={{
              padding: '8px 15px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
            }}
          >
            ▶
          </button>
        </div>
        {message && (
          <span style={{
            fontSize: '11px',
            color: message.includes('not found') || message.includes('enter') ? '#ef4444' : '#10b981',
            fontWeight: 'bold'
          }}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
};

export default MapControls;
