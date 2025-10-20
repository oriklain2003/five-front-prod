import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useMap } from '../contexts/MapContext';
import { processStep } from '../utils/stepsHandler';
import { approveClassification } from '../hooks/useWebSocket';
import { buildApiUrl } from '../config';
import { useVoiceChat } from '../hooks/useVoiceChat';

const Chat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { messages, addMessage, currentObject, openObjectChat, clearChat, getClientSummary } = useChat();
  const { removeSpecialTrail } = useMap();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Voice chat hook
  const { isActive: isVoiceChatActive, status: voiceStatus, statusType: voiceStatusType, startVoiceChat, stopVoiceChat } = useVoiceChat({
    voice: 'alloy',
  });

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message to chat
    addMessage(userMessage, true);
    setLoading(true);

    try {
      // Extract last 6 user messages and last 6 assistant messages
      const userMessages = messages.filter(msg => msg.isUser).slice(-10);
      const assistantMessages = messages.filter(msg => !msg.isUser).slice(-10);
      
      // Combine and sort by timestamp to maintain conversation order
      const recentMessages = [...userMessages, ...assistantMessages]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(msg => ({
          role: msg.isUser ? 'user' as const : 'assistant' as const,
          content: msg.message
        }));

      // Compute/update a rolling summary on the client side (stored only in UI)
      const clientSummary = await getClientSummary();

      const response = await fetch(buildApiUrl('/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: userMessage,
          currentObject: currentObject || undefined,
          conversationHistory: recentMessages,
          clientSummary,
        }),
      });

      const data = await response.json();
      
      // Add bot response to chat
      addMessage(data.response, false);
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Error: Could not get response', false);
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
    inputBg: '#333',
    inputBorder: '#555',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    buttonBg: '#2a2a2a',
    buttonHoverBg: '#535353',
    shadow: '-2px 0 15px rgba(0, 0, 0, 0.5)',
  };

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      width: '350px',
      height: '100%',
      backgroundColor: theme.background,
      boxShadow: theme.shadow,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      fontFamily: 'Assistant, Rubik, "Arial Hebrew", Arial, sans-serif',
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
          
          fontSize: '40px',
          fontWeight: '600',
          color: '#fff',
        }}> FIVE</h2>
        <button
          onClick={clearChat}
          title="Clear chat history"
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#ff6b6b',
            border: '1px solid #ff6b6b',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#ff6b6b';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#ff6b6b';
          }}
        >
           נקה
        </button>
      </div>

      {/* Voice Chat Status */}
      {isVoiceChatActive && (
        <div style={{
          padding: '10px 20px',
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: voiceStatusType === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: voiceStatusType === 'connected' ? '#10b981' : '#ef4444',
            animation: voiceStatusType === 'connected' ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          <div style={{
            fontSize: '12px',
            color: voiceStatusType === 'connected' ? '#10b981' : '#ef4444',
            fontWeight: '500',
          }}>
            {voiceStatus}
          </div>
        </div>
      )}

      {/* Current Target Display */}
      {currentObject && (
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: '#1e1e1e',
        }}>
          <div style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}          >
            מטרה ממוקדת
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '13px',
            color: theme.text,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>שם: </span>
              <span style={{ fontWeight: 'bold', color: '#5a67d8' }}>
                {currentObject.name || currentObject.id || 'לא ידוע'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>מהירות:</span>
              <span>{currentObject.speed} קשר</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>גובה:</span>
              <span>{currentObject.position[2]} רגל</span>
            </div>
            {currentObject.classification?.current_identification && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>סוג:</span>
                <span style={{ 
                  textTransform: 'capitalize',
                  color: '#4ade80',
                  fontWeight: '500'
                }}>
                  {currentObject.classification.current_identification}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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
        
        {messages.map((msg, index) => {
          // Parse classification data if present
          const classDataMatch = msg.message.match(/__CLASSIFICATION_DATA__(.+?)__/);
          const classData = classDataMatch ? JSON.parse(classDataMatch[1]) : null;
          const cleanMessage = msg.message.replace(/__CLASSIFICATION_DATA__.+?__/g, '').trim();
          const isClassificationMessage = classData !== null;
          
          // Check if this is an object info message (contains HTML div)
          const isObjectInfoMessage = msg.message.includes('<div style="width: 100%');

          return (
            <div
              key={index}
              style={{
                alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                maxWidth: isObjectInfoMessage ? '95%' : '85%',
                width: isObjectInfoMessage ? '95%' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  padding: msg.isUser ? '10px 14px' : (isObjectInfoMessage ? '12px 16px' : '2px 3px 6px 4px'),
                  borderRadius: msg.isUser ? '12px' : '8px',
                  backgroundColor: msg.isUser ? theme.buttonBg : '#1b1b1b',
                  color: theme.text,
                  fontSize: msg.isUser ? '13px' : '14px',
                  wordWrap: 'break-word',
                  whiteSpace: isObjectInfoMessage ? 'normal' : 'pre-wrap',
                  fontFamily: msg.isUser ? 'inherit' : 'Assistant, Rubik, Arial, sans-serif',
                  lineHeight: '1.6',
                  border: msg.isUser ? 'none' : (isClassificationMessage || (msg.message.includes('מטרה') && msg.message.includes('פרופיל טיסה')) ? '2px solid #444' : '1px solid #404040'),
                  boxShadow: msg.isUser ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Classification Badge */}
                {isClassificationMessage && classData && !msg.message.includes('האם אתה רוצה שאסווג') && (
                  <div style={{
                    position: 'absolute',
                    left: '8px',
                    top: '14px',
                    backgroundColor: theme.headerBg,
                    borderRadius: '6px',
                    padding: '8px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#bbb',
                    minWidth: '50px',
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{classData.speed}kn</div>
                    <div style={{ color: '#888' }}>
                      {String(classData.altitude).padStart(3, '0')}ft
                    </div>
                    <div style={{ color: '#888' }}>{classData.rotation}°</div>
                  </div>
                )}
                
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: cleanMessage.replace(
                      /<span class="suggested-type">(.+?)<\/span>/g, 
                      '<span style="color: #ff4444; font-weight: bold;">$1</span>'
                    )
                  }}
                  style={{
                    paddingLeft: (isClassificationMessage && !msg.message.includes('האם אתה רוצה שאסווג')) ? '70px' : '0',
                  }}
                />
              
              {/* Approve Classification Button - Only show on initial classification message */}
              {!msg.isUser && msg.objectInfo && msg.objectInfo.classification?.suggested_identification && 
               msg.message.includes('פרופיל טיסה') && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => {
                      if (msg.objectInfo) {
                        approveClassification(msg.objectInfo);
                        addMessage(' אישרתי את הסיווג', true);
                        // Remove special trail for ב149 after classification approval
                        if (msg.objectInfo.name === 'ב149' && msg.objectInfo.id) {
                          removeSpecialTrail(msg.objectInfo.id);
                        }
                      }
                    }}
                    style={{
                      padding: '6px 8px',
                      backgroundColor: '#2a2a2a',
                      color: '#e0e0e0',
                      border: '1px solid #404040',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      minWidth: 'fit-content',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#404040';
                      e.currentTarget.style.borderColor = '#505050';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                      e.currentTarget.style.borderColor = '#404040';
                    }}
                  >
                    אשר סיווג: {msg.objectInfo.classification.suggested_identification}
                  </button>
                </div>
              )}
              
              {/* Action Buttons */}
              {msg.buttons && msg.buttons.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {msg.buttons.map((button, btnIndex) => (
                    <button
                      key={btnIndex}
                      onClick={() => {
                        // Handle button click based on action
                        if (button.action === 'open_popup_with_steps' && button.data) {
                          // Open popup with steps data
                          const targetObject = msg.objectInfo || currentObject;
                          console.log(msg.objectInfo, currentObject);
                          if (targetObject) {
                            const steps = button.data.steps;
                            
                            // Store steps and target info in localStorage for popup
                            localStorage.setItem('popupChatTargetInfo', JSON.stringify(targetObject));
                            localStorage.setItem('popupChatSteps', JSON.stringify(steps));
                            
                            // Create initial messages for popup - combine first step answers with next question
                            const popupInitialMessages = [];
                            
                            // Combine all answers from first step
                            let firstMessage = '';
                            if (steps[0].answers.length === 1) {
                              // Single answer - no numbering
                              firstMessage = steps[0].answers[0];
                            } else {
                              // Multiple answers - number them
                              firstMessage = steps[0].answers
                                .map((answer: string, index: number) => `${index + 1}. ${answer}`)
                                .join('\n\n');
                            }
                            
                            // If there's a second step, append its question to the first message
                            if (steps.length > 1) {
                              firstMessage += '\n\n' + steps[1].question;
                              
                              popupInitialMessages.push({
                                message: firstMessage,
                                isUser: false,
                                buttons: [{
                                  label: 'כן',
                                  action: 'next_step',
                                  data: {
                                    steps: steps,
                                    currentStepIndex: 1
                                  }
                                }]
                              });
                            } else {
                              // Only one step, no next question
                              popupInitialMessages.push({
                                message: firstMessage,
                                isUser: false
                              });
                            }
                            
                            localStorage.setItem('popupChatInitialMessages', JSON.stringify(popupInitialMessages));
                            
                            // Open popup window
                            const popupWidth = 450;
                            const popupHeight = 700;
                            const left = window.screen.width - popupWidth - 100;
                            const top = 100;
                            
                            const popup = window.open(
                              `${window.location.origin}/?popup=true`,
                              `target_chat_${targetObject.id}`,
                              `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=no`
                            );
                            
                            if (!popup) {
                              alert('אנא אפשר חלונות קופצים (popups) לאתר זה');
                            } else {
                              addMessage('נפתח חלון תדריך סיווג למטרה', false);
                            }
                          } else {
                            alert('לא נמצא מידע על המטרה');
                          }
                        } else if (button.action === 'next_step' && button.data) {
                          // Generic step handler (for inline steps, not in popup)
                          processStep({
                            steps: button.data.steps,
                            currentStepIndex: button.data.currentStepIndex,
                            addMessage: addMessage,
                          });
                        } else if (button.action === 'add_expansion' && button.data) {
                          // Append expansion text in the same chat thread
                          addMessage(button.data.message, false);
                        } else if (button.action === 'open_popup_chat') {
                          // Open PopupChat window with current object context
                          const targetObject = msg.objectInfo || currentObject;
                          if (targetObject) {
                            const popupWidth = 450;
                            const popupHeight = 700;
                            const left = window.screen.width - popupWidth - 100;
                            const top = 100;
                            // Prepare popup initial message from current message text
                            const initial = [{ message: msg.message.replace(/__CLASSIFICATION_DATA__.+?__/g, '').trim(), isUser: false }];
                            localStorage.setItem('popupChatTargetInfo', JSON.stringify(targetObject));
                            localStorage.setItem('popupChatInitialMessages', JSON.stringify(initial));
                            const popup = window.open(
                              `${window.location.origin}/?popup=true`,
                              `target_chat_${targetObject.id}`,
                              `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=no`
                            );
                            if (!popup) {
                              alert('אנא אaaaקופצים (popups) לאתר זה');
                            }
                          } else {
                            alert('לא נמצא מידע על המטרה');
                          }
                        } else if (button.action === 'approve_suggested') {
                          if (msg.objectInfo) {
                            console.log(msg.objectInfo);
                            approveClassification(msg.objectInfo);
                            addMessage(' אישרתי את הסיווג', true);
                            // Remove special trail for ב149 after classification approval
                            if (msg.objectInfo.name === 'ב149' && msg.objectInfo.id) {
                              removeSpecialTrail(msg.objectInfo.id);
                            }
                          }
                        } else if (button.action === 'open_cruise_missile_popup') {
                          // Open popup with cruise missile flow data
                          const cruiseMissileDataStr = localStorage.getItem('cruiseMissileFlowData');
                          if (cruiseMissileDataStr) {
                            const cruiseMissileData = JSON.parse(cruiseMissileDataStr);
                            const popupWidth = 450;
                            const popupHeight = 700;
                            const left = window.screen.width - popupWidth - 100;
                            const top = 100;
                            const initial = [{ 
                              message: cruiseMissileData.originalMessage, 
                              isUser: false, 
                              buttons: cruiseMissileData.originalButtons 
                            }];
                            localStorage.setItem('popupChatTargetInfo', JSON.stringify(cruiseMissileData.objectData));
                            localStorage.setItem('popupChatInitialMessages', JSON.stringify(initial));
                            const popup = window.open(
                              `${window.location.origin}/?popup=true`,
                              `target_chat_${cruiseMissileData.objectData.id}`,
                              `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=no`
                            );
                            if (!popup) {
                              alert('אנא אפשר חלונות קופצים (popups) לאתר זה');
                            } else {
                              addMessage('נפתח חלון טיפול בטיל שיוט', false);
                            }
                          }
                        } 
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#2a2a2a',
                        color: '#e0e0e0',
                        border: '1px solid #404040',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'Assistant, Rubik, Arial, sans-serif',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#404040';
                        e.currentTarget.style.borderColor = '#505050';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#2a2a2a';
                        e.currentTarget.style.borderColor = '#404040';
                      }}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              )}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#888',
                textAlign: msg.isUser ? 'left' : 'right',
                paddingLeft: msg.isUser ? '4px' : '0',
                paddingRight: msg.isUser ? '0' : '4px',
              }}>
                {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {msg.objectInfo && msg.objectInfo.togglePlots && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: 'flex-start' }}>
                  {msg.objectInfo.plots.length > 0 && (
                    <button
                      onClick={() => msg.objectInfo?.togglePlots?.()}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: theme.buttonBg,
                        color: '#fff',
                        border: '2px solid #6a6a6a',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        fontFamily: 'Assistant, Rubik, Arial, sans-serif',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme.buttonHoverBg}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = theme.buttonBg}
                    >
                      {msg.objectInfo.plotsVisible ? 'פתח תיק עקיבה' : 'פתח תיק עקיבה'}
                    </button>
                  )}
                  <button
                    onClick={() => msg.objectInfo && openObjectChat(msg.objectInfo)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: theme.buttonBg,
                      color: '#fff',
                      border: '2px solid #6a6a6a',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      fontFamily: 'OL Hebrew Headline',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = theme.buttonBg}
                  >
                     פתח צ'אט ממוקד
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
                fill={theme.buttonBg}
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
            placeholder="יש לך שאלה ל-FIVE?"
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
              fontFamily: 'OL Hebrew Headline',
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
                onClick={isVoiceChatActive ? stopVoiceChat : startVoiceChat}
                style={{
                  background: isVoiceChatActive ? 'rgba(239, 68, 68, 0.2)' : 'none',
                  border: isVoiceChatActive ? '1px solid #ef4444' : 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  opacity: isVoiceChatActive ? 1 : 0.6,
                  animation: isVoiceChatActive ? 'pulse 2s ease-in-out infinite' : 'none',
                }}
                onMouseOver={(e) => {
                  if (!isVoiceChatActive) e.currentTarget.style.opacity = '0.8';
                }}
                onMouseOut={(e) => {
                  if (!isVoiceChatActive) e.currentTarget.style.opacity = '0.6';
                }}
                title={isVoiceChatActive ? `Voice chat active: ${voiceStatus}` : 'Start voice chat'}
              >
                <svg 
                  fill={isVoiceChatActive ? '#ef4444' : '#727275'} 
                  viewBox="0 0 1920 1920" 
                  xmlns="http://www.w3.org/2000/svg" 
                  style={{ width: '18px', height: '18px' }}
                >
                  <path d="M960.315 96.818c-186.858 0-338.862 152.003-338.862 338.861v484.088c0 186.858 152.004 338.862 338.862 338.862 186.858 0 338.861-152.004 338.861-338.862V435.68c0-186.858-152.003-338.861-338.861-338.861M427.818 709.983V943.41c0 293.551 238.946 532.497 532.497 532.497 293.55 0 532.496-238.946 532.496-532.497V709.983h96.818V943.41c0 330.707-256.438 602.668-580.9 627.471l-.006 252.301h242.044V1920H669.862v-96.818h242.043l-.004-252.3C587.438 1546.077 331 1274.116 331 943.41V709.983h96.818ZM960.315 0c240.204 0 435.679 195.475 435.679 435.68v484.087c0 240.205-195.475 435.68-435.68 435.68-240.204 0-435.679-195.475-435.679-435.68V435.68C524.635 195.475 720.11 0 960.315 0Z" fillRule="evenodd"></path>
                </svg>
              </button>
              
              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!message.trim() || loading}
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

export default Chat;

