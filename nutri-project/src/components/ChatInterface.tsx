import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useSpeechRecognition, useSpeechSynthesis } from '../hooks/useSpeech';
import { ChatMessage } from '../lib/supabase';
import { GoalCard } from './visualizations/GoalCard';
import { LineChart } from './visualizations/LineChart';
import { PieChart } from './visualizations/PieChart';
import { StreakCard } from './visualizations/StreakCard';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  loading: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading,
}) => {
  const [input, setInput] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isListening, transcript, startListening, stopListening, isSupported: speechRecognitionSupported } = useSpeechRecognition();
  const { speak, stop, isSpeaking, isSupported: speechSynthesisSupported } = useSpeechSynthesis();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !loading) {
        speak(lastMessage.content);
      }
    }
  }, [messages, loading, autoSpeak, speak]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const renderVisualization = (vizData: any) => {
    if (!vizData || !vizData.type) return null;

    switch (vizData.type) {
      case 'goal_card':
        return (
          <GoalCard
            title={vizData.title}
            current={vizData.current}
            target={vizData.target}
            unit={vizData.unit}
            icon={vizData.icon}
            trend={vizData.trend}
          />
        );
      case 'line_chart':
        return (
          <LineChart
            data={vizData.data}
            title={vizData.title}
            yAxisLabel={vizData.yAxisLabel}
            color={vizData.color}
          />
        );
      case 'pie_chart':
        return (
          <PieChart
            data={vizData.data}
            title={vizData.title}
          />
        );
      case 'streak_card':
        return (
          <StreakCard
            currentStreak={vizData.currentStreak}
            longestStreak={vizData.longestStreak}
            successRate={vizData.successRate}
            totalDays={vizData.totalDays}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Volume2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ask me about your nutrition
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try asking "How close was I to my protein goal last week?" or "Show me my calorie trends this month"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl ${
                message.role === 'user'
                  ? 'bg-red-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white border border-gray-200 rounded-2xl rounded-tl-sm'
              } px-4 py-3 shadow-sm`}
            >
              <p className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                {message.content}
              </p>

              {message.visualization_data && (
                <div className="mt-3">
                  {renderVisualization(message.visualization_data)}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Ask about your nutrition...'}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={loading || isListening}
          />

          {speechRecognitionSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                isListening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={loading}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {speechSynthesisSupported && (
            <button
              type="button"
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                autoSpeak
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {autoSpeak ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
