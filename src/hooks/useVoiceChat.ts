import { useState, useCallback, useRef, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { buildApiUrl } from '../config';

interface VoiceChatOptions {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  onStatusChange?: (status: string, type: 'idle' | 'connecting' | 'connected' | 'error') => void;
}

interface VoiceChatState {
  isActive: boolean;
  status: string;
  statusType: 'idle' | 'connecting' | 'connected' | 'error';
}

export const useVoiceChat = (options: VoiceChatOptions = {}) => {
  const { voice = 'alloy', onStatusChange } = options;
  const { messages, currentObject } = useChat();
  
  const [state, setState] = useState<VoiceChatState>({
    isActive: false,
    status: 'Ready to start',
    statusType: 'idle',
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const systemMessageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSystemMessageCountRef = useRef<number>(0);

  const updateStatus = useCallback((message: string, type: 'idle' | 'connecting' | 'connected' | 'error' = 'idle') => {
    setState(prev => ({ ...prev, status: message, statusType: type }));
    onStatusChange?.(message, type);
  }, [onStatusChange]);

  const buildCurrentTargetSnapshot = useCallback((): string => {
    try {
      if (!currentObject) return 'קישור לקול נפתח. אין מטרה נבחרת כרגע.';
      const id = currentObject.name || currentObject.id ? `מטרה: ${currentObject.name || currentObject.id}` : '';
      const type = currentObject.classification?.current_identification ? `סוג: ${currentObject.classification.current_identification}` : '';
      const speed = `מהירות: ${Math.round(currentObject.speed)} קשר`;
      const alt = `גובה: ${Math.round(currentObject.position[2])} רגל`;
      const pos = `מיקום: ${currentObject.position[1].toFixed(4)}, ${currentObject.position[0].toFixed(4)}`;
      const certainty = (currentObject.classification?.certainty_percentage ?? null) !== null
        ? `ודאות: ${currentObject.classification?.certainty_percentage}%` : '';
      const parts = [id, type, speed, alt, pos, certainty].filter(Boolean);
      return `דיווח פתיחה: ${parts.join(' | ')}.`;
    } catch {
      return 'קישור לקול נפתח. אין נתוני מטרה תקפים.';
    }
  }, [currentObject]);

  const buildQnaContext = useCallback((): string | null => {
    try {
      // Prefer steps if present, fallback to qna
      const steps: Array<{ question: string; answers: string[] }> | null | undefined = (currentObject as any)?.steps;
      const qna: Array<{ question: string; answers: string[] }> | null | undefined = (currentObject as any)?.qna;
      const list = (steps && steps.length > 0) ? steps : qna;
      if (!list || list.length === 0) return null;
      const maxItems = 5;
      const lines: string[] = [];
      lines.push('הנחיות/שלבים זמינים למטרה (להשתמש בהם כששואלים על פעולה):');
      list.slice(0, maxItems).forEach((item, idx) => {
        lines.push(`שאלה ${idx + 1}: ${item.question}`);
        item.answers.forEach((ans, aIdx) => {
          const label = item.answers.length === 1 ? 'תשובה' : `תשובה ${aIdx + 1}`;
          lines.push(`${label}: ${ans}`);
        });
      });
      if (list.length > maxItems) lines.push('… ועוד פריטים הושמטו לקיצור.');
      return lines.join('\n');
    } catch {
      return null;
    }
  }, [currentObject]);

  const checkForSystemMessages = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/chat/system-messages'));
      const systemMessages = await response.json();
      
      if (systemMessages.length > lastSystemMessageCountRef.current) {
        const newMessages = systemMessages.slice(lastSystemMessageCountRef.current);
        
        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          for (const msg of newMessages) {
            const systemMessageEvent = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'system',
                content: [{
                  type: 'input_text',
                  text: `התראה מערכת: ${msg.message} (מאת ${msg.sender} בשעה ${new Date(msg.timestamp).toLocaleTimeString()}). קרא זאת בקול והצע פעולה מתאימה.`,
                }],
              },
            };
            dataChannelRef.current.send(JSON.stringify(systemMessageEvent));
            const triggerResponse = { type: 'response.create' } as const;
            dataChannelRef.current.send(JSON.stringify(triggerResponse));
          }
        }
        
        lastSystemMessageCountRef.current = systemMessages.length;
      }
    } catch (error) {
      console.error('Error checking system messages:', error);
    }
  }, []);

  const startVoiceChat = useCallback(async () => {
    try {
      updateStatus('Requesting microphone access...', 'connecting');

      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      updateStatus('Creating session with FIVE AI...', 'connecting');

      const tokenResponse = await fetch(buildApiUrl('/chat/realtime-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: voice,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.message || 'Failed to create session');
      }

      const sessionData = await tokenResponse.json();
      console.log('Session created:', sessionData);

      updateStatus('Connecting to OpenAI Realtime API...', 'connecting');

      peerConnectionRef.current = new RTCPeerConnection();

      audioElementRef.current = document.createElement('audio');
      audioElementRef.current.autoplay = true;

      peerConnectionRef.current.ontrack = (event) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current?.connectionState;
        console.log('Connection state:', state);
        
        if (state === 'connected') {
          updateStatus('🎤 Connected! Start speaking...', 'connected');
          setState(prev => ({ ...prev, isActive: true }));
          systemMessageIntervalRef.current = setInterval(checkForSystemMessages, 2000);
        } else if (state === 'failed' || state === 'disconnected') {
          updateStatus('Connection lost', 'error');
          stopVoiceChat();
        }
      };

      dataChannelRef.current = peerConnectionRef.current.createDataChannel('oai-events');
      
      dataChannelRef.current.onopen = () => {
        console.log('Data channel opened');
        
        if (sessionData.conversation_history && sessionData.conversation_history.length > 0) {
          console.log('Sending conversation history:', sessionData.conversation_history);
          for (const msg of sessionData.conversation_history) {
            const conversationItem = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: msg.role,
                content: [{
                  type: 'input_text',
                  text: msg.content,
                }],
              },
            };
            dataChannelRef.current?.send(JSON.stringify(conversationItem));
          }
        }

        // Proactive spoken opening
        const snapshotText = buildCurrentTargetSnapshot();
        const proactiveSystemItem = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'system',
            content: [{ type: 'input_text', text: `${snapshotText} דבר בקצרה ובעברית.` }],
          },
        };
        dataChannelRef.current?.send(JSON.stringify(proactiveSystemItem));
        const triggerResponse = { type: 'response.create' } as const;
        dataChannelRef.current?.send(JSON.stringify(triggerResponse));

        // Provide steps/QnA context (not spoken, for grounding recommendations)
        const qnaText = buildQnaContext();
        if (qnaText) {
          const qnaSystemItem = {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'system',
              content: [{ type: 'input_text', text: qnaText }],
            },
          };
          dataChannelRef.current?.send(JSON.stringify(qnaSystemItem));
        }

        fetch(buildApiUrl('/chat/system-messages'))
          .then(res => res.json())
          .then(messages => {
            lastSystemMessageCountRef.current = messages.length;
          })
          .catch(console.error);
      };

      dataChannelRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received from AI:', data);
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      };

      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current?.addTrack(track, localStreamRef.current!);
      });

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.client_secret.value}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI API error: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: answerSdp,
      };

      await peerConnectionRef.current.setRemoteDescription(answer);

    } catch (error) {
      console.error('Error starting voice chat:', error);
      updateStatus(`Error: ${(error as Error).message}`, 'error');
      stopVoiceChat();
    }
  }, [voice, updateStatus, checkForSystemMessages, buildCurrentTargetSnapshot]);

  const stopVoiceChat = useCallback(() => {
    if (systemMessageIntervalRef.current) {
      clearInterval(systemMessageIntervalRef.current);
      systemMessageIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }

    setState({
      isActive: false,
      status: 'Ready to start',
      statusType: 'idle',
    });

    lastSystemMessageCountRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, [stopVoiceChat]);

  return {
    ...state,
    startVoiceChat,
    stopVoiceChat,
  };
};

