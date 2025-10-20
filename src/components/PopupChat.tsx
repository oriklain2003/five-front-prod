import React, { useState, useEffect, useRef } from 'react';
import { ObjectInfo } from '../contexts/ChatContext';
import { calculateETA, parseLineString } from '../utils/geoUtils';
import { processStep } from '../utils/stepsHandler';
import { approveClassification } from '../hooks/useWebSocket';

interface PopupChatProps {
  targetInfo: ObjectInfo;
  initialMessages?: Array<{ message: string; isUser: boolean; buttons?: Array<{ label: string; action: string; data?: any }> }>;
}

const BORDER_LINESTRING = "LINESTRING (35.114365 33.09902, 35.294266 33.111674, 35.321732 33.103621, 35.332031 33.084638, 35.352631 33.062773, 35.378723 33.060471, 35.395889 33.0645, 35.428848 33.069103, 35.443954 33.090966, 35.46936 33.094993, 35.49408 33.094993, 35.499573 33.116275, 35.527725 33.124901, 35.527725 33.142151, 35.540771 33.191582, 35.533905 33.213414, 35.537338 33.234093, 35.544891 33.255341, 35.559311 33.267972, 35.564117 33.286916, 35.584717 33.285194, 35.597076 33.258786, 35.608749 33.250747, 35.625229 33.24443, 35.619736 33.274861, 35.643768 33.282324, 35.657501 33.279454, 35.721359 33.325365, 35.772171 33.337412, 35.811996 33.321349, 35.785217 33.280028, 35.816803 33.246153, 35.855255 33.1502, 35.816803 33.121451, 35.851135 33.104197, 35.875854 32.983324, 35.893707 32.939539, 35.847015 32.871514, 35.842896 32.827673, 35.804443 32.779193, 35.653381 32.678685, 35.562744 32.630123, 35.562744 31.751525, 35.408936 31.264466, 35.463867 31.142305, 35.425415 30.939924, 35.343018 30.822064, 35.172729 30.472349, 35.183716 30.368136, 35.167236 30.102366, 34.920044 29.473079, 34.84314 29.654642, 34.848633 29.750071, 34.595947 30.377614, 34.524536 30.424993, 34.551315 30.502526, 34.504623 30.539199, 34.51973 30.596548, 34.271851 31.236289, 34.335022 31.282072, 34.373474 31.303195, 34.363861 31.370054, 34.370728 31.385296, 34.443169 31.444774, 34.565735 31.539919, 34.29245 31.709476, 34.705811 32.916485, 34.84314 33.022482, 34.876099 33.169744, 35.11282 33.098876)";

// Calculate travel time from point A to point B at given speed
function travelTime(lat1: number, lon1: number, lat2: number, lon2: number, speedKnots: number): number {
  const R = 6371, toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const distKm = 2 * R * Math.asin(Math.sqrt(a));
  return (distKm / (speedKnots * 1.852)) * 3600; // seconds
}

