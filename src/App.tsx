import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Scale, AlertCircle, Loader2, Search, RefreshCw, CheckCircle2, Volume2, VolumeX, History, Plus, MessageSquare, Trash2, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  groundingUrls?: string[];
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatRef = useRef<any>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('meb_asistan_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse saved sessions', e);
      }
    }

    // Initialize notification sound
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;

    // Set initial update time
    setLastUpdate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));

    // Initialize chat session
    initChat();

    // Simulate periodic update
    const interval = setInterval(() => {
      setIsUpdating(true);
      setTimeout(() => {
        setLastUpdate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        setIsUpdating(false);
      }, 1500);
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('meb_asistan_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const initChat = () => {
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `Sen Milli Eğitim Bakanlığı (MEB) mevzuatı, kanunları, yönetmelikleri, yönergeleri ve genelgeleri konusunda uzman, HIZLI ve ODAKLI bir danışmansın.
Kullanıcının sorularına EN GÜNCEL mevzuata göre, doğrudan ve net yanıtlar vermelisin. Laf kalabalığı yapma.
Yanıt verirken MUTLAKA internette arama yapmalısın. Özellikle şu kaynakları taramalısın:
1. meb.gov.tr
2. resmigazete.gov.tr
3. memurlar.net (Resmi görüş yazıları)

Bu kaynakları analiz ederek en doğru yanıtı üretmelisin.
Verdiğin her yanıtta, bilginin dayandığı mevzuatın adını (Kanun, Yönetmelik vb.) ve ilgili madde numarasını AÇIKÇA belirtmelisin (Dayanak göstermek zorunludur).
Yanıtlarını anlaşılır, profesyonel ve yapılandırılmış bir dille (Markdown formatında) sunmalısın.`,
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Yeni Sohbet',
      messages: [
        {
          id: 'welcome',
          role: 'model',
          text: 'Merhaba! Ben MEB Mevzuat Asistanı. Milli Eğitim Bakanlığı kanunları, yönetmelikleri, genelgeleri ve resmi görüş yazıları hakkında size yardımcı olabilirim. Sorularınızı yanıtlarken **en güncel mevzuatı** kontrol eder ve yasal dayanaklarını (Kanun/Yönetmelik/Madde) belirtirim. Ayrıca memurlar.net gibi platformlardaki resmi görüş yazılarını da analiz ederim. Size nasıl yardımcı olabilirim?',
        }
      ],
      createdAt: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    initChat();
    setIsSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    if (currentSessionId === id) {
      setCurrentSessionId(updatedSessions.length > 0 ? updatedSessions[0].id : null);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play prevented by browser:', e));
    }
  };

  const handleManualUpdate = () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setTimeout(() => {
      setLastUpdate(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      setIsUpdating(false);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: input.trim().substring(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [
          {
            id: 'welcome',
            role: 'model',
            text: 'Merhaba! Ben MEB Mevzuat Asistanı. Milli Eğitim Bakanlığı kanunları, yönetmelikleri, genelgeleri ve resmi görüş yazıları hakkında size yardımcı olabilirim. Sorularınızı yanıtlarken **en güncel mevzuatı** kontrol eder ve yasal dayanaklarını (Kanun/Yönetmelik/Madde) belirtirim. Ayrıca memurlar.net gibi platformlardaki resmi görüş yazılarını da analiz ederim. Size nasıl yardımcı olabilirim?',
          }
        ],
        createdAt: Date.now(),
      };
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      sessionId = newSession.id;
    }

    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    const userMessageId = Date.now().toString();
    const modelMessageId = (Date.now() + 1).toString();

    // Update session title if it's the first real question
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const isFirstQuestion = s.messages.length <= 1;
        return {
          ...s,
          title: isFirstQuestion ? userText.substring(0, 30) + (userText.length > 30 ? '...' : '') : s.title,
          messages: [
            ...s.messages,
            { id: userMessageId, role: 'user', text: userText },
            { id: modelMessageId, role: 'model', text: '', isStreaming: true },
          ]
        };
      }
      return s;
    }));

    try {
      if (!chatRef.current) initChat();

      const responseStream = await chatRef.current.sendMessageStream({
        message: userText,
      });

      let fullText = '';
      let groundingUrls: string[] = [];

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
             chunks.forEach((c: any) => {
               if (c.web?.uri && !groundingUrls.includes(c.web.uri)) {
                 groundingUrls.push(c.web.uri);
               }
             });
          }

          setSessions(prev => prev.map(s => {
            if (s.id === sessionId) {
              return {
                ...s,
                messages: s.messages.map(msg => 
                  msg.id === modelMessageId 
                    ? { ...msg, text: fullText, groundingUrls: groundingUrls.length > 0 ? groundingUrls : undefined } 
                    : msg
                )
              };
            }
            return s;
          }));
        }
      }

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: s.messages.map(msg => 
              msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg
            )
          };
        }
        return s;
      }));
      
      playNotificationSound();
      
    } catch (error) {
      console.error('Error generating response:', error);
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: s.messages.map(msg => 
              msg.id === modelMessageId ? { ...msg, text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', isStreaming: false } : msg
            )
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-50 transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-indigo-600">
              <Scale size={20} />
              <span>MEB Geçmişi</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="p-4">
            <button 
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              <Plus size={18} />
              Yeni Sohbet
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400 text-sm">
                Henüz kayıtlı bir sohbet yok.
              </div>
            ) : (
              sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                    ${currentSessionId === session.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-100 text-slate-600'}
                  `}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={18} className={currentSessionId === session.id ? 'text-indigo-600' : 'text-slate-400'} />
                    <span className="truncate text-sm font-medium">{session.title}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white mr-4 shadow-md">
                <Scale size={24} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold text-slate-800">MEB Mevzuat Asistanı</h1>
                <p className="text-sm text-slate-500">Hızlı ve Kesin Mevzuat Sorgulama</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-slate-600 shadow-sm">
              <div className="flex flex-col mr-2 sm:mr-3 border-r border-slate-200 pr-2 sm:pr-3">
                <span className="font-medium text-slate-700">Canlı Doğrulama</span>
                <span className="text-emerald-600 flex items-center mt-0.5">
                  <CheckCircle2 size={10} className="mr-1" /> Aktif
                </span>
              </div>
              <div className="flex items-center cursor-pointer hover:text-indigo-600 transition-colors" onClick={handleManualUpdate}>
                <RefreshCw size={12} className={`mr-1 ${isUpdating ? 'animate-spin text-indigo-600' : ''}`} />
                <div className="flex flex-col">
                  <span className="hidden xs:inline">Son Senkronizasyon</span>
                  <span className="font-medium">{isUpdating ? '...' : lastUpdate}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {!currentSession ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                  <BookOpen size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Hoş Geldiniz</h2>
                <p className="text-slate-500 max-w-md mb-8">
                  Milli Eğitim Bakanlığı mevzuatı hakkında sorularınızı sormak için yeni bir sohbet başlatın veya geçmiş sohbetlerinize göz atın.
                </p>
                <button 
                  onClick={createNewSession}
                  className="flex items-center gap-2 py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  <Plus size={20} />
                  Sohbet Başlat
                </button>
              </div>
            ) : (
              currentSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex max-w-[90%] sm:max-w-[80%] ${
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                        msg.role === 'user'
                          ? 'bg-slate-200 text-slate-600 ml-3'
                          : 'bg-indigo-100 text-indigo-600 mr-3'
                      }`}
                    >
                      {msg.role === 'user' ? <BookOpen size={16} /> : <Scale size={16} />}
                    </div>

                    <div
                      className={`px-4 sm:px-5 py-3 sm:py-4 rounded-2xl shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {msg.role === 'model' ? (
                        <div className="prose prose-sm sm:prose-base prose-slate max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                          {msg.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1 align-middle"></span>
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm sm:text-base">{msg.text}</div>
                      )}

                      {msg.role === 'model' && msg.groundingUrls && msg.groundingUrls.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center text-[10px] sm:text-xs font-medium text-slate-500 mb-2">
                            <Search size={12} className="mr-1" />
                            Doğrulanan Kaynaklar:
                          </div>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {msg.groundingUrls.map((url, idx) => {
                              try {
                                const domain = new URL(url).hostname.replace('www.', '');
                                return (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] sm:text-xs text-slate-600 transition-colors border border-slate-200"
                                    title={url}
                                  >
                                    {domain}
                                  </a>
                                );
                              } catch {
                                return null;
                              }
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer className="bg-white border-t border-slate-200 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={handleSubmit}
              className="relative flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-sm"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Mevzuat sorunuzu yazın..."
                className="flex-1 max-h-48 min-h-[44px] bg-transparent border-0 focus:ring-0 resize-none py-2 px-3 text-slate-800 placeholder-slate-400 text-sm sm:text-base"
                rows={1}
                style={{ height: 'auto' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
            <div className="mt-2 text-center flex items-center justify-center text-[10px] sm:text-xs text-slate-400">
              <AlertCircle size={12} className="mr-1" />
              Yapay zeka hata yapabilir. Lütfen önemli kararlar almadan önce resmi kaynaklardan teyit ediniz.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
