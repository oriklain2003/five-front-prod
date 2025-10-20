import React, { useState, useEffect, useRef } from 'react';
import { ObjectInfo } from './drawables';

interface ObjectChatProps {
  objectData: ObjectInfo;
  onClose: () => void;
  index: number;
}

interface ChatMessage {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

const ObjectChat: React.FC<ObjectChatProps> = ({ objectData, onClose, index }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set the object context when the chat opens
  useEffect(() => {
    fetch('http://localhost:3001/chat/current-object', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(objectData),
    }).catch(error => {
      console.error('Error setting current object context:', error);
    });
  }, [objectData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');

    setMessages(prev => [...prev, { message: userMessage, isUser: true, timestamp: new Date() }]);
    setLoading(true);

    try {
      // Extract a larger history window for object-focused chat
      const userMessages = messages.filter(msg => msg.isUser).slice(-10);
      const assistantMessages = messages.filter(msg => !msg.isUser).slice(-10);
      
      // Combine and sort by timestamp to maintain conversation order
      const recentMessages = [...userMessages, ...assistantMessages]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(msg => ({
          role: msg.isUser ? 'user' as const : 'assistant' as const,
          content: msg.message
        }));

      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: userMessage,
          currentObject: objectData,
          conversationHistory: recentMessages,
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { message: data.response, isUser: false, timestamp: new Date() }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { message: 'Error: Could not get response', isUser: false, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const theme = {
    background: 'rgba(30, 30, 30, 0.95)',
    headerBg: '#1a1a1a',
    border: '#444',
    messagesArea: '#0f0f0f',
    inputArea: '#1e1e1f',
    inputBg: '#333',
    inputBorder: '#555',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    buttonBg: '#2a2a2a',
    buttonHoverBg: '#535353',
    shadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
  };

  const handlePopOut = () => {
    // Create a new window
    const popupWindow = window.open(
      '',
      `object-chat-${objectData.id}`,
      `width=400,height=600,left=100,top=100`
    );

    if (!popupWindow) {
      alert('Please allow popups for this site');
      return;
    }

    // Write the HTML structure for the popup
    popupWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>FIVE - ${objectData.name || objectData.id || 'Unknown'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Assistant, Rubik, "Arial Hebrew", Arial, sans-serif;
              background-color: rgba(30, 30, 30, 0.95);
              color: #e0e0e0;
              height: 100vh;
              display: flex;
              flex-direction: column;
              direction: rtl;
            }
            .header {
              padding: 20px;
              background-color: #1a1a1a;
              border-bottom: 1px solid #444;
            }
            .header-title {
              font-size: 20px;
              font-weight: 600;
              color: #fff;
            }
            .target-info {
              padding: 15px 20px;
              background-color: #1e1e1e;
              border-bottom: 1px solid #444;
            }
            .target-info-label {
              font-size: 11px;
              color: #888;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .target-info-content {
              display: flex;
              flex-direction: column;
              gap: 6px;
              font-size: 13px;
            }
            .target-info-row {
              display: flex;
              justify-content: space-between;
            }
            .target-info-row .label {
              color: #888;
            }
            .target-info-row .value {
              font-weight: normal;
            }
            .target-info-row .value.name {
              font-weight: bold;
              color: #5a67d8;
            }
            .target-info-row .value.type {
              text-transform: capitalize;
              color: #4ade80;
              font-weight: 500;
            }
            .messages {
              flex: 1;
              padding: 20px;
              overflow-y: auto;
              background-color: #0f0f0f;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .empty-state {
              text-align: center;
              color: #b0b0b0;
              font-size: 14px;
              margin-top: 20px;
            }
            .message-wrapper {
              max-width: 85%;
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .message-wrapper.user {
              align-self: flex-end;
            }
            .message-wrapper.assistant {
              align-self: flex-start;
            }
            .message {
              word-wrap: break-word;
              white-space: pre-wrap;
              line-height: 1.6;
              font-family: Assistant, Rubik, Arial, sans-serif;
            }
            .message.user {
              padding: 10px 14px;
              border-radius: 12px;
              background-color: #2a2a2a;
              color: #e0e0e0;
              font-size: 13px;
            }
            .message.assistant {
              padding: 14px 16px;
              border-radius: 8px;
              background-color: #1b1b1b;
              border: 1px solid #404040;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
              font-size: 14px;
            }
            .timestamp {
              font-size: 10px;
              color: #888;
            }
            .timestamp.user {
              text-align: left;
              padding-left: 4px;
            }
            .timestamp.assistant {
              text-align: right;
              padding-right: 4px;
            }
            .loading-container {
              align-self: flex-start;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 10px;
            }
            @keyframes loader-spin {
              to { transform: rotate(360deg); }
            }
            @keyframes loader-path {
              0% { stroke-dasharray: 0, 580, 0, 0, 0, 0, 0, 0, 0; }
              50% { stroke-dasharray: 0, 450, 10, 30, 10, 30, 10, 30, 10; }
              100% { stroke-dasharray: 0, 580, 0, 0, 0, 0, 0, 0, 0; }
            }
            .input-area {
              padding: 16px 20px;
              background-color: #0f0f0f;
            }
            .input-container {
              border: 2px solid #8d2924;
              box-shadow: 0 0 2px 0 rgba(141, 41, 36, 0.5);
              border-radius: 10px;
              background-color: #333;
              overflow: hidden;
            }
            input {
              width: 100%;
              padding: 14px 16px;
              border: none;
              font-size: 14px;
              outline: none;
              background-color: transparent;
              color: #e0e0e0;
              direction: rtl;
              text-align: right;
              font-family: "Myriad Hebrew", Arial, sans-serif;
            }
            .button-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 12px;
              direction: ltr;
            }
            .btn-plus {
              background: none;
              border: none;
              color: #888;
              font-size: 20px;
              cursor: pointer;
              padding: 4px 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: color 0.2s;
            }
            .btn-plus:hover {
              color: #b0b0b0;
            }
            .right-buttons {
              display: flex;
              gap: 8px;
              align-items: center;
            }
            .btn-mic, .btn-send {
              background: none;
              border: none;
              cursor: pointer;
              padding: 4px 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: opacity 0.2s, color 0.2s;
            }
            .btn-mic {
              opacity: 0.6;
            }
            .btn-mic:hover {
              opacity: 0.8;
            }
            .btn-send {
              color: #888;
              font-size: 18px;
            }
            .btn-send:hover:not(:disabled) {
              color: #b0b0b0;
            }
            .btn-send:disabled {
              color: #555;
              cursor: not-allowed;
            }
          </style>
        </head>
        <body>

          <div class="target-info">
            <div class="target-info-label">מטרה ממוקדת</div>
            <div class="target-info-content">
              <div class="target-info-row">
                <span class="label">שם:</span>
                <span class="value name">${objectData.name || objectData.id || 'לא ידוע'}</span>
              </div>
              <div class="target-info-row">
                <span class="label">מהירות:</span>
                <span class="value">${objectData.speed} קשר</span>
              </div>
              <div class="target-info-row">
                <span class="label">גובה:</span>
                <span class="value">${objectData.position[2]} רגל</span>
              </div>
              ${objectData.classification?.current_identification ? `
              <div class="target-info-row">
                <span class="label">סוג:</span>
                <span class="value type">${objectData.classification.current_identification}</span>
              </div>
              ` : ''}
            </div>
          </div>
          <div class="messages" id="messages">
            <div class="empty-state">אין הודעות עדיין</div>
          </div>
          <div class="input-area">
            <div class="input-container">
              <input type="text" id="messageInput" placeholder="יש לך שאלה ל-FIVE?" />
              <div class="button-row">
                <button class="btn-plus" title="Attach document">+</button>
                <div class="right-buttons">
                  <button class="btn-mic" title="Voice input">
                    <svg fill="#727275" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px;">
                      <path d="M960.315 96.818c-186.858 0-338.862 152.003-338.862 338.861v484.088c0 186.858 152.004 338.862 338.862 338.862 186.858 0 338.861-152.004 338.861-338.862V435.68c0-186.858-152.003-338.861-338.861-338.861M427.818 709.983V943.41c0 293.551 238.946 532.497 532.497 532.497 293.55 0 532.496-238.946 532.496-532.497V709.983h96.818V943.41c0 330.707-256.438 602.668-580.9 627.471l-.006 252.301h242.044V1920H669.862v-96.818h242.043l-.004-252.3C587.438 1546.077 331 1274.116 331 943.41V709.983h96.818ZM960.315 0c240.204 0 435.679 195.475 435.679 435.68v484.087c0 240.205-195.475 435.68-435.68 435.68-240.204 0-435.679-195.475-435.679-435.68V435.68C524.635 195.475 720.11 0 960.315 0Z" fill-rule="evenodd"></path>
                    </svg>
                  </button>
                  <button class="btn-send" id="sendBtn" title="Send message">↑</button>
                </div>
              </div>
            </div>
          </div>
          <script>
            const objectData = ${JSON.stringify(objectData)};
            let loading = false;
            const conversationMessages = [];

            // Set object context
            fetch('http://localhost:3001/chat/current-object', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(objectData)
            }).catch(err => console.error('Error setting context:', err));

            // Object data for this chat
            const objectDataForChat = ${JSON.stringify(objectData)};
            
            const messagesDiv = document.getElementById('messages');
            const messageInput = document.getElementById('messageInput');
            const sendBtn = document.getElementById('sendBtn');

            function addMessage(text, isUser) {
              const wrapperDiv = document.createElement('div');
              wrapperDiv.className = 'message-wrapper ' + (isUser ? 'user' : 'assistant');
              
              const msgDiv = document.createElement('div');
              msgDiv.className = 'message ' + (isUser ? 'user' : 'assistant');
              msgDiv.textContent = text;
              
              const timeDiv = document.createElement('div');
              timeDiv.className = 'timestamp ' + (isUser ? 'user' : 'assistant');
              timeDiv.textContent = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
              
              wrapperDiv.appendChild(msgDiv);
              wrapperDiv.appendChild(timeDiv);
              messagesDiv.appendChild(wrapperDiv);
              messagesDiv.scrollTop = messagesDiv.scrollHeight;

              // Track message in conversation
              conversationMessages.push({ 
                message: text, 
                isUser: isUser, 
                timestamp: new Date() 
              });
            }

            function showLoading(show) {
              loading = show;
              sendBtn.disabled = show;
              messageInput.disabled = show;
              
              const existingLoader = document.querySelector('.loading');
              if (existingLoader) existingLoader.remove();
              
              if (show) {
                const loader = document.createElement('div');
                loader.className = 'loading';
                loader.textContent = 'Thinking...';
                messagesDiv.appendChild(loader);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
              }
            }

            async function sendMessage() {
              const message = messageInput.value.trim();
              if (!message || loading) return;

              addMessage(message, true);
              messageInput.value = '';
              showLoading(true);

              try {
                // Extract last 6 user and assistant messages
                const userMessages = conversationMessages.filter(msg => msg.isUser).slice(-6);
                const assistantMessages = conversationMessages.filter(msg => !msg.isUser).slice(-6);
                
                // Combine and sort by timestamp
                const recentMessages = [...userMessages, ...assistantMessages]
                  .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                  .map(msg => ({
                    role: msg.isUser ? 'user' : 'assistant',
                    content: msg.message
                  }));

                const response = await fetch('http://localhost:3001/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    question: message,
                    currentObject: objectDataForChat,
                    conversationHistory: recentMessages
                  })
                });
                const data = await response.json();
                showLoading(false);
                addMessage(data.response, false);
              } catch (error) {
                showLoading(false);
                addMessage('Error: Could not get response', false);
              }
            }

            sendBtn.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') sendMessage();
            });

            // Focus input
            messageInput.focus();
          </script>
        </body>
      </html>
    `);

    popupWindow.document.close();

    // Close this chat in the main window
    onClose();
  };

  const chatWidth = 350;
  const chatHeight = 500;
  const leftPosition = 20 + (index * (chatWidth + 15));

  return (
    <div style={{
      position: 'absolute',
      left: leftPosition,
      top: 20,
      width: `${chatWidth}px`,
      height: `${chatHeight}px`,
      backgroundColor: theme.background,
      boxShadow: theme.shadow,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1100,
      fontFamily: 'Assistant, Rubik, "Arial Hebrew", Arial, sans-serif',
      borderRadius: '12px',
      overflow: 'hidden',
      border: `2px solid #444`,
      direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.headerBg,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '600',
          color: '#fff',
        }}> FIVE</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handlePopOut}
            title="Open in new window"
            style={{
              background: 'none',
              border: '1px solid #888',
              color: '#888',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 8px',
              width: '26px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#888';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#888';
            }}
          >
            ⧉
          </button>
          <button
            onClick={onClose}
            title="Close chat"
            style={{
              background: 'none',
              border: 'none',
              color: '#ff4444',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>
      </div>

      {/* Target Information */}
      <div style={{
        padding: '15px 20px',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: '#1e1e1e',
      }}>
        <div style={{
          fontSize: '11px',
          color: '#888',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          מטרה ממוקדת
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '13px',
          color: theme.text,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>שם:</span>
            <span style={{ fontWeight: 'bold', color: '#5a67d8' }}>
              {objectData.name || objectData.id || 'לא ידוע'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>מהירות:</span>
            <span>{objectData.speed} קשר</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>גובה:</span>
            <span>{objectData.position[2]} רגל</span>
          </div>
          {objectData.classification?.current_identification && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>סוג:</span>
              <span style={{ 
                textTransform: 'capitalize',
                color: '#4ade80',
                fontWeight: '500'
              }}>
                {objectData.classification.current_identification}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        backgroundColor: theme.messagesArea,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            color: theme.textSecondary,
            fontSize: '14px',
            marginTop: '20px',
          }}>
            אין הודעות עדיין
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div
              style={{
                padding: msg.isUser ? '10px 14px' : '14px 16px',
                borderRadius: msg.isUser ? '12px' : '8px',
                backgroundColor: msg.isUser ? theme.buttonBg : '#1b1b1b',
                color: theme.text,
                fontSize: msg.isUser ? '13px' : '14px',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                fontFamily: 'Assistant, Rubik, Arial, sans-serif',
                border: msg.isUser ? 'none' : '1px solid #404040',
                boxShadow: msg.isUser ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              {msg.message}
            </div>
            <div style={{
              fontSize: '10px',
              color: '#888',
              textAlign: msg.isUser ? 'left' : 'right',
              paddingLeft: msg.isUser ? '4px' : '0',
              paddingRight: msg.isUser ? '0' : '4px',
            }}>
              {msg.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />

        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
          }}>
            <svg className="svg-calLoader" width="60" height="60" viewBox="0 0 230 230" xmlns="http://www.w3.org/2000/svg" style={{
              animation: 'loader-spin 2.4s linear infinite',
            }}>
              <style>
                {`
                  @keyframes loader-spin {
                    to { transform: rotate(360deg); }
                  }
                  @keyframes loader-path {
                    0% { stroke-dasharray: 0, 580, 0, 0, 0, 0, 0, 0, 0; }
                    50% { stroke-dasharray: 0, 450, 10, 30, 10, 30, 10, 30, 10; }
                    100% { stroke-dasharray: 0, 580, 0, 0, 0, 0, 0, 0, 0; }
                  }
                `}
              </style>
              <path
                d="M86.429 40c63.616-20.04 101.511 25.08 107.265 61.93 6.487 41.54-18.593 76.99-50.6 87.643-59.46 19.791-101.262-23.577-107.142-62.616C29.398 83.441 59.945 48.343 86.43 40z"
                fill="none"
                stroke="#b0b0b0"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10 10 10 10 10 10 10 432"
                strokeDashoffset="77"
                style={{ animation: 'loader-path 2.4s ease-in-out infinite' }}
              />
              <path
                d="M141.493 37.93c-1.087-.927-2.942-2.002-4.32-2.501-2.259-.824-3.252-.955-9.293-1.172-4.017-.146-5.197-.23-5.47-.37-.766-.407-1.526-1.448-7.114-9.773-4.8-7.145-5.344-7.914-6.327-8.976-1.214-1.306-1.396-1.378-3.79-1.473-1.036-.04-2-.043-2.153-.002-.353.1-.87.586-1 .952-.139.399-.076.71.431 2.22.241.72 1.029 3.386 1.742 5.918 1.644 5.844 2.378 8.343 2.863 9.705.206.601.33 1.1.275 1.125-.24.097-10.56 1.066-11.014 1.032a3.532 3.532 0 0 1-1.002-.276l-.487-.246-2.044-2.613c-2.234-2.87-2.228-2.864-3.35-3.309-.717-.287-2.82-.386-3.276-.163-.457.237-.727.644-.737 1.152-.018.39.167.805 1.916 4.373 1.06 2.166 1.964 4.083 1.998 4.27.04.179.004.521-.076.75-.093.228-1.109 2.064-2.269 4.088-1.921 3.34-2.11 3.711-2.123 4.107-.008.25.061.557.168.725.328.512.72.644 1.966.676 1.32.029 2.352-.236 3.05-.762.222-.171 1.275-1.313 2.412-2.611 1.918-2.185 2.048-2.32 2.45-2.505.241-.111.601-.232.82-.271.267-.058 2.213.201 5.912.8 3.036.48 5.525.894 5.518.914 0 .026-.121.306-.27.638-.54 1.198-1.515 3.842-3.35 9.021-1.029 2.913-2.107 5.897-2.4 6.62-.703 1.748-.725 1.833-.594 2.286.137.46.45.833.872 1.012.41.177 3.823.24 4.37.085.852-.25 1.44-.688 2.312-1.724 1.166-1.39 3.169-3.948 6.771-8.661 5.8-7.583 6.561-8.49 7.387-8.702.233-.065 2.828-.056 5.784.011 5.827.138 6.64.09 8.62-.5 2.24-.67 4.035-1.65 5.517-3.016 1.136-1.054 1.135-1.014.207-1.962-.357-.38-.767-.777-.902-.893z"
                fill="#1e1e1f"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: theme.messagesArea,
      }}>
        <div style={{
          border: `2px solid #8d2924`,
          boxShadow: `0 0 2px 0 rgba(141, 41, 36, 0.5)`,
          borderRadius: '10px',
          backgroundColor: theme.inputBg,
          overflow: 'hidden',
        }}>
          {/* Input Section */}
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={loading ? 'ממתין...' : 'יש לך שאלה ל-FIVE?'}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: 'none',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: 'transparent',
              color: theme.text,
              direction: 'rtl',
              textAlign: 'right',
              fontFamily: '"Myriad Hebrew", Arial, sans-serif',
            }}
          />
          
          {/* Button Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            direction: 'ltr',
          }}>
            {/* Plus Button (Left) */}
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#b0b0b0'}
              onMouseOut={(e) => e.currentTarget.style.color = '#888'}
              title="Attach document"
            >
              +
            </button>
            
            {/* Right Side Buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Mic Button */}
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s',
                  opacity: 0.6,
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
                title="Voice input"
              >
                <svg fill="#727275" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg" style={{ width: '18px', height: '18px' }}>
                  <path d="M960.315 96.818c-186.858 0-338.862 152.003-338.862 338.861v484.088c0 186.858 152.004 338.862 338.862 338.862 186.858 0 338.861-152.004 338.861-338.862V435.68c0-186.858-152.003-338.861-338.861-338.861M427.818 709.983V943.41c0 293.551 238.946 532.497 532.497 532.497 293.55 0 532.496-238.946 532.496-532.497V709.983h96.818V943.41c0 330.707-256.438 602.668-580.9 627.471l-.006 252.301h242.044V1920H669.862v-96.818h242.043l-.004-252.3C587.438 1546.077 331 1274.116 331 943.41V709.983h96.818ZM960.315 0c240.204 0 435.679 195.475 435.679 435.68v484.087c0 240.205-195.475 435.68-435.68 435.68-240.204 0-435.679-195.475-435.679-435.68V435.68C524.635 195.475 720.11 0 960.315 0Z" fillRule="evenodd"></path>
                </svg>
              </button>
              
              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={loading || !message.trim()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: message.trim() && !loading ? '#888' : '#555',
                  fontSize: '18px',
                  cursor: message.trim() && !loading ? 'pointer' : 'not-allowed',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseOver={(e) => {
                  if (message.trim() && !loading) e.currentTarget.style.color = '#b0b0b0';
                }}
                onMouseOut={(e) => {
                  if (message.trim() && !loading) e.currentTarget.style.color = '#888';
                }}
                title="Send message"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectChat;

