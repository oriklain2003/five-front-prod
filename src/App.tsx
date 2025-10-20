import React, { useEffect, useState } from 'react';
import './App.css';
import { MapProvider } from './contexts/MapContext';
import { ChatProvider, useChat } from './contexts/ChatContext';
import Map from './components/Map';
import MapControls from './components/MapControls';
import Chat from './components/Chat';
import ObjectChat from './components/ObjectChat';
import PopupChat from './components/PopupChat';
import { ObjectInfo } from './contexts/ChatContext';

function AppContent() {
  const { objectChats, closeObjectChat } = useChat();

  return (
    <>
      <Map />
      <Chat />
      {objectChats.map((objectData, index) => (
        <ObjectChat
          key={objectData.id}
          objectData={objectData}
          onClose={() => objectData.id && closeObjectChat(objectData.id)}
          index={index}
        />
      ))}
    </>
  );
}

function App() {
  // Check if this is a popup window
  const [isPopup, setIsPopup] = useState(false);
  const [popupData, setPopupData] = useState<{ targetInfo: ObjectInfo; initialMessages: any[] } | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('popup') === 'true') {
      setIsPopup(true);
      
      // Get data from localStorage
      const targetInfoStr = localStorage.getItem('popupChatTargetInfo');
      const initialMessagesStr = localStorage.getItem('popupChatInitialMessages');
      
      if (targetInfoStr) {
        try {
          const targetInfo = JSON.parse(targetInfoStr);
          const initialMessages = initialMessagesStr ? JSON.parse(initialMessagesStr) : [];
          setPopupData({ targetInfo, initialMessages });
        } catch (e) {
          console.error('Failed to parse popup data:', e);
        }
      }
    }
  }, []);

  // Render popup chat if this is a popup window
  if (isPopup && popupData) {
    return <PopupChat targetInfo={popupData.targetInfo} initialMessages={popupData.initialMessages} />;
  }
  
  if (isPopup && !popupData) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
      }}>
        <div>טוען נתוני מטרה...</div>
      </div>
    );
  }

  // Regular app
  return (
    <MapProvider>
      <ChatProvider>
        <AppContent />
      </ChatProvider>
    </MapProvider>
  );
}

export default App;
