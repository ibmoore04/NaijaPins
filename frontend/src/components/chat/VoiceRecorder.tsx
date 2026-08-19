import React, { useState, useEffect, useRef } from 'react';
import { Square, Trash2, Send, Play, Pause, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoice,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sending, setSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTracks = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone permission denied:', err);
      alert('Please allow microphone access to record voice messages.');
      onCancel();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleTogglePlay = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = async () => {
    if (!audioBlob || sending) return;
    setSending(true);
    try {
      await onSendVoice(audioBlob, recordingSeconds);
    } finally {
      setSending(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-emerald-50/90 border border-emerald-200 rounded-full px-4 py-2 select-none animate-fade-in">
      {isRecording ? (
        <>
          <div className="flex items-center gap-2 flex-1">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold text-gray-900">Recording...</span>
            <span className="text-xs font-mono font-bold text-[#0B6B3A]">
              {formatSeconds(recordingSeconds)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleStopRecording}
            className="px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Stop</span>
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="w-8 h-8 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center shadow-xs hover:bg-[#064D2A] transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-900">Voice Note</span>
              <span className="text-[10px] font-medium text-gray-500">{formatSeconds(recordingSeconds)}</span>
            </div>
            {audioUrl && (
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Discard Recording"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-1.5 rounded-full bg-[#0B6B3A] hover:bg-[#064D2A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
};
