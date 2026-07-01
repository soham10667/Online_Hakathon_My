import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { 
  Send, 
  Video, 
  MessageSquare, 
  Calendar, 
  Sparkles, 
  Play, 
  ExternalLink, 
  Hash, 
  Plus 
} from 'lucide-react';

interface ChannelViewProps {
  token: string;
  channelId: string;
  teamId: string;
  currentUser: any;
  socket: Socket | null;
  onStartMeeting: (meetingId: string) => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  token,
  channelId,
  teamId,
  currentUser,
  socket,
  onStartMeeting
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'meetings' | 'copilot'>('chat');
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Copilot state
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingError, setMeetingError] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch channel details and history
  const fetchChannelData = async () => {
    try {
      setLoading(true);
      // Fetch channels to find name/desc
      const channelsRes = await fetch(`http://localhost:5000/teams/${teamId}/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (channelsRes.ok) {
        const channels = await channelsRes.json();
        const info = channels.find((c: any) => c.id === channelId);
        setChannelInfo(info);
      }

      // Fetch messages
      const msgsRes = await fetch(`http://localhost:5000/teams/channels/${channelId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (msgsRes.ok) {
        const msgs = await msgsRes.json();
        setMessages(msgs);
      }

      // Fetch channel meetings
      fetchMeetings();
    } catch (err) {
      console.error('Error fetching channel data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await fetch('http://localhost:5000/meetings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const allMeetings = await response.json();
        // Filter meetings belonging to this channel
        const channelMeetings = allMeetings.filter((m: any) => m.channelId === channelId);
        setMeetings(channelMeetings);
      }
    } catch (err) {
      console.error('Failed to fetch meetings', err);
    }
  };

  useEffect(() => {
    fetchChannelData();

    if (!socket) return;

    // Join channel WebSocket room
    socket.emit('joinChannel', { channelId });

    // Listen to real-time chat updates
    socket.on('channelMessageAdded', (message: any) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.emit('leaveChannel', { channelId });
      socket.off('channelMessageAdded');
    };
  }, [channelId, socket]);

  // Autoscroll chat feed
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('sendChannelMessage', {
      channelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: inputText.trim()
    });

    setInputText('');
  };

  const handleStartInstantCall = async () => {
    try {
      const response = await fetch('http://localhost:5000/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `Instant Meeting in #${channelInfo?.name || 'Channel'}`,
          description: `Quick sync inside channel.`,
          channelId
        }),
      });
      const data = await response.json();
      if (response.ok) {
        // Start meeting instantly
        await fetch(`http://localhost:5000/meetings/${data.id}/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        onStartMeeting(data.id);
      }
    } catch (err) {
      console.error('Failed to start call', err);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setMeetingError('');
    try {
      const response = await fetch('http://localhost:5000/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: meetingTitle,
          description: meetingDesc,
          channelId
        }),
      });
      if (!response.ok) throw new Error('Failed to schedule meeting');
      
      setMeetingTitle('');
      setMeetingDesc('');
      setShowScheduleModal(false);
      fetchMeetings();
    } catch (err: any) {
      setMeetingError(err.message || 'Error occurred');
    }
  };

  const triggerChannelAiSummary = async () => {
    setAiLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/teams/channels/${channelId}/ai-summary`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAiSummary(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Find active channel call if any
  const activeCall = meetings.find(m => m.status === 'ACTIVE');

  return (
    <div>
      {/* Channel Header Banner */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hash size={28} style={{ color: 'var(--primary)' }} />
            {channelInfo?.name || 'Loading channel...'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{channelInfo?.description || 'Collaborate with your team.'}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleStartInstantCall}>
            <Video size={16} /> Meet Now
          </button>
          <button className="btn btn-secondary" onClick={() => setShowScheduleModal(true)}>
            <Plus size={16} /> Schedule Call
          </button>
        </div>
      </div>

      {/* Active Call Banner Alert */}
      {activeCall && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 24px',
          marginBottom: '28px',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="pulse-indicator active" />
            <div>
              <strong style={{ color: 'var(--success)' }}>Active Meeting in Progress</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{activeCall.title}</div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ background: 'var(--success)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }} onClick={() => onStartMeeting(activeCall.id)}>
            Join Call
          </button>
        </div>
      )}

      {/* Channel Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', paddingBottom: '8px' }}>
        <button 
          className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none', background: activeTab === 'chat' ? 'var(--primary)' : 'transparent' }}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={14} /> Conversations
        </button>

        <button 
          className={`btn ${activeTab === 'meetings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none', background: activeTab === 'meetings' ? 'var(--primary)' : 'transparent' }}
          onClick={() => setActiveTab('meetings')}
        >
          <Calendar size={14} /> Meetings log
        </button>

        <button 
          className={`btn ${activeTab === 'copilot' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none', background: activeTab === 'copilot' ? 'var(--primary)' : 'transparent' }}
          onClick={() => setActiveTab('copilot')}
        >
          <Sparkles size={14} /> Channel Copilot
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading channel feed...</p>
      ) : (
        <div>
          {/* 1. CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '540px', padding: '20px' }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px', marginBottom: '20px' }}>
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <MessageSquare size={44} style={{ opacity: 0.15, marginBottom: '12px' }} />
                    <p>No messages here yet. Say hello to start the discussion!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div 
                        key={msg.id || idx} 
                        style={{
                          background: isMe ? 'rgba(92, 107, 77, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          borderColor: isMe ? 'var(--primary-glow)' : 'var(--border-color)',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-lg)',
                          maxWidth: '75%',
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          boxShadow: isMe ? '0 4px 12px rgba(92,107,77,0.05)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: isMe ? 'var(--primary-hover)' : 'var(--secondary)' }}>
                            {msg.senderName}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder={`Message #${channelInfo?.name || 'channel'}...`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', flexShrink: 0 }}>
                  <Send size={16} /> Send
                </button>
              </form>
            </div>
          )}

          {/* 2. MEETINGS TAB */}
          {activeTab === 'meetings' && (
            <div className="glass-card">
              <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Channel Meetings</h2>
              {meetings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  <Video size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p>No meetings hosted in this channel. Tap "Meet Now" to sync live.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 20px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                          <h3 style={{ fontSize: '1.1rem' }}>{meeting.title}</h3>
                          <span className={`badge ${
                            meeting.status === 'ACTIVE' ? 'badge-success' :
                            meeting.status === 'COMPLETED' ? 'badge-info' : 'badge-warning'
                          }`}>
                            {meeting.status}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>
                          {meeting.description || 'No description provided.'}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Scheduled: {new Date(meeting.createdAt).toLocaleString()}</span>
                          {meeting.status === 'COMPLETED' && meeting.summary && (
                            <span style={{ color: 'var(--success)' }}>AI Summary Generated (Productivity: {meeting.summary.productivityScore}%)</span>
                          )}
                        </div>
                      </div>

                      <div>
                        {meeting.status === 'COMPLETED' ? (
                          <button className="btn btn-secondary" onClick={() => onStartMeeting(meeting.id)}>
                            <ExternalLink size={16} /> View Minutes
                          </button>
                        ) : (
                          <button className="btn btn-primary" onClick={() => onStartMeeting(meeting.id)}>
                            <Play size={16} /> {meeting.status === 'ACTIVE' ? 'Join Call' : 'Start Call'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. COPILOT TAB */}
          {activeTab === 'copilot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} style={{ color: 'var(--primary)' }} />
                    <h2 style={{ fontSize: '1.4rem' }}>Channel Activity Copilot</h2>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={triggerChannelAiSummary}
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Synthesizing...' : 'Summarize Channel Status'}
                  </button>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '16px' }}>
                  The channel Copilot scans recent chat messages and completed meeting notes to compile key milestones, items blocked, and consensus updates.
                </p>

                {aiSummary ? (
                  <div style={{ 
                    borderTop: '1px solid var(--border-color)', 
                    paddingTop: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '20px' 
                  }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Overview</h3>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{aiSummary.summary}</p>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Key Takeaways & Consensus</h3>
                      <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {aiSummary.keyPoints?.map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  !aiLoading && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '30px 0', 
                      background: 'rgba(255,255,255,0.01)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px dashed var(--border-color)',
                      color: 'var(--text-muted)'
                    }}>
                      Tap the button above to request a fresh channel activity summary.
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '20px' }}>Schedule Channel Call</h2>
            {meetingError && <div style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '0.9rem' }}>{meetingError}</div>}
            
            <form onSubmit={handleScheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Meeting Title</label>
                <input
                  type="text" className="input-field" placeholder="e.g. Frontend Architecture Sync"
                  value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  className="input-field" placeholder="Agenda and goals..." rows={3}
                  value={meetingDesc} onChange={e => setMeetingDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule Meeting</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
