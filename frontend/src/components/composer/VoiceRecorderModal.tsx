import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Mic, Square, Play, Pause, Trash2, X, Check, Volume2 } from 'lucide-react';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAudio: (audioFile: File, previewUrl: string) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaveAudio,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) { // Max 3 minutes
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage('Microphone access denied or unavailable. Please enable microphone permissions in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleTogglePlay = () => {
    if (!audioPlayerRef.current || !previewUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (isRecording) {
      stopRecording();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {}
    }
    setAudioBlob(null);
    setPreviewUrl(null);
    setIsRecording(false);
    setIsPlaying(false);
    setRecordingSeconds(0);
    setErrorMessage(null);
  };

  const handleConfirmAudio = () => {
    if (!audioBlob || !previewUrl) return;
    const file = new File([audioBlob], `voice-memory-${Date.now()}.webm`, {
      type: 'audio/webm',
    });
    onSaveAudio(file, previewUrl);
    onClose();
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm bg-white border border-border shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-black">Voice Memory Note</h3>
              <p className="text-[11px] text-charcoal-muted">Record an oral heritage story (up to 3 mins)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-charcoal-muted hover:text-black hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recording Center */}
        <div className="p-6 flex flex-col items-center justify-center space-y-5 text-center">
          {errorMessage && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 w-full">
              {errorMessage}
            </p>
          )}

          {/* Recording Timer & Visual Pulse */}
          <div className="space-y-2">
            <div className="text-3xl font-mono font-black text-black">
              {formatTime(recordingSeconds)}
            </div>
            <p className="text-xs text-charcoal-muted font-medium">
              {isRecording
                ? 'Recording in progress...'
                : previewUrl
                ? 'Recording ready for preview'
                : 'Tap microphone to start'}
            </p>
          </div>

          {/* Main Action Circle */}
          {!previewUrl ? (
            <div>
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-18 h-18 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition-transform active:scale-95 animate-pulse"
                  aria-label="Stop recording"
                >
                  <Square className="w-7 h-7 fill-white" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-18 h-18 rounded-full bg-[#0B6B3A] text-white flex items-center justify-center shadow-lg hover:bg-[#064D2A] transition-transform active:scale-95"
                  aria-label="Start recording"
                >
                  <Mic className="w-8 h-8" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 w-full justify-center">
              <audio
                ref={audioPlayerRef}
                src={previewUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-14 h-14 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-md hover:bg-emerald-800 transition-transform active:scale-95"
                aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-3 rounded-full bg-gray-100 hover:bg-red-50 text-charcoal-dark hover:text-red-600 transition-colors"
                title="Discard recording"
                aria-label="Discard recording"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex justify-end gap-2 bg-gray-50/50">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmAudio}
              leftIcon={<Check className="w-4 h-4" />}
              className="bg-[#0B6B3A] hover:bg-[#064D2A] text-white font-bold"
            >
              Attach Voice Note
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
