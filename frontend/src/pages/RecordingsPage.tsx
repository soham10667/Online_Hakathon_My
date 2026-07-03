import { useState, useEffect } from 'react';
import { getResolvedVideoUrl, downloadFile } from '../config';
import { Video, Calendar, Clock, Download, Film, Play, Trash2, X, Lock } from 'lucide-react';

interface Recording {
  id: string;
  meetingId: string;
  meetingTitle: string;
  createdAt: string;
  duration: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdBy: string;
  accessCode?: string;
}

export const RecordingsPage = ({ token }: { token: string }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);

  const fetchRecordings = async () => {
    try {
      const response = await fetch('http://localhost:5000/recordings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecordings(data);
      }
    } catch (err) {
      console.error('Error fetching recordings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRecordings();
    }
  }, [token]);

  const handleDownload = (rec: Recording, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadFile(getResolvedVideoUrl(rec.fileUrl), rec.fileName);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this recording?')) return;
    try {
      const response = await fetch(`http://localhost:5000/recordings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setRecordings(prev => prev.filter(r => r.id !== id));
      } else {
        alert('Failed to delete recording');
      }
    } catch (err) {
      console.error('Error deleting recording', err);
      alert('Error deleting recording');
    }
  };

  const handleGenerateAccessCode = async (rec: Recording, e: React.MouseEvent) => {
    e.stopPropagation();
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const currentCode = rec.accessCode || randomCode;
    const code = window.prompt(
      `Enter a passcode to restrict playback of this recording to specific members/groups. We have prefilled a generated passcode for you. Click OK to use it, customize it, or leave blank to clear the restriction:`,
      currentCode
    );
    if (code === null) return; // cancelled

    const cleanCode = code.trim();
    try {
      const response = await fetch(`http://localhost:5000/recordings/${rec.id}/access-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: cleanCode })
      });
      if (response.ok) {
        setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, accessCode: cleanCode } : r));
        alert(cleanCode ? `✅ Access code generated successfully! Share this code with members who need to watch: ${cleanCode}` : '🔓 Access restriction removed.');
      } else {
        alert('❌ Failed to update access code.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error updating access code.');
    }
  };

  const handlePlayRecording = (rec: Recording) => {
    if (rec.accessCode) {
      const code = window.prompt("This recording is restricted. Enter the Access Code to watch:");
      if (code === null) return; // cancelled
      if (code.trim() === rec.accessCode) {
        setPlayingRecording(rec);
      } else {
        alert("❌ Incorrect Access Code. Access Denied.");
      }
    } else {
      setPlayingRecording(rec);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading saved recordings...</p>;
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <h1 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Film style={{ color: 'var(--primary)' }} /> Saved Recordings
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Access and play all video recordings saved from your meetings.
      </p>

      {recordings.length === 0 ? (
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.4)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-muted)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <Video size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Saved Recordings</h3>
          <p style={{ fontSize: '0.88rem', marginTop: '6px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            You haven't saved any meeting recordings yet. Record a meeting and click "Save Recording" to list it here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {recordings.map(rec => {
            const dateStr = new Date(rec.createdAt).toLocaleDateString([], { dateStyle: 'medium' });
            const timeStr = new Date(rec.createdAt).toLocaleTimeString([], { timeStyle: 'short' });
            return (
              <div 
                key={rec.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  position: 'relative'
                }}
              >
                <div>
                  <span className="badge badge-success" style={{ marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    WebM Recording
                  </span>
                  {rec.accessCode && (
                    <span className="badge badge-warning" style={{ marginBottom: '10px', marginLeft: '6px', textTransform: 'uppercase', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <Lock size={10} /> Locked ({rec.accessCode})
                    </span>
                  )}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    {rec.meetingTitle}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Recorded by {rec.createdBy}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={12} /> <span>{dateStr} - {timeStr}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} /> <span>Duration: {formatDuration(rec.duration)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={12} /> <span>Size: {formatSize(rec.fileSize)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, gap: '6px', fontSize: '0.8rem', padding: '8px 12px' }}
                    onClick={() => handlePlayRecording(rec)}
                  >
                    <Play size={14} /> Play
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ gap: '6px', fontSize: '0.8rem', padding: '8px 12px' }}
                    onClick={(e) => handleGenerateAccessCode(rec, e)}
                    title={rec.accessCode ? `Locked (Code: ${rec.accessCode})` : 'Lock with Passcode'}
                  >
                    <Lock size={14} style={{ color: rec.accessCode ? 'var(--warning)' : 'inherit' }} />
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ gap: '6px', fontSize: '0.8rem', padding: '8px 12px' }}
                    onClick={(e) => handleDownload(rec, e)}
                    title="Download file"
                  >
                    <Download size={14} />
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ gap: '6px', fontSize: '0.8rem', padding: '8px 12px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                    onClick={(e) => handleDelete(rec.id, e)}
                    title="Delete recording"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {playingRecording && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '800px', padding: '20px', borderRadius: '16px', position: 'relative', background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={() => setPlayingRecording(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.2rem', paddingRight: '40px' }}>
              {playingRecording.meetingTitle}
            </h3>
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
              <video src={getResolvedVideoUrl(playingRecording.fileUrl)} controls autoPlay style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#aaa' }}>
              <span>Recorded: {new Date(playingRecording.createdAt).toLocaleString()}</span>
              <span>Size: {formatSize(playingRecording.fileSize)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
