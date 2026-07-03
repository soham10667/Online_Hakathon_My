import { useState, useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Video, Calendar, CheckSquare, AlertTriangle, BarChart2, ExternalLink, Search, Clipboard, Check } from 'lucide-react';

interface DashboardProps {
  token: string;
  onSelectMeeting: (meetingId: string) => void;
}

export const Dashboard: FC<DashboardProps> = ({ token, onSelectMeeting }) => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedRecordingMeetingIds, setSavedRecordingMeetingIds] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [quickJoinCode, setQuickJoinCode] = useState('');

  const fetchMeetings = async () => {
    try {
      const response = await fetch('http://localhost:5000/meetings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setMeetings(data);
      }

      // Fetch recordings
      const recResponse = await fetch('http://localhost:5000/recordings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (recResponse.ok) {
        const recData = await recResponse.json();
        setSavedRecordingMeetingIds(recData.map((r: any) => r.meetingId));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [token]);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickJoinCode.trim()) {
      navigate(`/join?code=${quickJoinCode.trim()}`);
    }
  };

  // Helper stats
  const totalMeetings = meetings.length;
  const pendingActions = meetings.reduce((acc, m) => acc + (m._count?.actionItems || 0), 0);
  const openRisks = meetings.reduce((acc, m) => acc + (m._count?.risks || 0), 0);
  
  // Calculate average productivity score from completed meetings
  const completedMeetings = meetings.filter(m => m.status === 'COMPLETED' && m.summary);
  const avgProductivity = completedMeetings.length > 0 
    ? Math.round(completedMeetings.reduce((acc, m) => acc + m.summary.productivityScore, 0) / completedMeetings.length)
    : 100;

  // Filter lists
  const upcomingMeetings = meetings.filter(m => m.status === 'SCHEDULED' || m.status === 'ACTIVE');
  const pastMeetings = meetings.filter(m => m.status === 'COMPLETED');
  const activeMeetings = meetings.filter(m => m.status === 'ACTIVE');

  return (
    <div>
      {/* Upper Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }} className="gradient-text">Workspace Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track meetings, live summaries, and AI action items for your team.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Quick Join Input Box */}
          <form onSubmit={handleQuickJoin} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: 'var(--radius-md)' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Enter Meeting ID / Code"
              value={quickJoinCode}
              onChange={e => setQuickJoinCode(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', width: '170px' }}
            />
            <button type="submit" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}>
              Join
            </button>
          </form>

          <button className="btn btn-primary" onClick={() => navigate('/create-meeting')}>
            <Plus size={18} /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* Active Room Indicator (if any) */}
      {activeMeetings.length > 0 && (
        <div className="glass-card glow-card float-card" style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)',
          padding: '16px 24px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animationDuration: '8s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pulse-indicator active" style={{ width: '8px', height: '8px' }} />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LIVE SESSION IN PROGRESS</span>
              <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: '2px' }}>{activeMeetings[0].title}</h4>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => onSelectMeeting(activeMeetings[0].id)} style={{ background: 'var(--success)', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.4)' }}>
            <Play size={14} /> Join Now
          </button>
        </div>
      )}

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-card glow-card float-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', animationDelay: '0s', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
            background: 'radial-gradient(circle at 100% 0%, rgba(92, 107, 77, 0.08), transparent 70%)', pointerEvents: 'none'
          }} />
          <div style={{ background: 'rgba(92, 107, 77, 0.12)', color: 'var(--primary-hover)', padding: '14px', borderRadius: 'var(--radius-md)', zIndex: 1 }}>
            <Video size={24} />
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Total Meetings</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '4px' }}>{totalMeetings}</div>
          </div>
        </div>

        <div className="glass-card glow-card float-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', animationDelay: '0.2s', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
            background: 'radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.08), transparent 70%)', pointerEvents: 'none'
          }} />
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', padding: '14px', borderRadius: 'var(--radius-md)', zIndex: 1 }}>
            <CheckSquare size={24} />
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Pending Action Items</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '4px' }}>{pendingActions}</div>
          </div>
        </div>

        <div className="glass-card glow-card float-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', animationDelay: '0.4s', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
            background: 'radial-gradient(circle at 100% 0%, rgba(239, 68, 68, 0.08), transparent 70%)', pointerEvents: 'none'
          }} />
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', padding: '14px', borderRadius: 'var(--radius-md)', zIndex: 1 }}>
            <AlertTriangle size={24} />
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Active Blockers/Risks</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '4px' }}>{openRisks}</div>
          </div>
        </div>

        <div className="glass-card glow-card float-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', animationDelay: '0.6s', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '120px', height: '120px',
            background: 'radial-gradient(circle at 100% 0%, rgba(6, 185, 212, 0.08), transparent 70%)', pointerEvents: 'none'
          }} />
          <div style={{ background: 'rgba(6, 118, 212, 0.12)', color: 'var(--secondary)', padding: '14px', borderRadius: 'var(--radius-md)', zIndex: 1 }}>
            <BarChart2 size={24} />
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Productivity Index</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '4px' }}>{avgProductivity}%</div>
          </div>
        </div>
      </div>

      {/* Tabbed Meetings Panel */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button
              onClick={() => setActiveTab('upcoming')}
              style={{
                background: 'none', border: 'none', color: activeTab === 'upcoming' ? 'var(--primary-hover)' : 'var(--text-secondary)',
                fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer', paddingBottom: '8px',
                borderBottom: activeTab === 'upcoming' ? '2px solid var(--primary)' : 'none',
                transition: 'var(--transition-smooth)'
              }}
            >
              Upcoming / Active ({upcomingMeetings.length})
            </button>
            
            <button
              onClick={() => setActiveTab('past')}
              style={{
                background: 'none', border: 'none', color: activeTab === 'past' ? 'var(--primary-hover)' : 'var(--text-secondary)',
                fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer', paddingBottom: '8px',
                borderBottom: activeTab === 'past' ? '2px solid var(--primary)' : 'none',
                transition: 'var(--transition-smooth)'
              }}
            >
              Past Meetings ({pastMeetings.length})
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading meetings...</p>
        ) : (
          <div>
            {activeTab === 'upcoming' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {upcomingMeetings.map((meeting) => (
                  <MeetingRow key={meeting.id} meeting={meeting} onSelect={onSelectMeeting} savedRecordingMeetingIds={savedRecordingMeetingIds} />
                ))}
                {upcomingMeetings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p>No upcoming meetings found. Schedule a new meeting to begin!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'past' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pastMeetings.map((meeting) => (
                  <MeetingRow key={meeting.id} meeting={meeting} onSelect={onSelectMeeting} savedRecordingMeetingIds={savedRecordingMeetingIds} />
                ))}
                {pastMeetings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p>No past meetings found.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Extracted Sub-row Component for styling alignment
const MeetingRow: FC<{ meeting: any; onSelect: (id: string) => void; savedRecordingMeetingIds: string[] }> = ({ meeting, onSelect, savedRecordingMeetingIds }) => {
  const [copied, setCopied] = useState(false);

  const getJoinLink = () =>
    meeting.code ? `${window.location.origin}/join?code=${meeting.code}` : '';

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = getJoinLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="glow-card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 24px',
        transition: 'var(--transition-smooth)',
        cursor: 'pointer',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.borderColor = 'rgba(92, 107, 77, 0.2)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
        e.currentTarget.style.borderColor = 'var(--border-color)';
      }}
      onClick={() => onSelect(meeting.id)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{meeting.title}</h3>
          <span className={`badge ${
            meeting.status === 'ACTIVE' ? 'badge-success' :
            meeting.status === 'COMPLETED' ? 'badge-info' : 'badge-warning'
          }`} style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
            {meeting.status}
          </span>
          {meeting.code && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary-hover)', fontWeight: 700, letterSpacing: '0.05em', background: 'rgba(92, 107, 77, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
              {meeting.code}
            </span>
          )}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', lineHeight: '1.4' }}>
          {meeting.description || 'No description provided.'}
        </p>
        <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>Scheduled: {new Date(meeting.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
          {meeting.status === 'COMPLETED' && meeting.summary && (
            <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
              <span className="pulse-indicator active" style={{ width: '6px', height: '6px', margin: 0 }} />
              AI Summary Generated (Productivity: {meeting.summary.productivityScore}%)
            </span>
          )}
          {meeting.status === 'COMPLETED' && (savedRecordingMeetingIds.includes(meeting.id) || localStorage.getItem(`saved_meeting_rec_${meeting.id}`) === 'true') && (
            <span style={{ color: 'var(--primary-hover)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, background: 'rgba(92, 107, 77, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
              <Video size={12} /> Video Recording Saved
            </span>
          )}
          {meeting.code && meeting.status !== 'COMPLETED' && (
            <button
              onClick={handleCopyLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(92,107,77,0.08)',
                color: copied ? 'var(--success)' : 'var(--primary-hover)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(92,107,77,0.2)'}`,
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title={`Copy join link: ${getJoinLink()}`}
            >
              {copied ? <Check size={11} /> : <Clipboard size={11} />}
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginLeft: '16px', flexShrink: 0 }}>
        {meeting.status === 'COMPLETED' ? (
          <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); onSelect(meeting.id); }}>
            <ExternalLink size={16} /> View Minutes
          </button>
        ) : (
          <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onSelect(meeting.id); }}>
            <Play size={16} /> {meeting.status === 'ACTIVE' ? 'Resume Meeting' : 'Start Meeting'}
          </button>
        )}
      </div>
    </div>
  );
};