const PopupChat: React.FC<PopupChatProps> = ({ targetInfo, initialMessages = [] }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isTargetDown, setIsTargetDown] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // For cruise missile (טיל שיוט), set fixed 105 seconds countdown
    if (targetInfo.name === 'טיל שיוט') {
      setTimeRemaining(105);
    } else {
      // Calculate ETA to border for other targets
      const lineCoords = parseLineString(BORDER_LINESTRING);
      const eta = calculateETA(
        targetInfo.position[0],
        targetInfo.position[1],
        targetInfo.speed,
        lineCoords
      );
      setTimeRemaining(eta);
    }
  }, [targetInfo]);

  useEffect(() => {
    // Countdown timer
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  useEffect(() => {
    // Countdown for interception messages
    if (countdownSeconds !== null && countdownSeconds > 0) {
      const timer = setInterval(() => {
        setCountdownSeconds(prev => (prev !== null && prev > 0) ? prev - 1 : null);
      }, 1000);
      return () => clearInterval(timer);
    } else if (countdownSeconds === 0) {
      // Timer reached 0 - send delete for target and show interception success
      setIsTargetDown(true);
      
      // Stop the top border crossing timer as well
      setTimeRemaining(0);
      
      // Store in localStorage to prevent Map.tsx from recreating the object
      const downTargets = JSON.parse(localStorage.getItem('downTargets') || '[]');
      if (!downTargets.includes(targetInfo.id)) {
        downTargets.push(targetInfo.id);
        localStorage.setItem('downTargets', JSON.stringify(downTargets));
      }
      
      fetch('http://localhost:3001/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetInfo.id,
          delete: true,
        }),
      }).catch(err => console.error('Failed to delete target:', err));
      
      addMessage('מטרה יורטה', false);
      setCountdownSeconds(null);
    }
  }, [countdownSeconds, targetInfo.id]);

  useEffect(() => {
    // Ignore updates for טיל שיוט if target is down
    if (isTargetDown && targetInfo.name === 'טיל שיוט') {
      // Prevent re-rendering or processing updates for downed cruise missile
      return;
    }
  }, [targetInfo, isTargetDown]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addMessage = (msg: string, isUser: boolean, buttons?: Array<{ label: string; action: string; data?: any }>) => {
    setMessages(prev => [...prev, { message: msg, isUser, buttons }]);
  };

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message to chat
    addMessage(userMessage, true);
    setLoading(true);

    try {
      const recentMessages = messages.slice(-20).map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.message
      }));

      // Build a minimal, high-signal client summary for popup only from its messages
      const summarySeed = [
        targetInfo?.name || targetInfo?.id ? `Name:${targetInfo.name || targetInfo.id}` : '',
        targetInfo?.classification?.current_identification ? `Type:${targetInfo.classification.current_identification}` : '',
        `Speed:${targetInfo.speed}kn`,
        `Alt:${targetInfo.position[2]}ft`
      ].filter(Boolean).join(' | ');

      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          currentObject: targetInfo,
          conversationHistory: recentMessages,
          clientSummary: `${summarySeed}`,
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
    inputArea: '#1e1e1f',
    inputBg: '#333',
    inputBorder: '#555',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    buttonBg: '#1e1e1f',
    buttonHoverBg: '#4c51bf',
    shadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: theme.background,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Assistant, Rubik, "Arial Hebrew", Arial, sans-serif',
      direction: 'rtl',
    }}>
      

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
          מידע על המטרה
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
              {targetInfo.name || targetInfo.id || 'לא ידוע'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>מהירות:</span>
            <span>{targetInfo.speed} קשר</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>גובה:</span>
            <span>{targetInfo.position[2]} רגל</span>
          </div>

          {targetInfo.classification?.current_identification && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>סוג:</span>
              <span style={{
                textTransform: 'capitalize',
                color: '#4ade80',
                fontWeight: '500'
              }}>
                {targetInfo.classification.current_identification}
              </span>
            </div>
          )}
        </div>
      </div>
 {/* Timer Header */}
 <div style={{
         padding: '8px 16px',
         backgroundColor: '#1a1a1a',
         color: '#fff',
         textAlign: 'center',
         display: 'flex',
         alignItems: 'center',
         justifyContent: 'center',
         gap: '12px',
       }}>
                         <div style={{
          padding: '2px 10px',
          // borderRadius: '6px',
          
          backgroundColor: timeRemaining <= 10 ? '#432524' : timeRemaining <= 30 ? '#f59e0b' : '#555',
          color: timeRemaining <= 30 ? '#1a1a1a' : '#fff',
          opacity: 0.85,
          fontSize: '14px',
          fontWeight: '700',
          
          fontFamily: 'monospace',
          letterSpacing: '1px',
          width: 'calc(100% - 16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
                          <div style={{ 
          fontSize: '14px', 
          color: 'white',
          fontWeight: '400',
          marginLeft: '12px',
        }}>
           זמן לחציית קו גבול 
        </div>
          {formatTime(timeRemaining)}
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

        {messages.map((msg, index) => {
          // Parse classification data if present
          const classDataMatch = msg.message.match(/__CLASSIFICATION_DATA__(.+?)__/);
          const classData = classDataMatch ? JSON.parse(classDataMatch[1]) : null;
          const cleanMessage = msg.message.replace(/__CLASSIFICATION_DATA__.+?__/g, '').trim();
          const isClassificationMessage = classData !== null;
          
          // Check if this is the last message (for countdown display)
          const isLastMessage = index === messages.length - 1;
          const hasAbortButton = msg.buttons?.some(b => b.action === 'abort_interception');
          const showCountdown = isLastMessage && hasAbortButton && countdownSeconds !== null;

          return (
            <div
              key={index}
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
                  position: 'relative',
                  padding: msg.isUser ? '10px 14px' : isClassificationMessage ? '14px 16px 14px 16px' : '14px 16px 14px 60px',
                  borderRadius: msg.isUser ? '12px' : '8px',
                  backgroundColor: msg.isUser ? theme.buttonBg : (msg.message.includes('Pop Up') ? '#1b1b1b' : '#1b1b1b'),
                  color: theme.text,
                  fontSize: msg.isUser ? '13px' : '14px',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  border: msg.isUser ? 'none' : '1px solid #404040',
                  boxShadow: msg.isUser ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Countdown Timer for interception messages - inside message */}
                {showCountdown && (
                  <div style={{
                    display: 'block',
                    width: 'calc(100% - 8px)',
                    margin: '0 auto 8px auto',
                    padding: '4px 10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                  }}>
                    זמן ליירוט המטרה      {Math.floor(countdownSeconds / 60).toString().padStart(2, '0')}:{(countdownSeconds % 60).toString().padStart(2, '0')} 
                  </div>
                )}
                {/* Classification Badge */}
                {isClassificationMessage && classData && (
                  <div style={{
                    position: 'absolute',
                    left: '8px',
                    top: '14px',
                    backgroundColor: msg.message.includes('Pop Up') ? '#1b1b1b' : '#0a0a0a',
                    border: 'none',
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
                    paddingLeft: isClassificationMessage ? '70px' : '0',
                    fontFamily: 'Assistant, Rubik, Arial, sans-serif',
                  }}
                />
                
                {/* Action Buttons */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {msg.buttons.map((button, btnIndex) => (
                      <button
                        key={btnIndex}
                        onClick={() => {
                          // Handle button click based on action
                          if (button.action === 'next_step' && button.data) {
                            // Generic step handler
                            processStep({
                              steps: button.data.steps,
                              currentStepIndex: button.data.currentStepIndex,
                              addMessage: addMessage,
                            });
                          } else if (button.action === 'cruise_missile_approve_and_continue') {
                            // Cruise missile flow: approve classification then show action messages
                            approveClassification(targetInfo);
                            
                            // First message with timer
                            setTimeout(() => {
                              addMessage([
                                'יש לפעול מיידית על המטרה כאשר ההחלטה לסווג אותה ככטב"ם אויב',
                                'כרוז צוות ליירוט',
                                'זנק מסוקי קרב',
                                'זנק מטוסי קרב',
                                'העלה כוננות לסוללות הטילים',
                                'העלה מעגל שליטה',
                                'העלה חומסי gps',
                                '',
                                'עדיפיות ותכנית יירוט',
                                '<span style="color: #4ade80; font-weight: bold;">א. סוללת טילים א\' - 95%</span>',
                                'ב. סוללת טילים ב\' 90%',
                                'ג מטוסי קרב - 10%'
                              ].join('\n'), false, [
                                {
                                  label: 'הפעל תוכנית יירוט א\'',
                                  action: 'activate_interception_plan',
                                  data: {}
                                }
                              ]);
                            }, 400);
                          } else if (button.action === 'activate_interception_plan') {
                            // Calculate time to target from current rocket position
                            const currentLat = targetInfo.position[1]; // latitude
                            const currentLng = targetInfo.position[0]; // longitude
                            const targetLat = 32.176194;
                            const targetLng = 35.559311;
                            const rocketSpeed = 1323; // knots
                            
                            const timeToTarget = Math.ceil(travelTime(currentLat, currentLng, targetLat, targetLng, rocketSpeed));
                            
                            // Show final countdown message with calculated time
                            setCountdownSeconds(timeToTarget);
                            addMessage([
                              'סוללת טילים א\' הופעלה',
                              'נקודת פגיעה משוערת מוצגת על המסך'
                            ].join('\n'), false, [
                              {
                                label: 'ABORT',
                                action: 'abort_interception',
                                data: {}
                              }
                            ]);
                          } else if (button.action === 'abort_interception') {
                            // Check if target is already down
                            if (isTargetDown) {
                              addMessage('לא יכול לבטל מטרה יורטה כבר', false);
                            } else {
                              // Stop the countdown
                              setCountdownSeconds(null);
                              addMessage('יירוט בוטל', false);
                            }
                          }
                        }}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: button.action === 'activate_interception_plan' 
                            ? 'rgba(74, 222, 128, 0.2)' 
                            : button.action === 'abort_interception'
                            ? '#4f2725'
                            : '#2a2a2a',
                          color: button.action === 'activate_interception_plan'
                            ? '#4ade80'
                            : button.action === 'abort_interception'
                            ? '#9d9999'
                            : '#767579',
                          border: button.action === 'activate_interception_plan'
                            ? '2px solid #4ade80'
                            : button.action === 'abort_interception'
                            ? '2px solid rgba(220, 38, 38, 0.6)'
                            : '2px solid #6a6a6a',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: button.action === 'abort_interception' ? 'bold' : 'normal',
                          fontFamily: 'Assistant, Rubik, Arial, sans-serif',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          if (button.action === 'activate_interception_plan') {
                            e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.3)';
                          } else if (button.action === 'abort_interception') {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.5)';
                          } else {
                            e.currentTarget.style.backgroundColor = '#535353';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (button.action === 'activate_interception_plan') {
                            e.currentTarget.style.backgroundColor = 'rgba(74, 222, 128, 0.2)';
                          } else if (button.action === 'abort_interception') {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                          } else {
                            e.currentTarget.style.backgroundColor = '#2a2a2a';
                          }
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
                fill="#1e1e1f"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: '5px 6px 16px 40px ',
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

export default PopupChat;

