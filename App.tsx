
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, Image as ImageIcon, X, 
  Bot, User, 
  LayoutGrid, BarChart3,
  History as HistoryIcon, Volume2, AudioLines, FileText, 
  Plus, Trash2, Mic, Square,
  Settings, Bell, Newspaper, Save, ListRestart, ChevronRight, Clock,
  Edit3, StickyNote, ChevronDown, ChevronUp, Maximize2, Minimize2,
  ZoomIn, Download, Eye, Cake, PartyPopper, UserPlus, Calendar, Check,
  Gift, BellRing, CloudSync, Cloud
} from 'lucide-react';
import { sendMessageToAi, generateAudioTips, ChatMessage } from './geminiService';
import { supabase } from './supabaseClient';

type DashboardTab = 'assistente' | 'dashboard' | 'jornal' | 'aniversariantes';

interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
}

interface JornalEntry {
  id: string;
  date: string;
  content: string;
}

interface Note {
  id: string;
  content: string;
  color: string;
}

interface Employee {
  id: string;
  name: string;
  day: number;
  month: string;
  photo?: string;
  photoZoom: number;
  reminderActive: boolean;
}

interface BirthdayAlert {
  id: string;
  type: 'today' | 'upcoming' | 'near';
  message: string;
  employeeName: string;
}

