import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const VoiceAgent = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Listening... Speak now');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (recordedAudio: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert audio to base64
      const audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(recordedAudio);
      });

      // Step 1: Speech to Text
      console.log('Transcribing audio...');
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke(
        'speech-to-text',
        { body: { audio: audioBase64 } }
      );

      if (transcriptionError) throw transcriptionError;
      
      const userText = transcriptionData.text;
      console.log('Transcription:', userText);
      
      const userMessage: Message = { role: 'user', content: userText };
      setMessages(prev => [...prev, userMessage]);

      // Step 2: Process with LLM
      console.log('Processing with LLM...');
      const { data: llmData, error: llmError } = await supabase.functions.invoke(
        'process-llm',
        { 
          body: { 
            message: userText,
            conversationHistory: conversationHistory
          } 
        }
      );

      if (llmError) throw llmError;
      
      const assistantText = llmData.response;
      console.log('LLM response:', assistantText);
      
      const assistantMessage: Message = { role: 'assistant', content: assistantText };
      setMessages(prev => [...prev, assistantMessage]);
      setConversationHistory(llmData.conversationHistory);

      // Step 3: Text to Speech
      console.log('Generating speech...');
      setIsSpeaking(true);
      
      const { data: ttsData, error: ttsError } = await supabase.functions.invoke(
        'text-to-speech',
        { body: { text: assistantText } }
      );

      if (ttsError) throw ttsError;

      // Play audio
      const audioData = atob(ttsData.audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
      
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process audio');
      setIsSpeaking(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusText = () => {
    if (isRecording) return 'Listening...';
    if (isProcessing) return 'Processing...';
    if (isSpeaking) return 'Speaking...';
    return 'Tap to speak';
  };

  const getStatusColor = () => {
    if (isRecording) return 'bg-medical-green';
    if (isProcessing) return 'bg-primary';
    if (isSpeaking) return 'bg-medical-blue';
    return 'bg-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          MedicanAI Assistant
        </h1>
        <p className="text-muted-foreground">Healthcare appointment scheduling made simple</p>
      </div>

      {/* Conversation History */}
      <Card className="flex-1 mb-6 p-6 overflow-y-auto max-h-[50vh] shadow-medical">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p>Start speaking to schedule an appointment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Voice Control */}
      <div className="flex flex-col items-center gap-6">
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isRecording || isSpeaking ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium text-foreground">{getStatusText()}</span>
        </div>

        {/* Microphone Button */}
        <Button
          size="lg"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isSpeaking}
          className={`
            w-24 h-24 rounded-full shadow-medical transition-all duration-300
            ${isRecording ? 'bg-medical-green hover:bg-medical-green/90 animate-pulse-glow' : 'bg-primary hover:bg-primary/90'}
            ${isProcessing || isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isRecording ? (
            <MicOff className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </Button>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {isRecording
            ? 'Click the microphone again when you\'re done speaking'
            : 'Click the microphone to start a conversation with MedicanAI'}
        </p>
      </div>
    </div>
  );
};

export default VoiceAgent;