import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';
import { Mic, MicOff, Clock, Play, Square, CheckSquare, AlertTriangle, AlertCircle, RefreshCw, Send, ExternalLink, Mail, FileText, Calendar, Copy, Video, VideoOff, Sparkles, PenTool, X, Monitor, MonitorOff, PictureInPicture, Maximize, Tv, MoreVertical, BarChart2 } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { EmailInviteModal } from './EmailInviteModal';

interface MeetingViewProps {
  token: string;
  meetingId: string;
  currentUser?: any;
  onBack: () => void;
}

export const MeetingView: React.FC<MeetingViewProps> = ({ token, meetingId, currentUser, onBack }) => {
  const [meeting, setMeeting] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('SCHEDULED');
  const [loading, setLoading] = useState(true);
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [videoLayoutMode, setVideoLayoutMode] = useState<'standard' | 'theater' | 'mini'>('standard');
  const [showStageOptionsMenu, setShowStageOptionsMenu] = useState(false);
  const [twinQuestion, setTwinQuestion] = useState('');
  const [twinMessages, setTwinMessages] = useState<any[]>([
    {
      sender: 'twin',
      text: 'Hi! I am the AI Digital Twin of this meeting. Since I know the entire transcript, I can answer your questions as if you had attended. Ask me anything, e.g., "What was the decision on the gateway?", "What tasks are assigned to Bob?", or "Who spoke the most?"'
    }
  ]);
  const [twinLoading, setTwinLoading] = useState(false);
  const [aiDiagram, setAiDiagram] = useState<any>(null);
  const [activeWhiteboardTab, setActiveWhiteboardTab] = useState<'collab' | 'ai-diagram'>('collab');

  const getJoinLink = () =>
    meeting?.code ? `${window.location.origin}/join?code=${meeting.code}` : '';

  const handleCopyInviteLink = () => {
    const link = getJoinLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2500);
  };

  const [liveParticipants, setLiveParticipants] = useState<any[]>([]);
  
  const [waitingList, setWaitingList] = useState<any[]>([]);

  const handleApproveParticipant = (guestSocketId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('approveParticipant', { meetingId, guestSocketId });
      setWaitingList(prev => prev.filter(p => p.socketId !== guestSocketId));
    }
  };

  const handleRejectParticipant = (guestSocketId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('rejectParticipant', { meetingId, guestSocketId });
      setWaitingList(prev => prev.filter(p => p.socketId !== guestSocketId));
    }
  };

  const handleSyncTask = async (taskId: string, platform: 'clickup') => {
    setSyncingTaskId(taskId);
    try {
      const response = await fetch(`http://localhost:5000/meetings/action-items/${taskId}/sync/${platform}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const updatedTask = await response.json();
        setActionItems(prevItems => prevItems.map(item => item.id === taskId ? { ...item, ...updatedTask } : item));
      } else {
        alert(`Failed to sync to ${platform.toUpperCase()}.`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error connecting to ${platform.toUpperCase()} sync service.`);
    } finally {
      setSyncingTaskId(null);
    }
  };

  const handleEmailSummary = async () => {
    try {
      const response = await fetch(`http://localhost:5000/meetings/${meetingId}/email-summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const res = await response.json();
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleFollowup = async () => {
    try {
      const response = await fetch(`http://localhost:5000/meetings/${meetingId}/calendar-link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const res = await response.json();
        window.open(res.url, '_blank');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`${API_URL}/meetings/${meetingId}/pdf`, '_blank');
  };

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return 'No Deadline';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [videoFitMode, setVideoFitMode] = useState<'cover' | 'contain'>('cover');

  useEffect(() => {
    if (isScreenSharing) {
      setVideoFitMode('contain');
    } else {
      setVideoFitMode('cover');
    }
  }, [isScreenSharing]);
  
  // Sarvam AI speech and translation states
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isVoiceCopilotOn, setIsVoiceCopilotOn] = useState(true);
  const [speakingText, setSpeakingText] = useState('');

  const [isRecordingMeeting, setIsRecordingMeeting] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [showSaveAlert, setShowSaveAlert] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem(`meeting_recording_${meetingId}`) || sessionStorage.getItem(`meeting_recording_${meetingId}`);
    if (savedUrl) {
      setRecordedVideoUrl(savedUrl);
    }
  }, [meetingId]);

  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveRecordingToDashboard = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recordedVideoUrl || isSavingRecording) return;

    const randomPasscode = Math.floor(100000 + Math.random() * 900000).toString();
    const passcode = window.prompt(
      "Do you want to secure this recording with an access passcode? We have generated a random passcode for you. Click OK to use it, customize it, or clear/leave blank to make it public:",
      randomPasscode
    );
    if (passcode === null) return; // cancelled saving

    const cleanPasscode = passcode.trim();

    setIsSavingRecording(true);
    setSaveError(null);

    try {
      // 1. Fetch recording Blob
      const blobResponse = await fetch(recordedVideoUrl);
      const blob = await blobResponse.blob();

      // 2. Prepare FormData payload
      const formData = new FormData();
      formData.append('video', blob, `meeting_recording_${meetingId}.webm`);
      formData.append('meetingId', meetingId);
      formData.append('meetingTitle', meeting?.title || 'Meeting Session');
      formData.append('duration', String(meeting?.duration || Math.round(blob.size / 100000)));
      formData.append('createdBy', currentUser?.name || 'User');
      if (cleanPasscode) {
        formData.append('accessCode', cleanPasscode);
      }

      // 3. Upload to backend
      const response = await fetch('http://localhost:5000/recordings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        // Flag as saved locally
        localStorage.setItem(`saved_meeting_rec_${meetingId}`, 'true');
        // If the URL from backend is returned, update it
        if (data.fileUrl) {
          localStorage.setItem(`meeting_recording_${meetingId}`, data.fileUrl);
          setRecordedVideoUrl(data.fileUrl);
        }

        // Trigger success alert
        setShowSaveAlert(true);
        setTimeout(() => {
          setShowSaveAlert(false);
        }, 3000);

        if (cleanPasscode) {
          alert(`✅ Recording saved successfully! Secured with passcode: ${cleanPasscode}`);
        }
      } else {
        setSaveError('Failed to save recording');
        setTimeout(() => setSaveError(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setSaveError('Failed to save recording');
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSavingRecording(false);
    }
  };

  const handleToggleMeetingRecording = async () => {
    if (isRecordingMeeting) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingMeeting(false);
    } else {
      recordedChunksRef.current = [];
      try {
        // 1. Capture screen/tab stream with audio (captures system audio + other participants + AI voice)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // 2. Mix Display Audio and Local Microphone Audio
        const tracks: MediaStreamTrack[] = [];
        
        // Add video track
        const videoTrack = displayStream.getVideoTracks()[0];
        if (videoTrack) tracks.push(videoTrack);

        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const dest = audioContext.createMediaStreamDestination();
          let hasAudioSources = false;

          // Connect display audio
          if (displayStream.getAudioTracks().length > 0) {
            const displaySource = audioContext.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]]));
            displaySource.connect(dest);
            hasAudioSources = true;
          }

          // Connect local mic audio
          let micStream = localStream;
          if (!micStream || micStream.getAudioTracks().length === 0) {
            try {
              micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (micErr) {
              console.warn('Microphone access not granted for recording mixing:', micErr);
            }
          }

          if (micStream && micStream.getAudioTracks().length > 0) {
            const micSource = audioContext.createMediaStreamSource(new MediaStream([micStream.getAudioTracks()[0]]));
            micSource.connect(dest);
            hasAudioSources = true;
          }

          if (hasAudioSources) {
            const mixedAudioTrack = dest.stream.getAudioTracks()[0];
            if (mixedAudioTrack) tracks.push(mixedAudioTrack);
          } else {
            if (displayStream.getAudioTracks().length > 0) {
              tracks.push(displayStream.getAudioTracks()[0]);
            }
          }
        } catch (audioMixError) {
          console.warn('Failed to mix audio tracks, falling back to display audio', audioMixError);
          if (displayStream.getAudioTracks().length > 0) {
            tracks.push(displayStream.getAudioTracks()[0]);
          }
        }

        const mixedStream = new MediaStream(tracks);
        const options = { mimeType: 'video/webm; codecs=vp9' };
        let recorder: MediaRecorder;
        
        try {
          recorder = new MediaRecorder(mixedStream, options);
        } catch (e) {
          recorder = new MediaRecorder(mixedStream);
        }

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          // Clean up and stop all tracks
          mixedStream.getTracks().forEach(track => track.stop());
          displayStream.getTracks().forEach(track => track.stop());
          
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          sessionStorage.setItem(`meeting_recording_${meetingId}`, url);
        };

        mediaRecorderRef.current = recorder;
        recorder.start(1000);
        setIsRecordingMeeting(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
        alert('Could not start recording. Make sure you select a tab/screen to share and check the "Share audio" checkbox in the browser prompt.');
      }
    }
  };

  const isVoiceCopilotOnRef = useRef(isVoiceCopilotOn);
  useEffect(() => {
    isVoiceCopilotOnRef.current = isVoiceCopilotOn;
  }, [isVoiceCopilotOn]);

  const selectedLanguageRef = useRef(selectedLanguage);
  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);

  const handleAskAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim() || qaLoading || !socketRef.current) return;

    setQaLoading(true);
    socketRef.current.emit(
      'askAiQuestion',
      {
        meetingId,
        question: qaInput.trim(),
        askerName: currentUser?.name || 'User',
        languageCode: selectedLanguageRef.current,
      },
      (response: any) => {
        setQaLoading(false);
        if (response && response.status === 'success') {
          setQaInput('');
        } else {
          alert('AI Copilot was unable to answer the question: ' + (response?.message || 'Unknown error'));
        }
      }
    );
  };

  const handleAskTwinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = twinQuestion.trim();
    if (!query || twinLoading) return;

    setTwinMessages(prev => [...prev, { sender: 'user', text: query }]);
    setTwinQuestion('');
    setTwinLoading(true);

    // Parse query for offline whiteboard commands
    const cleanQ = query.toLowerCase();
    if ((cleanQ.includes('open') || cleanQ.includes('chalu') || cleanQ.includes('dikhaye')) && cleanQ.includes('whiteboard')) {
      setShowWhiteboard(true);
    }
    if ((cleanQ.includes('close') || cleanQ.includes('band')) && cleanQ.includes('whiteboard')) {
      setShowWhiteboard(false);
    }

    try {
      const response = await fetch(`http://localhost:5000/meetings/${meetingId}/ask-twin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: query })
      });
      if (response.ok) {
        const res = await response.json();
        setTwinMessages(prev => [...prev, { sender: 'twin', text: res.answer }]);
        if (res.diagram) {
          setAiDiagram(res.diagram);
          setActiveWhiteboardTab('ai-diagram');
          setShowWhiteboard(true);
        }
      } else {
        setTwinMessages(prev => [...prev, { sender: 'twin', text: 'I apologize, but I encountered an error communicating with the Digital Twin service.' }]);
      }
    } catch (err) {
      console.error(err);
      setTwinMessages(prev => [...prev, { sender: 'twin', text: 'Connection failed. Please check your internet connection.' }]);
    } finally {
      setTwinLoading(false);
    }
  };

  const socketRef = useRef<Socket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Real-time hooks
  const { localStream, remoteStreams } = useWebRTC(
    socketRef.current,
    meetingId,
    isMicOn,
    isVideoOn,
    isScreenSharing,
    () => setIsScreenSharing(false)
  );
  const { interimTranscript } = useSpeechRecognition(
    socketRef.current,
    meetingId,
    isMicOn,
    currentUser?.name || 'Unknown User',
    selectedLanguage,
    !!speakingText
  );

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/meetings/${meetingId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMeetingData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setMeeting(data);
        setTranscripts(data.transcripts || []);
        setActionItems(data.actionItems || []);
        setRisks(data.risks || []);
        setStatus(data.status);
        if (data.status === 'COMPLETED') {
          fetchAnalyticsData();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingData();

    // 1. Establish Socket Connection
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to real-time websocket gateway');
      socket.emit('joinMeeting', { meetingId, name: currentUser?.name });
      socket.emit('getWaitingList', { meetingId }, (res: any) => {
        if (res && res.status === 'success') {
          setWaitingList(res.waitingList);
        }
      });
      socket.emit('getParticipants', { meetingId }, (res: any) => {
        if (res && res.status === 'success') {
          setLiveParticipants(res.participants);
        }
      });
    });

    // 2. Listen to real-time events
    socket.on('participantsUpdated', (list: any[]) => {
      setLiveParticipants(list);
    });

    socket.on('waitingListUpdated', (list: any[]) => {
      setWaitingList(list);
    });

    socket.on('participantWaiting', (p: any) => {
      setWaitingList(prev => {
        if (prev.some(x => x.socketId === p.socketId)) return prev;
        return [...prev, p];
      });
    });

    socket.on('transcriptAdded', (newSegment: any) => {
      setTranscripts((prev) => [...prev, newSegment]);

      // Check text for whiteboard commands
      const cleanText = newSegment.text.toLowerCase();
      if ((cleanText.includes('open') || cleanText.includes('chalu') || cleanText.includes('dikhaye')) && cleanText.includes('whiteboard')) {
        setShowWhiteboard(true);
      }
      if ((cleanText.includes('close') || cleanText.includes('band')) && cleanText.includes('whiteboard')) {
        setShowWhiteboard(false);
      }

      // Check if diagram is present in AI Copilot response
      if (newSegment.diagram) {
        setAiDiagram(newSegment.diagram);
        setActiveWhiteboardTab('ai-diagram');
        setShowWhiteboard(true);
      }

      if (isVoiceCopilotOnRef.current && newSegment.speakerName === 'AI Copilot') {
        // If Sarvam AI TTS audio is embedded in the websocket event, play it directly
        if (newSegment.ttsAudio) {
          playBase64Audio(newSegment.ttsAudio, newSegment.text);
        } else {
          speakText(newSegment.text);
        }
      }
    });

    socket.on('liveAnalysisUpdated', (data: { actionItems: any[]; risks: any[] }) => {
      setActionItems((prev) => {
        if (isVoiceCopilotOnRef.current && data.actionItems.length > prev.length) {
          const newAction = data.actionItems[data.actionItems.length - 1];
          speakText(`I have added a new action item: ${newAction.text}`);
        }
        return data.actionItems;
      });

      setRisks((prev) => {
        if (isVoiceCopilotOnRef.current && data.risks.length > prev.length) {
          const newRisk = data.risks[data.risks.length - 1];
          speakText(`Warning: I detected a new risk: ${newRisk.text}`);
        }
        return data.risks;
      });
    });

    socket.on('actionItemUpdated', (updatedItem: any) => {
      setActionItems((prev) => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    });

    socket.on('meetingEnded', async () => {
      console.log('Meeting was ended by host.');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingMeeting(false);
      setIsMicOn(false);
      setIsVideoOn(false);
      setIsScreenSharing(false);
      if (socketRef.current) {
        socketRef.current.emit('leaveMeeting', { meetingId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setStatus('COMPLETED');
      if (currentUser?.isGuest) {
        onBack();
      } else {
        fetchMeetingData();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveMeeting', { meetingId });
        socketRef.current.disconnect();
      }
    };
  }, [meetingId]);

  // Autoscroll transcript container
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const handleStartMeeting = async () => {
    try {
      const response = await fetch(`http://localhost:5000/meetings/${meetingId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setStatus('ACTIVE');
        setIsMicOn(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndMeeting = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecordingMeeting(false);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/meetings/${meetingId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const updated = await response.json();
        setMeeting(updated);
        setIsMicOn(false);
        setIsVideoOn(false);
        setIsScreenSharing(false);
        if (socketRef.current) {
          socketRef.current.emit('leaveMeeting', { meetingId });
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        setStatus('COMPLETED');
        if (currentUser?.isGuest) {
          onBack();
        } else {
          fetchMeetingData();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const playBase64Audio = async (base64Audio: string, label: string = '') => {
    try {
      setSpeakingText(label || 'AI Copilot is speaking...');
      const audioUrl = `data:audio/wav;base64,${base64Audio}`;
      const audio = new Audio(audioUrl);
      audio.onended = () => setSpeakingText('');
      audio.onerror = () => {
        console.error('Failed to play embedded TTS audio');
        setSpeakingText('');
      };
      await audio.play();
    } catch (err) {
      console.error('Failed to play Sarvam AI TTS audio:', err);
      setSpeakingText('');
    }
  };

  const speakText = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;
    try {
      setSpeakingText(textToSpeak);

      // Try backend Sarvam TTS first if token is available
      if (token) {
        try {
          const response = await fetch('http://localhost:5000/meetings/speak', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              text: textToSpeak,
              languageCode: selectedLanguageRef.current,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.audioContent) {
              const audioUrl = `data:audio/wav;base64,${data.audioContent}`;
              const audio = new Audio(audioUrl);
              audio.onended = () => setSpeakingText('');
              await audio.play();
              return; // Successfully played backend TTS
            }
          }
        } catch (backendErr) {
          console.warn('Backend TTS failed, falling back to Web Speech API:', backendErr);
        }
      }

      // Web Speech API fallback (local browser TTS)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        const voices = window.speechSynthesis.getVoices();
        const lang = selectedLanguageRef.current || 'en-US';
        const matchingVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
        utterance.onend = () => setSpeakingText('');
        utterance.onerror = () => setSpeakingText('');
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeakingText('');
      }
    } catch (err) {
      console.error('Failed to play TTS audio:', err);
      setSpeakingText('');
    }
  };

  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

  const triggerManualAiRef = async () => {
    if (!socketRef.current) return;
    setIsAnalyzingAi(true);
    socketRef.current.emit('triggerManualAnalysis', { meetingId }, () => {
      setIsAnalyzingAi(false);
    });
  };

  if (loading && !meeting) {
    return <p style={{ color: 'var(--text-secondary)', padding: '20px' }}>Loading meeting space...</p>;
  }

  if (!meeting) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '32px' }} className="glass-card">
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Failed to Connect to Meeting</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.5' }}>
          We couldn't fetch the meeting details. The backend server might still be restarting or offline.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to Dashboard
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={fetchMeetingData}>
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div>
      {/* Sarvam AI Voice Speaking Indicator */}
      {speakingText && (
        <div style={{
          position: 'fixed',
          bottom: '28px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(92, 107, 77, 0.95) 0%, rgba(72, 87, 57, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 8px 32px rgba(92, 107, 77, 0.4), 0 0 60px rgba(92, 107, 77, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          animation: 'floatAnimation 3s infinite ease-in-out',
          maxWidth: '500px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            flexShrink: 0,
          }}>
            🤖
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '3px',
            }}>
              Sarvam AI • Speaking
            </div>
            <div style={{
              fontSize: '0.85rem',
              color: '#fff',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {speakingText}
            </div>
          </div>
          <div className="voice-wave-container" style={{ gap: '3px' }}>
            <div className="voice-wave-bar" style={{ background: '#fff', opacity: 0.9, width: '3px' }} />
            <div className="voice-wave-bar" style={{ background: '#fff', opacity: 0.9, width: '3px', animationDelay: '0.15s' }} />
            <div className="voice-wave-bar" style={{ background: '#fff', opacity: 0.9, width: '3px', animationDelay: '0.3s' }} />
            <div className="voice-wave-bar" style={{ background: '#fff', opacity: 0.9, width: '3px', animationDelay: '0.45s' }} />
            <div className="voice-wave-bar" style={{ background: '#fff', opacity: 0.9, width: '3px', animationDelay: '0.6s' }} />
          </div>
        </div>
      )}

      {/* Waiting Room Queue Notification Panel */}
      {waitingList.length > 0 && (
        <div className="glass-card" style={{
          background: 'rgba(92, 107, 77, 0.08)',
          border: '1px solid var(--border-color-glow)',
          boxShadow: '0 0 20px rgba(92, 107, 77, 0.15)',
          padding: '16px 24px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'floatAnimation 6s infinite ease-in-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pulse-indicator" style={{ width: '8px', height: '8px' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Lobby Queue: {waitingList.length} participant{waitingList.length > 1 ? 's are' : ' is'} waiting to join
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Verify names and emails before admitting guests.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px' }}>
            {waitingList.map((p) => (
              <div key={p.socketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', gap: '16px' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '4px 10px', fontSize: '0.75rem', height: 'auto', borderRadius: 'var(--radius-sm)' }}
                    onClick={() => handleApproveParticipant(p.socketId)}
                  >
                    Admit
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.75rem', height: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                    onClick={() => handleRejectParticipant(p.socketId)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <button className="btn btn-secondary" style={{ marginBottom: '16px' }} onClick={onBack}>
            {currentUser?.isGuest ? '← Leave Meeting Room' : '← Back to Dashboard'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ fontSize: '2.2rem' }}>{meeting?.title}</h1>
            <span className={`badge ${
              status === 'ACTIVE' ? 'badge-success' :
              status === 'COMPLETED' ? 'badge-info' : 'badge-warning'
            }`}>
              {status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{meeting?.description}</p>
          
          {status !== 'COMPLETED' && meeting?.code && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
               <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Invite Link:</span>
               <div style={{
                 background: 'rgba(92, 107, 77, 0.06)',
                 padding: '6px 14px',
                 borderRadius: 'var(--radius-sm)',
                 fontSize: '0.8rem',
                 border: '1px solid rgba(92, 107, 77, 0.2)',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '10px',
                 maxWidth: '480px'
               }}>
                 <span style={{ color: 'var(--primary-hover)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                   {getJoinLink()}
                 </span>
                 <button
                   className="btn"
                   style={{
                     padding: '4px 10px',
                     background: copiedInviteLink ? 'rgba(16,185,129,0.12)' : 'rgba(92,107,77,0.12)',
                     color: copiedInviteLink ? 'var(--success)' : 'var(--primary)',
                     border: `1px solid ${copiedInviteLink ? 'rgba(16,185,129,0.3)' : 'rgba(92,107,77,0.3)'}`,
                     borderRadius: 'var(--radius-sm)',
                     fontSize: '0.75rem',
                     fontWeight: 600,
                     flexShrink: 0,
                     display: 'flex',
                     alignItems: 'center',
                     gap: '4px',
                     transition: 'all 0.2s ease'
                   }}
                   onClick={handleCopyInviteLink}
                   title="Copy join link"
                 >
                   <Copy size={12} />
                   {copiedInviteLink ? 'Copied!' : 'Copy Link'}
                 </button>
               </div>
               <button
                 className="btn btn-secondary"
                 style={{
                   padding: '5px 12px',
                   fontSize: '0.78rem',
                   gap: '5px',
                   display: 'flex',
                   alignItems: 'center',
                   border: '1px solid rgba(92,107,77,0.2)',
                   background: 'rgba(92,107,77,0.06)',
                   color: 'var(--primary)',
                 }}
                 onClick={() => setShowEmailModal(true)}
                 title="Send invite via email"
               >
                 <Mail size={13} /> Email Invite
               </button>
               <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Share this link — anyone can join as a guest</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {status === 'SCHEDULED' && (
            <button className="btn btn-primary" onClick={handleStartMeeting} style={{ height: '42px', padding: '0 20px', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
              <Play size={16} /> Start Session
            </button>
          )}

          {status === 'ACTIVE' && (
            <>
              {/* Language Selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Lang:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  style={{
                    width: 'auto',
                    padding: '8px 12px',
                    height: '42px',
                    fontSize: '0.85rem',
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(92, 107, 77, 0.03)',
                    transition: 'var(--transition-smooth)',
                  }}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (हिंदी)</option>
                  <option value="ta-IN">Tamil (தமிழ்)</option>
                  <option value="te-IN">Telugu (తెలుగు)</option>
                  <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                  <option value="bn-IN">Bengali (বাংলা)</option>
                  <option value="mr-IN">Marathi (मराठी)</option>
                  <option value="gu-IN">Gujarati (ગુજરાતી)</option>
                  <option value="pa-IN">Punjabi (ਪੰਜਾਬी)</option>
                  <option value="ml-IN">Malayalam (മലയാളം)</option>
                </select>
              </div>

              {/* Voice Copilot Toggle */}
              <button
                className={`btn ${isVoiceCopilotOn ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsVoiceCopilotOn(!isVoiceCopilotOn)}
                style={{
                  height: '42px',
                  padding: '0 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: isVoiceCopilotOn ? 'none' : '1px solid var(--border-color)',
                  background: isVoiceCopilotOn ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' : 'rgba(255, 255, 255, 0.85)',
                  color: isVoiceCopilotOn ? '#fff' : 'var(--text-primary)',
                }}
                title="Powered by Sarvam AI (bulbul:v3) — When active, AI Copilot speaks out responses, action items and risks live"
              >
                🔊 Sarvam Voice: {isVoiceCopilotOn ? 'ON' : 'OFF'}
              </button>

              <button
                className={`btn ${isRecordingMeeting ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleToggleMeetingRecording}
                style={{
                  height: '42px',
                  padding: '0 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: isRecordingMeeting ? 'none' : '1px solid var(--border-color)',
                  background: isRecordingMeeting ? '#ef4444' : 'rgba(255, 255, 255, 0.85)',
                  color: isRecordingMeeting ? '#fff' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: isRecordingMeeting ? '#fff' : '#ef4444',
                  animation: isRecordingMeeting ? 'pulse 1.2s infinite' : 'none'
                }} />
                {isRecordingMeeting ? 'Stop Recording' : 'Record Meeting'}
              </button>

              <button 
                className={`btn ${isVideoOn ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setIsVideoOn(!isVideoOn)}
                style={{
                  height: '42px',
                  padding: '0 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: isVideoOn ? 'none' : '1px solid var(--border-color)',
                  background: isVideoOn ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' : 'rgba(255, 255, 255, 0.85)',
                  color: isVideoOn ? '#fff' : 'var(--text-primary)',
                }}
              >
                {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
                {isVideoOn ? 'Camera On' : 'Camera Off'}
              </button>
              
              <button 
                className={`btn ${isMicOn ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setIsMicOn(!isMicOn)}
                style={{
                  height: '42px',
                  padding: '0 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: isMicOn ? 'none' : '1px solid var(--border-color)',
                  background: isMicOn ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' : 'rgba(255, 255, 255, 0.85)',
                  color: isMicOn ? '#fff' : 'var(--text-primary)',
                }}
              >
                {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
                {isMicOn ? 'Listening (Live)' : 'Muted'}
              </button>
              
              <button 
                className="btn btn-danger"
                onClick={handleEndMeeting}
                style={{
                  height: '42px',
                  padding: '0 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                <Square size={16} /> End Meeting
              </button>
            </>
          )}
        </div>
      </div>

      {status === 'COMPLETED' ? (
        /* ═══════════════════════════════════════════════════════════════
           REDESIGNED POST-MEETING SUMMARY VIEW — Well Structured Layout
           ═══════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          
          {/* ─── HERO STATS STRIP ─── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '28px',
          }}>
            {/* Health Score */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(92, 107, 77, 0.08) 0%, rgba(92, 107, 77, 0.02) 100%)',
              border: '1px solid rgba(92, 107, 77, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="transparent" stroke="rgba(92,107,77,0.15)" strokeWidth="5"/>
                  <circle cx="28" cy="28" r="22" fill="transparent" stroke="var(--primary)" strokeWidth="5" 
                    strokeDasharray={138.2} 
                    strokeDashoffset={138.2 - (138.2 * (meeting?.summary?.productivityScore || 85)) / 100} 
                    strokeLinecap="round" 
                    transform="rotate(-90 28 28)"
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                  <text x="28" y="32" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="700">{meeting?.summary?.productivityScore || 85}</text>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Health Score</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{meeting?.summary?.productivityScore || 85}/100</div>
              </div>
            </div>

            {/* Action Items Count */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CheckSquare size={24} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Action Items</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{actionItems.length} Tasks</div>
              </div>
            </div>

            {/* Risks Count */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Risks Detected</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{risks.length} {risks.length === 1 ? 'Risk' : 'Risks'}</div>
              </div>
            </div>

            {/* Transcript Lines */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.08) 0%, rgba(123, 104, 238, 0.02) 100%)',
              border: '1px solid rgba(123, 104, 238, 0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'rgba(123, 104, 238, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FileText size={24} style={{ color: '#a294f9' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>Transcript</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{transcripts.length} Lines</div>
              </div>
            </div>
          </div>

          {/* ─── ACTION BAR ─── */}
          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            padding: '14px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            marginBottom: '28px',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
              <Sparkles size={16} style={{ color: 'var(--secondary)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Quick Actions</span>
            </div>
            
            {meeting?.summary?.overview && (
              <button
                className="btn btn-secondary"
                onClick={() => speakText(meeting.summary.overview)}
                style={{ gap: '6px', fontSize: '0.82rem', padding: '8px 16px' }}
                disabled={speakingText === meeting.summary.overview}
              >
                🔊 {speakingText === meeting.summary.overview ? 'Speaking...' : 'Listen to Summary'}
              </button>
            )}
            
            {recordedVideoUrl && (
              <button 
                onClick={handleSaveRecordingToDashboard}
                disabled={isSavingRecording}
                className="btn btn-secondary" 
                style={{ gap: '6px', fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center' }} 
              >
                {isSavingRecording ? (
                  <>
                    <span 
                      style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid currentColor',
                        borderRightColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                    Saving Recording...
                  </>
                ) : (
                  <>
                    <Video size={14} style={{ color: 'var(--success)' }} /> Save Recording
                  </>
                )}
              </button>
            )}
            
            <button className="btn btn-secondary" style={{ gap: '6px', fontSize: '0.82rem', padding: '8px 16px' }} onClick={handleScheduleFollowup}>
              <Calendar size={14} style={{ color: 'var(--primary)' }} /> Schedule Follow-up
            </button>
            
            <button className="btn btn-secondary" style={{ gap: '6px', fontSize: '0.82rem', padding: '8px 16px' }} onClick={handleEmailSummary}>
              <Mail size={14} style={{ color: 'var(--secondary)' }} /> Email Minutes
            </button>
            
            <button className="btn btn-primary" style={{ gap: '6px', fontSize: '0.82rem', padding: '8px 16px' }} onClick={handleDownloadPDF}>
              <FileText size={14} /> Export PDF
            </button>
          </div>

          {/* ─── SECTION 1: AI SUMMARY & KEY INSIGHTS ─── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(92, 107, 77, 0.04) 0%, rgba(92, 107, 77, 0.01) 100%)',
            border: '1px solid rgba(92, 107, 77, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 32px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(92, 107, 77, 0.3)',
              }}>
                <Clock size={18} style={{ color: '#fff' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 700 }}>AI Summary & Minutes</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Generated by Sarvam AI</p>
              </div>
            </div>
            
            <p style={{ color: 'var(--text-primary)', lineHeight: '1.7', marginBottom: '24px', fontSize: '0.95rem', maxWidth: '900px' }}>
              {meeting?.summary?.overview || 'No transcript available for this meeting. Start a meeting and speak to generate AI-powered summaries.'}
            </p>

            {/* Decisions / Next Steps / Takeaways — 3 Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {/* Key Decisions */}
              <div style={{
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Key Decisions</h3>
                </div>
                <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                  {meeting?.summary?.keyDecisions ? (
                    JSON.parse(meeting.summary.keyDecisions).length > 0 ? (
                      JSON.parse(meeting.summary.keyDecisions).map((decision: string, idx: number) => (
                        <li key={idx}>{decision}</li>
                      ))
                    ) : (
                      <li style={{ color: 'var(--text-muted)', listStyle: 'none', marginLeft: '-16px' }}>No decisions recorded.</li>
                    )
                  ) : (
                    <li style={{ color: 'var(--text-muted)', listStyle: 'none', marginLeft: '-16px' }}>No decisions recorded.</li>
                  )}
                </ul>
              </div>

              {/* Next Steps */}
              <div style={{
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🚀</span>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Next Steps</h3>
                </div>
                <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                  {meeting?.summary?.nextSteps ? (
                    JSON.parse(meeting.summary.nextSteps).length > 0 ? (
                      JSON.parse(meeting.summary.nextSteps).map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))
                    ) : (
                      <li style={{ color: 'var(--text-muted)', listStyle: 'none', marginLeft: '-16px' }}>No next steps recorded.</li>
                    )
                  ) : (
                    <li style={{ color: 'var(--text-muted)', listStyle: 'none', marginLeft: '-16px' }}>No next steps recorded.</li>
                  )}
                </ul>
              </div>

              {/* Key Takeaways */}
              <div style={{
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '1.1rem' }}>💡</span>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Key Takeaways</h3>
                </div>
                <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                  {meeting?.summary?.keyTakeaways ? (
                    JSON.parse(meeting.summary.keyTakeaways).map((takeaway: string, idx: number) => (
                      <li key={idx}>{takeaway}</li>
                    ))
                  ) : (
                    <li style={{ color: 'var(--text-muted)', listStyle: 'none', marginLeft: '-16px' }}>No takeaways because there was no discussion.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Collaboration Index Bar */}
            {meeting?.summary && (
              <div style={{
                marginTop: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Team Collaboration Index:</span>
                <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '9999px', overflow: 'hidden', maxWidth: '200px' }}>
                  <div style={{ width: `${meeting.summary.productivityScore}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--success) 100%)', borderRadius: '9999px', transition: 'width 1s ease' }} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>{meeting.summary.productivityScore}/100</span>
              </div>
            )}
          </div>

          {/* ─── SECTION 3: MEETING RECORDING PLAYBACK ─── */}
          <div id="recording-section" style={{
            background: 'linear-gradient(135deg, rgba(24, 40, 72, 0.04) 0%, rgba(24, 40, 72, 0.01) 100%)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 32px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(92, 107, 77, 0.3)',
              }}>
                <Video size={18} style={{ color: '#fff' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 700 }}>Meeting Recording</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Watch the session recording</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {recordedVideoUrl ? (
                <>
                  <div style={{ flex: 1, minWidth: '320px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <video 
                      src={recordedVideoUrl} 
                      controls 
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700 }}>Recording Info</h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div>
                          <strong>Status:</strong>{' '}
                          {localStorage.getItem(`saved_meeting_rec_${meetingId}`) === 'true' ? (
                            <span style={{ color: 'var(--success)' }}>● Saved Successfully</span>
                          ) : (
                            <span style={{ color: 'var(--warning)' }}>● Unsaved Buffer</span>
                          )}
                        </div>
                        <div><strong>Duration:</strong> {meeting?.duration ? `${Math.floor(meeting.duration / 60)}m ${meeting.duration % 60}s` : '3m 12s'}</div>
                        <div><strong>Format:</strong> WebM (1080p)</div>
                      </div>
                    </div>
                    <a 
                      href={recordedVideoUrl} 
                      download={`meeting_recording_${meetingId}.webm`}
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', gap: '8px', textDecoration: 'none', padding: '10px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}
                    >
                      📥 Download Recording
                    </a>
                  </div>
                </>
              ) : (
                <div style={{
                  flex: 1,
                  padding: '40px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.4)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)',
                  width: '100%',
                }}>
                  <Video size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Video Recording Available</h3>
                  <p style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                    No video recording was captured during this meeting session. 
                    You can record future meetings using the "Record Meeting" button in the control bar.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── SECTION 2: ACTION ITEMS & RISKS (Side by Side) ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            
            {/* Action Items */}
            <div style={{
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0.01) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}>
                  <CheckSquare size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Action Items</h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{actionItems.length} tasks extracted</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {actionItems.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                    <CheckSquare size={28} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '8px' }} />
                    <div>No action items extracted.</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Action items will appear here once AI analyzes the transcript.</div>
                  </div>
                ) : (
                  actionItems.map((item, idx) => (
                    <div key={item.id} style={{
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid var(--border-color)',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s ease',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                        <span style={{
                          width: '22px', height: '22px', borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--success)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                        }}>{idx + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: '1.4' }}>{item.text}</div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <select
                              value={item.assigneeName || ''}
                              onChange={(e) => {
                                if (socketRef.current) {
                                  socketRef.current.emit('updateActionItem', {
                                    meetingId,
                                    actionItemId: item.id,
                                    assigneeName: e.target.value,
                                  });
                                }
                              }}
                              style={{
                                background: 'rgba(92, 107, 77, 0.1)',
                                color: 'var(--primary-hover)',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: 'none',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">👤 Unassigned</option>
                              {liveParticipants.map((p: any) => (
                                <option key={p.socketId} value={p.name}>👤 {p.name}</option>
                              ))}
                              {item.assigneeName && !liveParticipants.some((p: any) => p.name === item.assigneeName) && (
                                <option value={item.assigneeName}>👤 {item.assigneeName}</option>
                              )}
                            </select>
                            <span style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              color: '#f59e0b',
                              padding: '2px 10px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                            }}>📅 {formatDueDate(item.dueDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sync controls */}
                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sync:</span>
                        {item.externalUrl ? (
                          <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: 'rgba(123, 104, 238, 0.12)', color: '#a294f9',
                            border: '1px solid rgba(123, 104, 238, 0.3)',
                            borderRadius: '9999px', padding: '3px 10px', fontSize: '0.7rem',
                            textDecoration: 'none', fontWeight: 600,
                          }}>
                            <ExternalLink size={10} /> {item.externalPlatform?.toUpperCase() || 'EXTERNAL'}
                          </a>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.7rem', height: 'auto', borderRadius: '9999px', background: 'rgba(255,255,255,0.5)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            onClick={() => handleSyncTask(item.id, 'clickup')}
                            disabled={syncingTaskId === item.id}
                          >
                            Sync to ClickUp
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Risks & Blockers */}
            <div style={{
              border: '1px solid rgba(245, 158, 11, 0.15)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(245, 158, 11, 0.01) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}>
                  <AlertTriangle size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Risks & Blockers</h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{risks.length} risks identified</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {risks.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                    <AlertTriangle size={28} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '8px' }} />
                    <div>No risks detected. 🎉</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>AI found no blockers or risks in this meeting.</div>
                  </div>
                ) : (
                  risks.map((risk) => (
                    <div key={risk.id} style={{
                      display: 'flex', gap: '12px', alignItems: 'center',
                      background: risk.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.06)' : risk.severity === 'MEDIUM' ? 'rgba(245, 158, 11, 0.06)' : 'rgba(255,255,255,0.4)',
                      border: '1px solid',
                      borderColor: risk.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.25)' : risk.severity === 'MEDIUM' ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-color)',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s ease',
                    }}>
                      <AlertCircle size={18} style={{ color: risk.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: '1.4' }}>{risk.text}</div>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        padding: '3px 10px', borderRadius: '9999px',
                        background: risk.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.12)' : risk.severity === 'MEDIUM' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0,0,0,0.04)',
                        color: risk.severity === 'HIGH' ? 'var(--danger)' : risk.severity === 'MEDIUM' ? '#d97706' : 'var(--text-secondary)',
                        border: `1px solid ${risk.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : risk.severity === 'MEDIUM' ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-color)'}`,
                        flexShrink: 0,
                      }}>
                        {risk.severity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ─── SECTION 3: ANALYTICS & SENTIMENT + HEALTH BREAKDOWN ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '20px' }}>
            
            {/* Speaker Participation & Sentiment */}
            <div style={{
              border: '1px solid rgba(123, 104, 238, 0.15)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.04) 0%, rgba(123, 104, 238, 0.01) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7b68ee 0%, #6c5ce7 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                }}>
                  <BarChart2 size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Participation & Emotion Analysis</h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>AI-powered speaker analytics</p>
                </div>
              </div>

              {analytics && analytics.talkTimeDistribution && Object.keys(analytics.talkTimeDistribution).length > 0 ? (() => {
                const distribution = analytics.talkTimeDistribution;
                const totalSecs = Object.values(distribution).reduce((a: any, b: any) => a + b, 0) as number || 1;
                const sortedSpeakers = Object.entries(distribution).sort((a: any, b: any) => b[1] - a[1]);
                const primarySpeaker = sortedSpeakers[0] ? sortedSpeakers[0][0] : 'None';
                
                const allParticipants = liveParticipants.map(p => p.name).filter(Boolean);
                const activeSpeakers = Object.keys(distribution);
                const silentSpeakers = allParticipants.filter(p => !activeSpeakers.includes(p) || distribution[p] < 5);

                let turnTransitions = 0;
                for (let i = 1; i < transcripts.length; i++) {
                  if (transcripts[i].speakerName !== transcripts[i-1].speakerName) {
                    turnTransitions++;
                  }
                }
                const interruptions = Math.max(1, Math.round((analytics.engagementScore || 85) * turnTransitions / 120));

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Talk time bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {sortedSpeakers.map(([name, secs]: [string, any]) => {
                        const percentage = Math.round((secs / totalSecs) * 100);
                        const sentiment = analytics.speakerSentiment?.[name] || 'Neutral';
                        const barColors = ['#6e8b3d', '#06b9d4', '#10b981', '#ec4899', '#f59e0b'];
                        const barColor = barColors[sortedSpeakers.findIndex(s => s[0] === name) % barColors.length];
                        return (
                          <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '28px', height: '28px', borderRadius: '8px',
                                  background: `${barColor}20`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.75rem', fontWeight: 700, color: barColor,
                                }}>{name.charAt(0).toUpperCase()}</div>
                                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 500 }}>{percentage}% • {secs}s</span>
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 700,
                                  background: sentiment === 'Positive' ? 'rgba(110, 139, 61, 0.1)' : sentiment === 'Concerned' ? 'rgba(179, 57, 57, 0.08)' : 'rgba(0,0,0,0.03)',
                                  color: sentiment === 'Positive' ? 'var(--success)' : sentiment === 'Concerned' ? 'var(--danger)' : 'var(--text-secondary)',
                                  padding: '2px 8px', borderRadius: '9999px',
                                  border: `1px solid ${sentiment === 'Positive' ? 'rgba(110, 139, 61, 0.25)' : sentiment === 'Concerned' ? 'rgba(179, 57, 57, 0.2)' : 'rgba(0,0,0,0.08)'}`,
                                }}>
                                  {sentiment === 'Positive' ? '😊' : sentiment === 'Concerned' ? '⚠️' : '😐'} {sentiment}
                                </span>
                              </div>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.04)', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ width: `${percentage}%`, height: '100%', background: barColor, borderRadius: '9999px', transition: 'width 0.8s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Insights Strip */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px',
                      borderTop: '1px dashed var(--border-color)', paddingTop: '14px',
                    }}>
                      <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        📣 <strong>Most Active:</strong> {primarySpeaker}
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        🗣️ <strong>Speaker Turns:</strong> {turnTransitions}
                      </div>
                      {silentSpeakers.length > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                          🤫 <strong>Quiet:</strong> {silentSpeakers.join(', ')}
                        </div>
                      )}
                      <div style={{ background: 'rgba(255,255,255,0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        ⚔️ <strong>Interruptions:</strong> {interruptions} overlaps
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                  <BarChart2 size={28} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '8px' }} />
                  <div>No participation analytics available yet.</div>
                </div>
              )}
            </div>

            {/* Meeting Health Breakdown */}
            <div style={{
              border: '1px solid rgba(92, 107, 77, 0.15)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(92, 107, 77, 0.04) 0%, rgba(92, 107, 77, 0.01) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(92, 107, 77, 0.3)',
                }}>
                  <Sparkles size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Health Breakdown</h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>AI meeting quality metrics</p>
                </div>
              </div>

              {/* Large Score Display */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(92,107,77,0.1)" strokeWidth="8"/>
                    <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--primary)" strokeWidth="8" 
                      strokeDasharray={314} 
                      strokeDashoffset={314 - (314 * (meeting?.summary?.productivityScore || 85)) / 100} 
                      strokeLinecap="round" 
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                    <text x="60" y="55" textAnchor="middle" fill="var(--text-primary)" fontSize="26" fontWeight="700">{meeting?.summary?.productivityScore || 85}</text>
                    <text x="60" y="72" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="500">out of 100</text>
                  </svg>
                </div>
              </div>

              {/* Metric Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Time Management', emoji: '⏱️', score: 88 },
                  { label: 'Engagement', emoji: '🤝', score: analytics?.engagementScore || 90 },
                  { label: 'Decision Clarity', emoji: '💡', score: Math.min(100, 80 + (JSON.parse(meeting?.summary?.keyDecisions || '[]').length * 5)) },
                  { label: 'Task Coverage', emoji: '✅', score: 100 },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{metric.emoji} {metric.label}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{metric.score}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${metric.score}%`, height: '100%',
                        background: metric.score >= 80 ? 'var(--success)' : metric.score >= 50 ? 'var(--warning)' : 'var(--danger)',
                        borderRadius: '9999px', transition: 'width 1s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Engagement Badge */}
              {analytics?.engagementScore && (
                <div style={{
                  marginTop: '16px',
                  padding: '10px 16px',
                  background: analytics.engagementScore >= 80 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${analytics.engagementScore >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: analytics.engagementScore >= 80 ? 'var(--success)' : 'var(--warning)',
                }}>
                  {analytics.engagementScore >= 80 ? '🟢 Highly Productive Meeting' : '🟡 Moderate Engagement'}
                </div>
              )}
            </div>
          </div>

          {/* ─── SECTION 4: AI DIGITAL TWIN + TRANSCRIPT (Side by Side) ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* AI Digital Twin */}
            <div style={{
              border: '1px solid rgba(245, 158, 11, 0.15)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(245, 158, 11, 0.01) 100%)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '520px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}>
                  <Sparkles size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>AI Digital Twin</h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Ask anything about the meeting</p>
                </div>
              </div>

              {/* Messages */}
              <div style={{ 
                flex: 1, overflowY: 'auto', 
                display: 'flex', flexDirection: 'column', gap: '10px', 
                marginBottom: '12px', 
                background: 'rgba(255,255,255,0.3)', 
                padding: '12px', borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)',
              }}>
                {twinMessages.map((msg, index) => (
                  <div key={index} style={{
                    maxWidth: '85%', padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    fontSize: '0.85rem', lineHeight: '1.4',
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' : 'rgba(255, 255, 255, 0.85)',
                    color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {msg.sender === 'user' ? 'You' : '🤖 AI Digital Twin'}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                ))}
                {twinLoading && (
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px',
                    borderRadius: '12px 12px 12px 2px', fontSize: '0.85rem',
                    alignSelf: 'flex-start',
                    background: 'rgba(255, 255, 255, 0.85)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span className="pulse-indicator active" style={{ width: '6px', height: '6px', margin: 0 }} />
                    Twin is thinking...
                  </div>
                )}
              </div>

              <form onSubmit={handleAskTwinSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text" className="input-field"
                  placeholder="Ask the Digital Twin..."
                  value={twinQuestion} onChange={(e) => setTwinQuestion(e.target.value)}
                  style={{ flex: 1, fontSize: '0.82rem' }} disabled={twinLoading}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 14px', height: '40px', fontSize: '0.82rem' }} disabled={twinLoading}>
                  <Send size={14} /> Ask
                </button>
              </form>
            </div>

            {/* Transcript Log */}
            <div style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              maxHeight: '520px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(100, 116, 139, 0.3)',
                }}>
                  <FileText size={18} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Transcript Log</h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{transcripts.length} entries recorded</p>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {transcripts.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                    <FileText size={28} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '8px' }} />
                    <div>No transcript available for this meeting.</div>
                  </div>
                ) : (
                  transcripts.map((t, index) => (
                    <div key={index} style={{
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.4)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      transition: 'all 0.2s ease',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: 'var(--primary)', flexShrink: 0,
                        }} />
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--primary)' }}>{t.speakerName}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.5', paddingLeft: '12px' }}>{t.text}</div>
                      {t.translation && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '4px', opacity: 0.85, paddingLeft: '12px' }}>
                          🌐 {t.translation}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIVE MEETING VIEW (ACTIVE / SCHEDULED) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Pinned Participant Stage */}
          {pinnedParticipantId && (() => {
            const colors = ['rgba(92, 107, 77, 0.85)', 'rgba(6, 185, 212, 0.85)', 'rgba(16, 185, 129, 0.85)', 'rgba(236, 72, 153, 0.85)'];
            const realUsers = liveParticipants.map((p, i) => ({
              id: p.socketId,
              name: p.name || 'Unknown User',
              role: p.name === currentUser?.name ? 'Host (You)' : 'Participant',
              color: colors[i % colors.length],
              isLocal: p.name === currentUser?.name
            }));
            const aiCopilot = {
              id: 'ai-copilot',
              name: 'AI Copilot',
              role: 'Agent Assistant',
              color: 'rgba(245, 158, 11, 0.85)',
              isLocal: false
            };
            const displayParticipants = [...realUsers, aiCopilot];
            const pinnedParticipant = displayParticipants.find(p => p.id === pinnedParticipantId);

            if (!pinnedParticipant) return null;

            // Compute style properties based on videoLayoutMode
            let containerStyle: React.CSSProperties = {
              width: '100%',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid var(--border-color-glow)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '10px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            };

            if (videoLayoutMode === 'mini') {
              containerStyle = {
                ...containerStyle,
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                width: '340px',
                height: '192px',
                zIndex: 9999,
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                border: '1.5px solid var(--primary)',
                borderRadius: '12px',
                marginBottom: '0px'
              };
            } else if (videoLayoutMode === 'theater') {
              containerStyle = {
                ...containerStyle,
                height: '560px',
                background: '#000',
                border: 'none',
                borderRadius: '0px',
                margin: '0 -24px 20px -24px',
                width: 'calc(100% + 48px)'
              };
            } else {
              // Standard / Default mode
              containerStyle = {
                ...containerStyle,
                height: '420px'
              };
            }

            const toggleFullscreen = () => {
              const element = document.getElementById('pinned-stage-container');
              if (element) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  element.requestFullscreen().catch(err => {
                    console.error("Error entering fullscreen", err);
                  });
                }
              }
            };

            return (
              <div 
                id="pinned-stage-container"
                className="glass-card" 
                style={containerStyle}
              >
                <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16' }}>
                  {pinnedParticipant.isLocal && localStream ? (
                    <video 
                      ref={v => { if (v) v.srcObject = localStream; }} 
                      autoPlay 
                      muted 
                      style={{ width: '100%', height: '100%', objectFit: videoFitMode }} 
                    />
                  ) : !pinnedParticipant.isLocal && remoteStreams[pinnedParticipant.id] ? (
                    <video 
                      ref={v => { if (v) v.srcObject = remoteStreams[pinnedParticipant.id]; }} 
                      autoPlay 
                      style={{ width: '100%', height: '100%', objectFit: videoFitMode }} 
                    />
                  ) : (
                    <div style={{
                      width: '110px',
                      height: '110px',
                      borderRadius: '50%',
                      background: pinnedParticipant.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      boxShadow: '0 0 30px rgba(255,255,255,0.1)',
                      border: '3px solid rgba(255,255,255,0.2)'
                    }}>
                      {pinnedParticipant.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                  )}

                  {/* Floating Options Dropdown Menu */}
                  {showStageOptionsMenu && (
                    <div style={{
                      position: 'absolute',
                      bottom: '56px',
                      right: '72px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      width: '180px',
                      padding: '6px 0',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                      zIndex: 25,
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      {/* Screen Share Toggle */}
                      <button
                        onClick={() => {
                          setIsScreenSharing(!isScreenSharing);
                          setShowStageOptionsMenu(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          padding: '10px 16px',
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s',
                          width: '100%',
                          fontWeight: 500
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {isScreenSharing ? (
                          <>
                            <MonitorOff size={14} style={{ color: 'var(--danger)' }} />
                            <span>Stop Share</span>
                          </>
                        ) : (
                          <>
                            <Monitor size={14} style={{ color: 'var(--primary-hover)' }} />
                            <span>Share Screen</span>
                          </>
                        )}
                      </button>

                      {/* Whiteboard Toggle */}
                      <button
                        onClick={() => {
                          setShowWhiteboard(!showWhiteboard);
                          setShowStageOptionsMenu(false);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          padding: '10px 16px',
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'background 0.2s',
                          width: '100%',
                          fontWeight: 500
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <PenTool size={14} style={{ color: '#a294f9' }} />
                        <span>{showWhiteboard ? 'Close Board' : 'Whiteboard'}</span>
                      </button>
                    </div>
                  )}

                  {/* YouTube-Style Controls Overlay */}
                  <div className="youtube-controls" style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '48px',
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    opacity: 0.95,
                    transition: 'opacity 0.2s',
                    zIndex: 15,
                    pointerEvents: 'auto'
                  }}>
                    {/* Left: Info Label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>{pinnedParticipant.name}</span>
                      <span style={{ 
                        background: 'rgba(92, 107, 77, 0.4)', 
                        color: 'var(--primary-hover)', 
                        padding: '1px 8px', 
                        borderRadius: '9999px', 
                        fontSize: '0.62rem', 
                        fontWeight: 700 
                      }}>
                        {pinnedParticipant.role}
                      </span>
                    </div>

                    {/* Right: Controls (Miniplayer, Theater, Fullscreen, Close) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {/* Miniplayer */}
                      <button
                        onClick={() => setVideoLayoutMode(videoLayoutMode === 'mini' ? 'standard' : 'mini')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: videoLayoutMode === 'mini' ? 'var(--primary-hover)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.2s',
                          padding: '4px'
                        }}
                        title={videoLayoutMode === 'mini' ? 'Expand player' : 'Miniplayer'}
                      >
                        <PictureInPicture size={18} />
                      </button>

                      {/* Theater Mode */}
                      <button
                        onClick={() => setVideoLayoutMode(videoLayoutMode === 'theater' ? 'standard' : 'theater')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: videoLayoutMode === 'theater' ? 'var(--primary-hover)' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.2s',
                          padding: '4px'
                        }}
                        title={videoLayoutMode === 'theater' ? 'Default view' : 'Theater mode'}
                      >
                        <Tv size={18} />
                      </button>

                      {/* Fullscreen */}
                      <button
                        onClick={toggleFullscreen}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.2s',
                          padding: '4px'
                        }}
                        title="Fullscreen"
                      >
                        <Maximize size={18} />
                      </button>

                      {/* Zoom fit/fill toggler */}
                      <button
                        onClick={() => setVideoFitMode(videoFitMode === 'cover' ? 'contain' : 'cover')}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        title="Toggle view: Fill (Cover) vs Fit (Contain)"
                      >
                        {videoFitMode === 'cover' ? 'Fit Screen' : 'Fill Screen'}
                      </button>

                      {/* More Options (3-dots) */}
                      <button
                        onClick={() => setShowStageOptionsMenu(!showStageOptionsMenu)}
                        style={{
                          background: showStageOptionsMenu ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          padding: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => { if (!showStageOptionsMenu) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                        onMouseOut={(e) => { if (!showStageOptionsMenu) e.currentTarget.style.background = 'transparent'; }}
                        title="More options"
                      >
                        <MoreVertical size={18} />
                      </button>

                      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

                      {/* Close Enlarged Stage */}
                      <button
                        onClick={() => setPinnedParticipantId(null)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.7)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.2s',
                          padding: '4px'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; }}
                        title="Close pin"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Participant Call Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '20px'
          }}>
            {(() => {
              let displayParticipants: any[] = [];
              const colors = ['rgba(92, 107, 77, 0.85)', 'rgba(6, 185, 212, 0.85)', 'rgba(16, 185, 129, 0.85)', 'rgba(236, 72, 153, 0.85)'];
              const realUsers = liveParticipants.map((p, i) => ({
                id: p.socketId,
                name: p.name || 'Unknown User',
                role: p.name === currentUser?.name ? 'Host (You)' : 'Participant',
                color: colors[i % colors.length],
                avatarGlow: `0 0 16px ${colors[i % colors.length].replace('0.85', '0.4')}`,
                isLocal: p.name === currentUser?.name
              }));
              const aiCopilot = {
                id: 'ai-copilot',
                name: 'AI Copilot',
                role: 'Agent Assistant',
                color: 'rgba(245, 158, 11, 0.85)',
                avatarGlow: '0 0 16px rgba(245, 158, 11, 0.4)',
                isLocal: false
              };
              displayParticipants = [...realUsers, aiCopilot];

              return displayParticipants.map(p => {
                const lastTranscript = transcripts[transcripts.length - 1];
                const isLastSpeaker = status === 'ACTIVE' && lastTranscript && lastTranscript.speakerName === p.name;
                const isAiSpeaking = p.name === 'AI Copilot' && speakingText !== '';
                const isSpeaking = isLastSpeaker || isAiSpeaking;
                const hasStream = p.isLocal ? !!localStream : !!remoteStreams[p.id];
                const isPinned = pinnedParticipantId === p.id;

                return (
                  <div 
                    key={p.name}
                    className="glass-card glow-card"
                    onClick={() => {
                      if (isPinned) {
                        setPinnedParticipantId(null);
                      } else {
                        setPinnedParticipantId(p.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: hasStream ? '16px' : '24px 16px',
                      textAlign: 'center',
                      position: 'relative',
                      border: '1px solid',
                      borderColor: isPinned ? 'var(--primary-hover)' : isSpeaking ? 'var(--primary)' : 'var(--border-color)',
                      boxShadow: isPinned ? '0 0 25px rgba(92, 107, 77, 0.2)' : isSpeaking ? '0 0 20px rgba(92, 107, 77, 0.15)' : 'var(--shadow-premium)',
                      background: isPinned ? 'rgba(92, 107, 77, 0.08)' : isSpeaking ? 'rgba(92, 107, 77, 0.04)' : 'var(--bg-card)',
                      transition: 'var(--transition-smooth)',
                      transform: isSpeaking ? 'scale(1.03)' : 'scale(1)',
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => {
                      if (!isSpeaking && !isPinned) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'var(--border-color-glow)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSpeaking && !isPinned) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }
                    }}
                    title={isPinned ? 'Click to unpin' : 'Click to enlarge view'}
                  >
                    {isPinned && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        zIndex: 5
                      }}>
                        Enlarged
                      </span>
                    )}

                    {hasStream ? (
                      <div style={{
                        width: '100%',
                        height: '130px',
                        borderRadius: 'var(--radius-md)',
                        background: '#000',
                        marginBottom: '12px',
                        boxShadow: isSpeaking ? `0 0 20px var(--primary)` : p.avatarGlow,
                        transition: 'var(--transition-smooth)',
                        border: '1.5px solid rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        {p.isLocal && localStream ? (
                          <video 
                            ref={v => { if (v) v.srcObject = localStream; }} 
                            autoPlay 
                            muted 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : !p.isLocal && remoteStreams[p.id] ? (
                          <video 
                            ref={v => { if (v) v.srcObject = remoteStreams[p.id]; }} 
                            autoPlay 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: p.color,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        marginBottom: '12px',
                        boxShadow: isSpeaking ? `0 0 20px var(--primary)` : p.avatarGlow,
                        transition: 'var(--transition-smooth)',
                        border: '2px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden'
                      }}>
                        {p.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                    )}
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{p.role}</div>

                    {isSpeaking ? (
                      <div style={{
                        marginTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <div className="voice-wave-container">
                          <div className="voice-wave-bar" />
                          <div className="voice-wave-bar" />
                          <div className="voice-wave-bar" />
                          <div className="voice-wave-bar" />
                        </div>
                        <span style={{
                          fontSize: '0.65rem',
                          color: 'var(--primary-hover)',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          marginTop: '4px'
                        }}>
                          SPEAKING
                        </span>
                      </div>
                    ) : (
                      <div style={{ height: '38px', marginTop: '12px' }} />
                    )}
                  </div>
                );
              });
            })()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '28px' }}>
            
            {/* REALTIME TRANSCRIPT FEED */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} style={{ color: 'var(--secondary)' }} /> Real-time Transcript
              </span>
              {status === 'ACTIVE' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div className="pulse-indicator active" /> Recording Live...
                </div>
              )}
            </h2>

            {/* Transcript scroll box */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px', marginBottom: '20px' }}>
              {transcripts.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Mic size={40} style={{ opacity: 0.15, marginBottom: '12px' }} />
                  <p>Transcript will appear here once meeting starts and participants speak.</p>
                </div>
              ) : (
                transcripts.map((t, index) => (
                  <div key={index} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    maxWidth: '85%',
                    alignSelf: 'flex-start'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '4px' }}>{t.speakerName}</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.4' }}>{t.text}</div>
                    {t.translation && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '4px', opacity: 0.85 }}>
                        🌐 Translation: {t.translation}
                      </div>
                    )}
                  </div>
                ))
              )}
              {interimTranscript && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    maxWidth: '85%',
                    alignSelf: 'flex-start',
                    opacity: 0.7
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '4px' }}>{currentUser?.name}</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.4', fontStyle: 'italic' }}>{interimTranscript}...</div>
                  </div>
              )}
              <div ref={transcriptEndRef} />
            </div>

          </div>

          {/* REALTIME COPILOT ALERTS SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Realtime Action Items Checklist */}
            <div className="glass-card" style={{ flex: 1, minHeight: '230px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={18} style={{ color: 'var(--success)' }} /> Action Items (Live)
                </span>
                {status === 'ACTIVE' && (
                  <button onClick={triggerManualAiRef} disabled={isAnalyzingAi} className="btn" style={{ padding: '4px', background: 'transparent', color: isAnalyzingAi ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.2s' }} title="Force recalculate">
                    <RefreshCw size={14} className={isAnalyzingAi ? 'spin' : ''} />
                  </button>
                )}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                {actionItems.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {isAnalyzingAi ? 'Analyzing transcript...' : 'No action items detected in the current transcript yet. Keep talking!'}
                  </p>
                ) : (
                  actionItems.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <input type="checkbox" checked={item.status === 'COMPLETED'} readOnly style={{ marginTop: '2px' }} />
                      <div style={{ fontSize: '0.85rem' }}>
                        <div>{item.text}</div>
                        {item.assigneeName && <strong style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>@{item.assigneeName}</strong>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Realtime Risks */}
            <div className="glass-card" style={{ flex: 1, minHeight: '230px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)' }} /> Live Risks/Blockers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                {risks.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI automatically detects blockers, resource constraints, and timeline shifts.</p>
                ) : (
                  risks.map((risk) => (
                    <div key={risk.id} style={{ display: 'flex', gap: '10px', background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.15)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '0.85rem' }}>
                        <div>{risk.text}</div>
                        <span className="badge badge-danger" style={{ fontSize: '0.6rem', marginTop: '4px', padding: '2px 6px' }}>{risk.severity}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Direct Q&A to AI Copilot */}
            <div className="glass-card" style={{ flex: 1, minHeight: '230px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--primary)' }} /> Ask AI Copilot
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Type a question about the meeting discussion, decisions, or ask the AI to explain a status.
              </p>
              
              <form onSubmit={handleAskAiSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <textarea
                  className="input-field"
                  placeholder="Ask me anything... (e.g. What did we decide?)"
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  rows={2}
                  style={{ resize: 'none', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                  disabled={qaLoading}
                  required
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', gap: '6px', fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={qaLoading}
                >
                  {qaLoading ? (
                    <>
                      <span className="pulse-indicator active" style={{ width: '6px', height: '6px', margin: 0 }} />
                      AI Copilot is thinking...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Ask Copilot
                    </>
                  )}
                </button>
              </form>
            </div>


          </div>

        </div>
      </div>
      )}
      
      {/* Whiteboard Overlay (Scratchpad / AI Diagram Canvas) */}
      {showWhiteboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9998,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <h2 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PenTool size={20} style={{ color: 'var(--secondary)' }} /> Meeting Scratchpad
              </h2>
              
              {/* Tab Selector */}
              <div style={{ 
                display: 'flex', 
                gap: '4px', 
                background: 'rgba(255,255,255,0.06)', 
                padding: '4px', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid rgba(255,255,255,0.1)' 
              }}>
                <button
                  onClick={() => setActiveWhiteboardTab('collab')}
                  style={{
                    background: activeWhiteboardTab === 'collab' ? 'var(--primary)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Collaborative Board
                </button>
                <button
                  onClick={() => {
                    if (aiDiagram) {
                      setActiveWhiteboardTab('ai-diagram');
                    } else {
                      alert('Ask the AI Copilot to generate a flowchart or diagram first!');
                    }
                  }}
                  style={{
                    background: activeWhiteboardTab === 'ai-diagram' ? 'var(--primary)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    opacity: aiDiagram ? 1 : 0.5,
                    transition: 'all 0.2s'
                  }}
                  title={aiDiagram ? 'View AI Generated Diagram' : 'No diagram generated yet'}
                >
                  💡 AI Diagram {aiDiagram ? '• Active' : ''}
                </button>
              </div>
            </div>

            <button 
              className="btn" 
              onClick={() => setShowWhiteboard(false)}
              style={{ background: 'white', color: 'black', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <X size={16} /> Close Board
            </button>
          </div>

          {activeWhiteboardTab === 'collab' ? (
            <div style={{ flex: 1, background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <iframe 
                src={`https://wbo.ophir.dev/boards/ai-meeting-${meetingId}`} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                title="Collaborative Whiteboard"
              />
            </div>
          ) : (
            <div style={{ 
              flex: 1, 
              background: '#090d16', 
              borderRadius: '12px', 
              overflowY: 'auto', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {aiDiagram && (
                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h3 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '8px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    {aiDiagram.title}
                  </h3>
                  <span className="badge badge-info" style={{ marginBottom: '32px', textTransform: 'uppercase', padding: '4px 12px' }}>
                    AI Generated Flowchart
                  </span>

                  {/* Render flowchart nodes */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
                    {aiDiagram.nodes.map((node: any, nIdx: number) => {
                      const outgoingEdge = aiDiagram.edges?.find((e: any) => e.from === node.id);
                      const edgeLabel = outgoingEdge?.label;

                      // Shape styles
                      let shapeStyle: React.CSSProperties = {
                        padding: '16px 28px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1.5px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        textAlign: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        minWidth: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                      };

                      if (node.shape === 'circle') {
                        shapeStyle = {
                          ...shapeStyle,
                          borderRadius: '9999px',
                          background: 'rgba(110, 139, 61, 0.15)',
                          borderColor: 'var(--success)',
                          color: '#d4edab',
                          minWidth: '150px'
                        };
                      } else if (node.shape === 'decision') {
                        shapeStyle = {
                          ...shapeStyle,
                          background: 'rgba(201, 175, 117, 0.15)',
                          borderColor: 'var(--warning)',
                          color: '#ffeab8',
                          borderRadius: '12px',
                          transform: 'rotate(0deg)',
                          borderWidth: '2px'
                        };
                      }

                      return (
                        <React.Fragment key={node.id}>
                          <div style={shapeStyle}>
                            {node.label}
                          </div>
                          {nIdx < aiDiagram.nodes.length - 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', margin: '4px 0' }}>
                              <span style={{ fontSize: '1.8rem', color: 'var(--secondary)', lineHeight: 1 }}>&darr;</span>
                              {edgeLabel && (
                                <span style={{
                                  fontSize: '0.72rem',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  padding: '3px 10px',
                                  borderRadius: '9999px',
                                  color: 'rgba(255,255,255,0.7)',
                                  fontWeight: 600,
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                }}>
                                  {edgeLabel}
                                </span>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Email Invite Modal */}
    {showEmailModal && meeting && (
      <EmailInviteModal
        meetingId={meetingId}
        meetingTitle={meeting.title}
        meetingCode={meeting.code}
        token={token}
        onClose={() => setShowEmailModal(false)}
      />
    )}
    {/* Recording Saved Alert */}
    {showSaveAlert && (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#ffffff',
        borderLeft: '4px solid var(--success)',
        padding: '16px 24px',
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'fade-in 0.3s ease'
      }}>
        <div style={{ fontSize: '1.2rem' }}>✅</div>
        <div>
          <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Recording saved successfully!</strong>
        </div>
      </div>
    )}

    {/* Recording Save Error Alert */}
    {saveError && (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#ffffff',
        borderLeft: '4px solid var(--danger)',
        padding: '16px 24px',
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'fade-in 0.3s ease'
      }}>
        <div style={{ fontSize: '1.2rem' }}>❌</div>
        <div>
          <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Failed to save recording. Please try again.</strong>
        </div>
      </div>
    )}
    </>
  );
};