interface PersistedState {
  assistente: { chats: Chat[]; currentChatId: string | null };
  dashboard: { chats: Chat[]; currentChatId: string | null };
  jornal: { 
    currentContent: string;
    history: JornalEntry[];
    notes: Note[];
  };
  aniversariantes: Employee[];
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const Lightbox = ({ src, onClose }: { src: string; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200 p-4" onClick={onClose}>
      <div className="absolute top-6 right-6 flex gap-4">
         <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/20 shadow-2xl">
           <Download size={24} />
         </button>
         <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/20 shadow-2xl">
           <X size={24} />
         </button>
      </div>
      <div className="relative max-w-full max-h-full overflow-auto flex items-center justify-center cursor-zoom-out">
        <img src={src} className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg animate-in zoom-in-95 duration-300" alt="Ampliação" />
      </div>
    </div>
  );
};

const AiAvatar = ({ isTalking }: { isTalking: boolean }) => (
  <div className={`w-12 h-12 bg-slate-900 rounded-2xl p-2 shadow-lg border border-slate-700 flex flex-col items-center justify-center relative transition-all duration-500 ${isTalking ? 'animate-talk-vibrate border-blue-500 ring-4 ring-blue-500/20' : ''}`}>
    <div className="flex gap-2 mb-1">
      <div className={`w-2 h-2 bg-blue-400 rounded-sm ${isTalking ? 'animate-pulse' : ''}`}></div>
      <div className={`w-2 h-2 bg-blue-400 rounded-sm ${isTalking ? 'animate-pulse' : ''}`}></div>
    </div>
    <div className="w-8 h-1 bg-slate-700 rounded-full relative overflow-hidden">
      <div className={`absolute inset-0 bg-blue-500 transition-all ${isTalking ? 'w-full' : 'w-0'}`}></div>
    </div>
  </div>
);

const BunnyMascot = ({ onVibrate, monthAlert }: { onVibrate: () => void, monthAlert?: string }) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [isWobbling, setIsWobbling] = useState(false);
  const bubbleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (monthAlert) {
      setShowBubble(true);
      if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = window.setTimeout(() => setShowBubble(false), 120000);
    }
  }, [monthAlert]);

  const handleClick = () => {
    const now = Date.now();
    let newCount = 1;
    if (now - lastClickTime < 3000) newCount = clickCount + 1;
    setClickCount(newCount);
    setLastClickTime(now);

    if (newCount === 1) {
      setShowBubble(true);
      if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = window.setTimeout(() => setShowBubble(false), 3000);
    } else if (newCount === 2) {
      setIsWobbling(true);
      setTimeout(() => setIsWobbling(false), 1000);
    } else if (newCount === 3) {
      onVibrate();
      setClickCount(0);
    }
  };

  return (
    <div className="fixed top-2 right-4 z-[100] pointer-events-none select-none">
      <div className="relative flex flex-col items-center">
        {showBubble && (
          <div className="absolute -left-[280px] top-10 bg-white shadow-2xl border-2 border-blue-100 rounded-[2rem] p-5 animate-in fade-in slide-in-from-right-8 duration-500 z-[101] w-[260px] pointer-events-auto">
            <div className="flex justify-between items-start mb-2">
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lembrete Inteligente</span>
               <button onClick={() => setShowBubble(false)} className="text-slate-300 hover:text-slate-600"><X size={14}/></button>
            </div>
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic">{monthAlert || "Olá! Posso ajudar com a auditoria?"}</p>
            <div className="absolute right-[-10px] top-6 w-4 h-4 bg-white border-r-2 border-t-2 border-blue-100 rotate-45"></div>
          </div>
        )}
        <div onClick={handleClick} className={`pointer-events-auto cursor-pointer animate-float-bunny ${isWobbling ? 'animate-bunny-wobble' : ''} transition-all duration-300`}>
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/527.png" alt="Mascote" className="w-56 h-56 object-contain filter drop-shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:scale-105" />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('assistente');
  const [isVibrating, setIsVibrating] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Aniversariantes Form
  const [empName, setEmpName] = useState('');
  const [empDay, setEmpDay] = useState(1);
  const [empMonth, setEmpMonth] = useState('Janeiro');
  const [empPhoto, setEmpPhoto] = useState<string | null>(null);
  const [empZoom, setEmpZoom] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Alerts
  const [birthdayAlerts, setBirthdayAlerts] = useState<BirthdayAlert[]>([]);
  const [mascotMonthAlert, setMascotMonthAlert] = useState<string | undefined>();

  const [state, setState] = useState<PersistedState>(() => {
    const saved = localStorage.getItem('brqa_v16_state');
    if (saved) return JSON.parse(saved);
    return {
      assistente: { chats: [{ id: 's1', name: 'Assistente Inicial', createdAt: Date.now(), messages: [{ id: 'w1', role: 'model', parts: [{ text: '🤖 Assistente BRQA online.\nAnálise operacional centralizada e pronta.' }] }] }], currentChatId: 's1' },
      dashboard: { chats: [{ id: 'd1', name: 'Auditoria Logística', createdAt: Date.now(), messages: [{ id: 'w2', role: 'model', parts: [{ text: 'Pronto para análise técnica detalhada.' }] }] }], currentChatId: 'd1' },
      jornal: { currentContent: '', history: [], notes: [] },
      aniversariantes: []
    };
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const empPhotoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- SUPABASE PERSISTENCE LAYER ---

  // Load from Supabase on start
  useEffect(() => {
    const loadState = async () => {
      try {
        const { data, error } = await supabase
          .from('brqa_storage')
          .select('content')
          .eq('id', 'app_data')
          .single();

        if (error) {
          console.warn("Could not load from Supabase (maybe table doesn't exist yet?):", error.message);
        } else if (data?.content) {
          setState(data.content as PersistedState);
          setLastSyncTime(new Date());
        }
      } catch (err) {
        console.error("Supabase load error:", err);
      } finally {
        setIsCloudLoading(false);
      }
    };
    loadState();
  }, []);

  // Sync to Supabase and LocalStorage on state change
  useEffect(() => {
    if (isCloudLoading) return; // Prevent overwriting cloud data with default state during initial load

    const saveState = async () => {
      // Local Backup
      localStorage.setItem('brqa_v16_state', JSON.stringify(state));

      // Cloud Save
      try {
        const { error } = await supabase
          .from('brqa_storage')
          .upsert({ id: 'app_data', content: state });
        
        if (error) console.error("Cloud sync failed:", error.message);
        else setLastSyncTime(new Date());
      } catch (err) {
        console.error("Supabase save error:", err);
      }
    };

    const timeout = setTimeout(saveState, 1000); // Debounce saves
    return () => clearTimeout(timeout);
  }, [state, isCloudLoading]);

  // --- END SUPABASE LAYER ---

  useEffect(() => {
    checkBirthdays();
  }, [state.aniversariantes]);

  useEffect(() => {
    const now = new Date();
    const currentMonthName = MONTHS[now.getMonth()];
    const mBdays = state.aniversariantes.filter(e => e.month === currentMonthName);
    if (mBdays.length > 0) {
      setMascotMonthAlert(`🐰 Neste mês, a querida "${mBdays[0].name}" fará aniversário no dia ${mBdays[0].day}. Não esqueça de preparar o presentinho!`);
    }
  }, []);

  const checkBirthdays = () => {
    const now = new Date();
    const curDay = now.getDate();
    const curMonthIndex = now.getMonth();
    const alerts: BirthdayAlert[] = [];
    let shouldVibrate = false;

    state.aniversariantes.forEach(emp => {
      const empMonthIndex = MONTHS.indexOf(emp.month);
      const bdayDate = new Date(now.getFullYear(), empMonthIndex, emp.day);
      if (bdayDate < new Date(now.getFullYear(), curMonthIndex, curDay)) bdayDate.setFullYear(now.getFullYear() + 1);
      const diffDays = Math.ceil((bdayDate.getTime() - new Date(now.getFullYear(), curMonthIndex, curDay).getTime()) / (1000 * 60 * 60 * 24));

      if (emp.day === curDay && empMonthIndex === curMonthIndex) {
        alerts.push({ id: `today-${emp.id}`, type: 'today', employeeName: emp.name, message: `🎉 Parabéns, ${emp.name}, pelo seu dia!` });
        shouldVibrate = true;
      } else if (diffDays <= 5 && diffDays > 0) {
        alerts.push({ id: `5d-${emp.id}`, type: 'upcoming', employeeName: emp.name, message: `📅 Atenção: o aniversário de ${emp.name} está chegando em ${diffDays} dias.` });
      } else if (diffDays <= 10 && diffDays > 5 && diffDays % 2 === 0) {
        alerts.push({ id: `10d-${emp.id}-${diffDays}`, type: 'near', employeeName: emp.name, message: `📅 Lembrete: o aniversário de ${emp.name} se aproxima em ${diffDays} dias.` });
      }
    });
    setBirthdayAlerts(alerts);
    if (shouldVibrate) triggerScreenVibration();
  };

  const currentContext = activeTab === 'dashboard' ? state.dashboard : state.assistente;
  const currentChat = useMemo(() => currentContext.chats.find(c => c.id === currentContext.currentChatId) || currentContext.chats[0], [currentContext, activeTab]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [currentChat?.messages, isTyping, activeTab]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => setSelectedImage(event.target?.result as string);
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          handleSend(base64);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao gravar áudio:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSend = async (audioBase64?: string) => {
    if (!inputText.trim() && !selectedImage && !audioBase64) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', parts: [
      ...(inputText.trim() ? [{ text: inputText }] : []),
      ...(selectedImage ? [{ inlineData: { mimeType: "image/jpeg", data: selectedImage.split(',')[1] } }] : []),
      ...(audioBase64 ? [{ inlineData: { mimeType: "audio/webm", data: audioBase64 } }] : [])
    ]};
    const updatedMessages = [...currentChat.messages, userMsg];

    setState(prev => {
      const db = prev[activeTab === 'dashboard' ? 'dashboard' : 'assistente'];
      const chats = db.chats.map(c => c.id === db.currentChatId ? { ...c, messages: updatedMessages } : c);
      return { ...prev, [activeTab === 'dashboard' ? 'dashboard' : 'assistente']: { ...db, chats } };
    });

    setInputText(''); setSelectedImage(null); setIsTyping(true);
    const responseText = await sendMessageToAi(updatedMessages, activeTab === 'assistente' ? 'assistant' : 'analytical');
    const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', parts: [{ text: responseText }] };
    
    setState(prev => {
      const db = prev[activeTab === 'dashboard' ? 'dashboard' : 'assistente'];
      const chats = db.chats.map(c => c.id === db.currentChatId ? { ...c, messages: [...c.messages, modelMsg] } : c);
      return { ...prev, [activeTab === 'dashboard' ? 'dashboard' : 'assistente']: { ...db, chats } };
    });
    setIsTyping(false);
    if (audioBase64) setTimeout(() => handleOuvirDicas(responseText), 300);
  };

  const handleOuvirDicas = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    const audio = await generateAudioTips(text);
    if (audio) {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const buffer = await decodeAudioData(decodeBase64(audio), audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer; source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlayingAudio(false); source.start();
    } else setIsPlayingAudio(false);
  };

  const triggerScreenVibration = () => { setIsVibrating(true); setTimeout(() => setIsVibrating(false), 1000); };

  if (isCloudLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-6">
        <CloudSync size={64} className="text-blue-500 animate-spin" />
        <div className="text-center">
          <h2 className="text-2xl font-black uppercase tracking-widest">Sincronizando Cloud BRQA</h2>
          <p className="text-slate-400 mt-2 font-medium">Recuperando registros do Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-slate-50 text-slate-900 overflow-hidden transition-all duration-300 ${isVibrating ? 'animate-screen-shake' : ''}`}>
      {enlargedImage && <Lightbox src={enlargedImage} onClose={() => setEnlargedImage(null)} />}
      <BunnyMascot onVibrate={triggerScreenVibration} monthAlert={mascotMonthAlert} />
      
      <nav className="w-20 bg-slate-950 flex flex-col items-center py-8 gap-10 border-r border-slate-800 shrink-0 z-50">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-xl"><Bot size={24} className="text-white" /></div>
        <div className="flex flex-col gap-8">
          <button onClick={() => setActiveTab('assistente')} className={`p-4 rounded-xl transition-all relative group ${activeTab === 'assistente' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={24} /></button>
          <button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-xl transition-all relative group ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}><BarChart3 size={24} /></button>
          <button onClick={() => setActiveTab('jornal')} className={`p-4 rounded-xl transition-all relative group ${activeTab === 'jornal' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}><Newspaper size={24} /></button>
          <button onClick={() => setActiveTab('aniversariantes')} className={`p-4 rounded-xl transition-all relative group ${activeTab === 'aniversariantes' ? 'bg-pink-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Cake size={24} /></button>
        </div>
        <div className="mt-auto flex flex-col items-center gap-2 pb-4">
           <div className={`w-2 h-2 rounded-full ${lastSyncTime ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
           <Cloud size={16} className="text-slate-700" />
        </div>
      </nav>

      <main className={`flex-1 flex flex-col relative overflow-y-auto custom-scrollbar ${activeTab === 'assistente' ? 'bg-[#f0f2f5]' : activeTab === 'jornal' ? 'bg-[#f4f1ea]' : activeTab === 'aniversariantes' ? 'bg-[#fff5f7]' : 'bg-white'}`}>
        
        {/* POPUPS ALERTAS */}
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[150] flex flex-col gap-4 w-full max-w-md pointer-events-none">
          {birthdayAlerts.map(alert => (
            <div key={alert.id} className="bg-white border-2 border-pink-500 rounded-[2rem] p-5 shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-12 duration-500 pointer-events-auto">
               <div className={`p-3 rounded-2xl ${alert.type === 'today' ? 'bg-pink-500 text-white animate-bounce' : 'bg-pink-50 text-pink-600'}`}>
                 {alert.type === 'today' ? <PartyPopper size={24}/> : <BellRing size={24}/>}
               </div>
               <div className="flex-1">
                 <p className="text-sm font-bold text-slate-800 leading-tight">{alert.message}</p>
               </div>
               <button onClick={() => setBirthdayAlerts(prev => prev.filter(a => a.id !== alert.id))} className="p-2 text-slate-300 hover:text-slate-900"><X size={18}/></button>
            </div>
          ))}
        </div>

        {activeTab === 'aniversariantes' ? (
          <div className="min-h-full flex flex-col p-6 md:p-12 relative max-w-7xl mx-auto w-full animate-in fade-in duration-700 pb-40">
            <header className="mb-12 flex items-center justify-between border-b-[6px] border-pink-500 pb-8 shrink-0">
               <div>
                  <h1 className="text-4xl md:text-5xl font-black text-slate-950 flex items-center gap-4 uppercase font-serif">
                     <Cake size={48} className="text-pink-500" /> Aniversariantes BRQA
                  </h1>
               </div>
               <button onClick={() => {
                  const people = state.aniversariantes.filter(e => e.month === MONTHS[new Date().getMonth()]).map(e => e.name);
                  if (people.length > 0) {
                    const entry: JornalEntry = { id: Date.now().toString(), date: new Date().toLocaleString('pt-BR'), content: `🎉 Aniversariantes do mês: ${people.join(', ')}!` };
                    setState(prev => ({ ...prev, jornal: { ...prev.jornal, history: [entry, ...prev.jornal.history] } }));
                    triggerScreenVibration();
                  }
               }} className="flex items-center gap-3 px-6 py-4 bg-slate-950 text-white rounded-xl font-black uppercase text-[10px] shadow-xl hover:bg-blue-600 transition-all">
                  <PartyPopper size={18} /> Publicar no Jornal
               </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
               <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  {state.aniversariantes.map((emp) => (
                     <div key={emp.id} className="bg-white group rounded-[2.5rem] border-2 border-slate-100 p-6 flex items-center gap-5 transition-all hover:border-pink-300 hover:shadow-2xl">
                        <div className="w-20 h-20 rounded-[1.8rem] bg-slate-50 flex-shrink-0 border-2 border-slate-100 overflow-hidden flex items-center justify-center">
                           {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" style={{ transform: `scale(${emp.photoZoom || 1})` }} /> : <User size={32} className="text-slate-200" />}
                        </div>
                        <div className="flex-1">
                           <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider">{emp.name}</h4>
                           <p className="text-[10px] font-bold text-pink-500 flex items-center gap-2 mt-1"><Calendar size={12} /> {emp.day} de {emp.month}</p>
                           <div className="flex items-center gap-3 mt-4">
                              <button onClick={() => { setEditingId(emp.id); setEmpName(emp.name); setEmpDay(emp.day); setEmpMonth(emp.month); setEmpPhoto(emp.photo || null); setEmpZoom(emp.photoZoom || 1); }} className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600"><Edit3 size={14}/></button>
                              <button onClick={() => setState(p => ({ ...p, aniversariantes: p.aniversariantes.filter(e => e.id !== emp.id) }))} className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>

               <div className="md:col-span-4">
                  <div className="bg-white rounded-[2.5rem] border-2 border-slate-950 p-8 sticky top-10 shadow-xl">
                     <h3 className="font-black uppercase tracking-widest text-[12px] flex items-center gap-3 mb-8"><UserPlus size={18} className="text-pink-500" /> Cadastro</h3>
                     <div className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                           <div onClick={() => empPhotoRef.current?.click()} className="w-24 h-24 rounded-[1.8rem] bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden group">
                              {empPhoto ? <img src={empPhoto} className="w-full h-full object-cover" style={{ transform: `scale(${empZoom})` }} /> : <ImageIcon size={20} className="opacity-20"/>}
                           </div>
                           <input type="range" min="1" max="3" step="0.1" value={empZoom} onChange={(e) => setEmpZoom(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg accent-pink-500" />
                        </div>
                        <input type="text" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Nome" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                        <div className="grid grid-cols-2 gap-4">
                           <input type="number" min="1" max="31" value={empDay} onChange={(e) => setEmpDay(parseInt(e.target.value))} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                           <select value={empMonth} onChange={(e) => setEmpMonth(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                        </div>
                        <button onClick={() => {
                          if (!empName.trim()) return;
                          const newEmp = { id: editingId || Date.now().toString(), name: empName, day: empDay, month: empMonth, photo: empPhoto || undefined, photoZoom: empZoom, reminderActive: true };
                          setState(p => ({ ...p, aniversariantes: editingId ? p.aniversariantes.map(e => e.id === editingId ? newEmp : e) : [...p.aniversariantes, newEmp] }));
                          setEmpName(''); setEmpPhoto(null); setEditingId(null);
                        }} className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-pink-600 transition-all">Salvar</button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ) : activeTab === 'jornal' ? (
          <div className="flex-1 flex flex-col p-6 md:p-12 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
            <header className="mb-12 flex justify-between items-end border-b-4 border-slate-950 pb-6">
              <h2 className="text-5xl font-black tracking-tighter uppercase font-serif flex items-center gap-4"><Newspaper size={48} /> Jornal do BRQA</h2>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
              <div className="md:col-span-8 space-y-8">
                <div className="bg-white border-2 border-slate-950 p-8 rounded-[2rem] shadow-xl">
                  <textarea value={state.jornal.currentContent} onChange={(e) => setState(p => ({ ...p, jornal: { ...p.jornal, currentContent: e.target.value }}))} placeholder="Escreva o registro operacional ou social do dia..." className="w-full h-40 bg-transparent resize-none outline-none font-bold text-lg text-slate-800" />
                  <div className="flex justify-end mt-4">
                    <button onClick={() => {
                      if (!state.jornal.currentContent.trim()) return;
                      const entry = { id: Date.now().toString(), date: new Date().toLocaleString('pt-BR'), content: state.jornal.currentContent };
                      setState(p => ({ ...p, jornal: { ...p.jornal, history: [entry, ...p.jornal.history], currentContent: '' }}));
                    }} className="px-10 py-4 bg-slate-950 text-white rounded-xl font-black uppercase text-[11px] hover:bg-blue-600 transition-all">Registrar</button>
                  </div>
                </div>
                <div className="space-y-6">
                  {state.jornal.history.map(entry => (
                    <div key={entry.id} className="bg-white border-2 border-slate-100 p-8 rounded-[2rem] hover:border-slate-300 transition-all">
                      <div className="flex justify-between mb-4 border-b border-slate-50 pb-4"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{entry.date}</span><button onClick={() => setState(p => ({ ...p, jornal: { ...p.jornal, history: p.jornal.history.filter(h => h.id !== entry.id) } }))} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button></div>
                      <p className="font-medium text-slate-800 leading-relaxed text-lg">{entry.content}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-4 space-y-8">
                <div className="bg-white border-2 border-slate-950 p-8 rounded-[2.5rem] shadow-lg">
                  <h3 className="font-black uppercase text-[12px] mb-6 flex items-center gap-3"><StickyNote size={18} className="text-yellow-500" /> Notas Rápidas</h3>
                  <div className="space-y-4">
                    <input type="text" onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const note = { id: Date.now().toString(), content: e.currentTarget.value, color: 'bg-yellow-50' };
                        setState(p => ({ ...p, jornal: { ...p.jornal, notes: [note, ...p.jornal.notes] } }));
                        e.currentTarget.value = '';
                      }
                    }} placeholder="Adicionar nota..." className="w-full p-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border-2 border-transparent focus:border-yellow-200" />
                    <div className="grid grid-cols-1 gap-4">
                      {state.jornal.notes.map(note => (
                        <div key={note.id} className={`${note.color} p-5 rounded-2xl border-2 border-slate-950/5 relative group`}>
                          <p className="font-bold text-slate-800 text-sm">{note.content}</p>
                          <button onClick={() => setState(p => ({ ...p, jornal: { ...p.jornal, notes: p.jornal.notes.filter(n => n.id !== note.id) } }))} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500"><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full relative">
            <header className="px-10 py-6 border-b flex items-center justify-between z-40 bg-white/80 backdrop-blur-2xl">
               <div className="flex items-center gap-5">
                  <AiAvatar isTalking={isPlayingAudio} />
                  <div>
                    <h2 className="font-black text-2xl text-slate-900 leading-tight">Terminal BRQA</h2>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span><span className="text-[10px] font-black uppercase text-slate-400">Auditoria Ativa</span></div>
                  </div>
               </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-12 py-12 space-y-12 custom-scrollbar pb-40">
               {currentChat?.messages.map(msg => (
                 <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                   <div className={`max-w-[90%] md:max-w-[80%] flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                     <div className={`p-6 md:p-8 rounded-[2rem] border transition-all ${msg.role === 'user' ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none' : 'bg-white text-slate-800 border-slate-200 rounded-tl-none shadow-sm'}`}>
                       {msg.parts.map((p, idx) => (
                         <div key={idx} className="flex flex-col gap-6">
                           {p.text && <div className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{p.text}</div>}
                           {p.inlineData && <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="rounded-2xl max-h-[500px] object-contain border cursor-pointer" onClick={() => setEnlargedImage(`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`)} />}
                         </div>
                       ))}
                     </div>
                     {msg.role === 'model' && (
                        <button onClick={() => handleOuvirDicas(msg.parts[0].text!)} className={`flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full transition-all text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 ${isPlayingAudio ? 'text-blue-600 ring-2 ring-blue-500/20 bg-blue-50 animate-pulse' : 'text-slate-500 hover:bg-blue-600 hover:text-white'}`}>
                          <Volume2 size={16} /> {isPlayingAudio ? 'Gabi está falando...' : 'Ouvir Auditoria'}
                        </button>
                     )}
                   </div>
                 </div>
               ))}
               {isTyping && <div className="flex gap-2 p-6 rounded-3xl w-fit shadow-md border bg-white border-slate-200 animate-pulse"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div><div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce delay-150"></div><div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce delay-300"></div></div>}
            </div>

            <footer className="px-6 md:px-10 py-10 bg-gradient-to-t from-[#f0f2f5] sticky bottom-0 z-40">
              <div className="max-w-5xl mx-auto flex flex-col gap-4">
                {selectedImage && (
                  <div className="relative w-24 h-24 ml-6 animate-in zoom-in duration-300">
                    <img src={selectedImage} className="w-full h-full object-cover rounded-xl border-2 border-blue-500 shadow-lg" />
                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-slate-900 text-white p-1 rounded-full shadow-md"><X size={12}/></button>
                  </div>
                )}
                <div className={`backdrop-blur-3xl border border-white/50 rounded-[3rem] p-3 shadow-2xl bg-white/80 flex items-center gap-4 px-6 py-4 transition-all ${isRecording ? 'ring-4 ring-red-500/20' : ''}`}>
                  <button onClick={() => fileInputRef.current?.click()} className="p-4 text-slate-400 hover:text-blue-600 transition-all bg-slate-100 rounded-full"><ImageIcon size={24}/></button>
                  <textarea 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)} 
                    onPaste={handlePaste}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
                    placeholder="Análise de auditoria... (Cole prints aqui)" 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-md py-4 resize-none font-semibold text-slate-900 custom-scrollbar" 
                    rows={1} 
                  />
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={isRecording ? stopRecording : startRecording} 
                      className={`p-4 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-blue-600'}`}
                    >
                      <Mic size={24} />
                    </button>
                    <button onClick={() => handleSend()} className="p-5 text-white bg-slate-950 rounded-[1.8rem] hover:bg-blue-600 px-10 font-black uppercase text-[11px] tracking-widest flex items-center gap-3 active:scale-95 transition-all">
                      Enviar <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { const r = new FileReader(); r.onload = (ev) => setSelectedImage(ev.target?.result as string); r.readAsDataURL(f); }
        }} className="hidden" accept="image/*" />
        <input type="file" ref={empPhotoRef} className="hidden" accept="image/*" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { const r = new FileReader(); r.onload = (ev) => setEmpPhoto(ev.target?.result as string); r.readAsDataURL(f); }
        }} />
      </main>

      <style>{`
        @keyframes talk-vibrate { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.04) rotate(0.4deg); } 75% { transform: scale(1.04) rotate(-0.4deg); } }
        .animate-talk-vibrate { animation: talk-vibrate 0.1s linear infinite; }
        @keyframes float-bunny { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .animate-float-bunny { animation: float-bunny 4s ease-in-out infinite; }
        @keyframes bunny-wobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }
        .animate-bunny-wobble { animation: bunny-wobble 0.2s ease-in-out infinite; }
        @keyframes screen-shake { 0%, 100% { transform: translate(0, 0); } 10% { transform: translate(-6px, -6px); } 30% { transform: translate(6px, 6px); } 50% { transform: translate(-6px, 6px); } 70% { transform: translate(6px, -6px); } }
        .animate-screen-shake { animation: screen-shake 0.1s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
