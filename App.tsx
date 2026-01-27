
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, Image as ImageIcon, X, 
  Bot, User, 
  LayoutGrid, BarChart3,
  Volume2, Trash2, Mic, Square,
  Newspaper, Save, 
  Edit3, StickyNote,
  Cake, PartyPopper, UserPlus, Calendar, 
  BellRing, CloudSync, Cloud, AlertTriangle, Terminal,
  CheckCircle2, RefreshCw, Plus, MessageSquare, MoreVertical,
  Check, ShieldCheck, FileText, File, Paperclip
} from 'lucide-react';
import { sendMessageToAi, generateAudioTips, ChatMessage } from './geminiService';
import { supabase } from './supabaseClient';

type DashboardTab = 'assistente' | 'retencao' | 'dashboard' | 'jornal' | 'aniversariantes';

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

interface PersistedState {
  assistente: { chats: Chat[]; currentChatId: string | null };
  retencao: { chats: Chat[]; currentChatId: string | null };
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

// Helpers de Áudio
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

const Lightbox = ({ src, onClose }: { src: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200 p-4" onClick={onClose}>
    <div className="absolute top-6 right-6">
       <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/20">
         <X size={24} />
       </button>
    </div>
    <div className="relative max-w-full max-h-full flex items-center justify-center cursor-zoom-out">
      <img src={src} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95" alt="Ampliação" />
    </div>
  </div>
);

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

const BunnyMascot = ({ 
  onTriggerGlobalVibrate, 
  monthAlert, 
  birthdayMessage,
  onPlayAudio 
}: { 
  onTriggerGlobalVibrate: () => void, 
  monthAlert?: string,
  birthdayMessage?: string,
  onPlayAudio: (text: string) => void
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [isWobbling, setIsWobbling] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [bubbleText, setBubbleText] = useState("Olá! Bem-vindo ao sistema BRQA. Estou aqui para ajudar você!");
  const bubbleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setShowBubble(true);
    if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = window.setTimeout(() => setShowBubble(false), 10000);
  }, []);

  useEffect(() => {
    if (monthAlert) {
      setBubbleText(monthAlert);
      setShowBubble(true);
      if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = window.setTimeout(() => setShowBubble(false), 20000);
    }
  }, [monthAlert]);

  const handleClick = () => {
    const now = Date.now();
    let newCount = 1;
    if (now - lastClickTime < 3000) newCount = clickCount + 1;
    setClickCount(newCount);
    setLastClickTime(now);

    if (newCount === 1) {
      setBubbleText(birthdayMessage || monthAlert || "Olá! Como posso ajudar hoje?");
      setShowBubble(true);
      if (bubbleTimeoutRef.current) window.clearTimeout(bubbleTimeoutRef.current);
      bubbleTimeoutRef.current = window.setTimeout(() => setShowBubble(false), 10000);
    } else if (newCount === 2) {
      setIsWobbling(true);
      if (birthdayMessage) {
        onPlayAudio(birthdayMessage);
      }
      setTimeout(() => setIsWobbling(false), 1000);
    } else if (newCount === 3) {
      setIsSmiling(true);
      onTriggerGlobalVibration();
      setTimeout(() => {
        setIsSmiling(false);
        setClickCount(0);
      }, 4000); 
    }
  };

  return (
    <div className="fixed top-2 right-4 z-[100] pointer-events-none select-none">
      <div className="relative flex flex-col items-center">
        {showBubble && (
          <div className="absolute -left-[280px] top-10 bg-white shadow-[0_25px_70px_rgba(0,0,0,0.2)] border-2 border-blue-50 rounded-[2.5rem] p-6 animate-in fade-in slide-in-from-right-8 duration-500 z-[101] w-[300px] pointer-events-auto">
            <div className="flex justify-between items-start mb-3">
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Assistente Digital</span>
               <button onClick={() => setShowBubble(false)} className="text-slate-300 hover:text-slate-600"><X size={14}/></button>
            </div>
            <p className="text-[12px] font-bold text-slate-800 leading-relaxed italic pr-2">{bubbleText}</p>
            <div className="absolute right-[-10px] top-8 w-5 h-5 bg-white border-r-2 border-t-2 border-blue-50 rotate-45"></div>
          </div>
        )}
        <div onClick={handleClick} className={`pointer-events-auto cursor-pointer animate-float-bunny ${isWobbling ? 'animate-bunny-wobble' : ''} ${isSmiling ? 'animate-dramatic-smile' : ''} transition-all duration-300`}>
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/527.png" alt="Mascote" className="w-56 h-56 object-contain filter drop-shadow-[0_20px_50px_rgba(59,130,246,0.5)] hover:scale-110 active:scale-95 transition-transform" />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('assistente');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados para Aniversariantes
  const [empName, setEmpName] = useState('');
  const [empDay, setEmpDay] = useState(1);
  const [empMonth, setEmpMonth] = useState('Janeiro');
  const [empPhoto, setEmpPhoto] = useState<string | null>(null);
  const [empZoom, setEmpZoom] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Helper para criar estado inicial resiliente
  const createInitialState = (loaded?: any): PersistedState => {
    const defaultChat = (name: string) => ({ 
      id: Math.random().toString(36).substr(2, 9), 
      name, 
      createdAt: Date.now(), 
      messages: [{ id: 'init', role: 'model' as const, parts: [{ text: '🤖 Sistema Pronto.' }] }] 
    });

    return {
      assistente: loaded?.assistente || { chats: [defaultChat('Início')], currentChatId: null },
      retencao: loaded?.retencao || { chats: [defaultChat('Retenção Ativa')], currentChatId: null },
      dashboard: loaded?.dashboard || { chats: [defaultChat('Auditoria Logística')], currentChatId: null },
      jornal: loaded?.jornal || { currentContent: '', history: [], notes: [] },
      aniversariantes: loaded?.aniversariantes || []
    };
  };

  const [state, setState] = useState<PersistedState>(() => {
    const saved = localStorage.getItem('brqa_v18_state') || localStorage.getItem('brqa_v17_state') || localStorage.getItem('brqa_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return createInitialState(parsed);
      } catch (e) {
        return createInitialState();
      }
    }
    return createInitialState();
  });

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<{name: string, data: string} | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mascotMonthAlert, setMascotMonthAlert] = useState<string | undefined>();
  const [mascotBirthdaySpeech, setMascotBirthdaySpeech] = useState<string | undefined>();

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [tempChatName, setTempChatName] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const empPhotoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const realtimeChannel = useRef<any>(null);
  const mascotActionSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2205/2205-preview.mp3');
    audio.crossOrigin = "anonymous";
    audio.volume = 1.0; 
    audio.load();
    mascotActionSoundRef.current = audio;
  }, []);

  useEffect(() => {
    const checkBirthdays = () => {
      const currentMonthStr = MONTHS[new Date().getMonth()];
      const monthlyBirthdays = state.aniversariantes.filter(emp => emp.month === currentMonthStr);
      if (monthlyBirthdays.length > 0) {
        const names = monthlyBirthdays.map(e => e.name).join(', ');
        const speechText = `Oi! Passei aqui para te contar uma coisa muito legal. Temos aniversariantes este mês: ${names}! Não esquece de preparar aquele parabéns especial e, quem sabe, o presente também, né? Eles merecem!`;
        setMascotBirthdaySpeech(speechText);
        setMascotMonthAlert(`Identifiquei ${monthlyBirthdays.length} aniversariante(s) em ${currentMonthStr}! Clique duas vezes em mim para ouvir os detalhes.`);
      }
    };
    const timer = setTimeout(checkBirthdays, 120000); 
    return () => clearTimeout(timer);
  }, [state.aniversariantes]);

  useEffect(() => {
    const loadState = async () => {
      try {
        let finalContent = null;
        const keys = ['app_data_v18', 'app_data_v17', 'app_data'];
        
        for (const key of keys) {
          const { data, error } = await supabase.from('brqa_storage').select('content').eq('id', key).maybeSingle();
          if (!error && data?.content) {
            finalContent = data.content;
            break;
          }
        }

        if (finalContent) {
          setState(prev => createInitialState(finalContent));
          setLastSyncTime(new Date());
          setCloudError(null);
        }
      } catch (err) { 
        console.error("Supabase Recovery Error:", err); 
      } finally { 
        setIsCloudLoading(false); 
      }
    };
    loadState();

    const channel = supabase.channel('brqa_sync');
    channel.on('broadcast', { event: 'vibrate' }, () => triggerLocalAction()).subscribe();
    realtimeChannel.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (isCloudLoading || cloudError === 'TABLE_MISSING') return;
    const saveState = async () => {
      setIsSyncing(true);
      localStorage.setItem('brqa_v18_state', JSON.stringify(state));
      try {
        await supabase.from('brqa_storage').upsert({ id: 'app_data_v18', content: state });
        setLastSyncTime(new Date()); setCloudError(null);
      } catch (err) { console.error("Sync Fail:", err); } 
      finally { setIsSyncing(false); }
    };
    const timeout = setTimeout(saveState, 3000);
    return () => clearTimeout(timeout);
    // Fixed typo: iisCloudLoading -> isCloudLoading
  }, [state, isCloudLoading, cloudError]);

  const triggerLocalAction = () => {
    document.body.classList.add('animate-screen-shake');
    if (mascotActionSoundRef.current) {
      mascotActionSoundRef.current.currentTime = 0;
      mascotActionSoundRef.current.play().catch(e => console.debug(e));
    }
    if ('vibrate' in navigator) navigator.vibrate([400, 200, 400]);
    setTimeout(() => document.body.classList.remove('animate-screen-shake'), 4000);
  };

  const triggerGlobalVibration = () => {
    triggerLocalAction();
    if (realtimeChannel.current) realtimeChannel.current.send({ type: 'broadcast', event: 'vibrate' });
  };

  const playMascotAudio = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    const audio = await generateAudioTips(text);
    if (audio) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await decodeAudioData(decodeBase64(audio), ctx);
      const src = ctx.createBufferSource();
      src.buffer = buffer; 
      src.connect(ctx.destination);
      src.onended = () => setIsPlayingAudio(false); 
      src.start();
    } else {
      setIsPlayingAudio(false);
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
    } catch (err) { alert("Ative o microfone para gravar."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      if (file.type === 'application/pdf') {
        setSelectedPdf({ name: file.name, data });
        setSelectedImage(null);
      } else if (file.type.startsWith('image/')) {
        setSelectedImage(data);
        setSelectedPdf(null);
      }
      // Limpa o valor para permitir re-seleção do mesmo arquivo
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const currentContextName = activeTab === 'dashboard' ? 'dashboard' : (activeTab === 'retencao' ? 'retencao' : 'assistente');
  const currentContext = state[currentContextName as keyof PersistedState] as any || createInitialState()[currentContextName as keyof PersistedState];
  
  const currentChat = useMemo(() => {
    if (!currentContext?.chats) return null;
    const chat = currentContext.chats.find((c: any) => c.id === currentContext.currentChatId);
    return chat || (currentContext.chats.length > 0 ? currentContext.chats[0] : null);
  }, [currentContext, activeTab]);

  const handleCreateChat = () => {
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const newChat: Chat = { 
      id: newId, 
      name: `Nova Conversa ${currentContext.chats.length + 1}`, 
      createdAt: Date.now(), 
      messages: [{ id: 'init', role: 'model', parts: [{ text: 'Pronto para uma nova análise!' }] }] 
    };
    setState(prev => {
      const db = prev[currentContextName as keyof PersistedState] as any;
      return { 
        ...prev, 
        [currentContextName]: { 
          chats: [newChat, ...db.chats], 
          currentChatId: newId 
        } 
      };
    });
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Deseja realmente excluir esta conversa?")) return;
    setState(prev => {
      const db = prev[currentContextName as keyof PersistedState] as any;
      const newChats = db.chats.filter((c: any) => c.id !== id);
      let nextId = db.currentChatId === id ? (newChats.length > 0 ? newChats[0].id : null) : db.currentChatId;
      if (newChats.length === 0) {
        const initial = { id: 's_auto', name: 'Nova Análise', createdAt: Date.now(), messages: [] };
        return { ...prev, [currentContextName]: { chats: [initial], currentChatId: 's_auto' } };
      }
      return { ...prev, [currentContextName]: { ...db, chats: newChats, currentChatId: nextId } };
    });
  };

  const startEditTitle = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingChatId(chat.id);
    setTempChatName(chat.name);
  };

  const saveChatTitle = () => {
    if (!editingChatId || !tempChatName.trim()) {
      setEditingChatId(null);
      return;
    }
    setState(prev => {
      const db = prev[currentContextName as keyof PersistedState] as any;
      const newChats = db.chats.map((c: any) => c.id === editingChatId ? { ...c, name: tempChatName.trim() } : c);
      return { ...prev, [currentContextName]: { ...db, chats: newChats } };
    });
    setEditingChatId(null);
  };

  const handleDeleteMessage = (msgId: string) => {
    setState(prev => {
      const db = prev[currentContextName as keyof PersistedState] as any;
      const newChats = db.chats.map((c: any) => c.id === db.currentChatId ? { ...c, messages: c.messages.filter((m: any) => m.id !== msgId) } : c);
      return { ...prev, [currentContextName]: { ...db, chats: newChats } };
    });
  };

  const handleSend = async (audioBase64?: string) => {
    if (!inputText.trim() && !selectedImage && !selectedPdf && !audioBase64) return;
    
    const userMsgParts = [];
    if (inputText.trim()) userMsgParts.push({ text: inputText });
    if (selectedImage) userMsgParts.push({ inlineData: { mimeType: "image/jpeg", data: selectedImage.split(',')[1] } });
    if (selectedPdf) userMsgParts.push({ inlineData: { mimeType: "application/pdf", data: selectedPdf.data.split(',')[1] } });
    if (audioBase64) userMsgParts.push({ inlineData: { mimeType: "audio/webm", data: audioBase64 } });

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', parts: userMsgParts as any };
    const updatedMessages = [...(currentChat?.messages || []), userMsg];
    
    setState(prev => {
      const db = prev[currentContextName as keyof PersistedState] as any;
      const chats = db.chats.map((c: any) => c.id === (currentChat?.id || db.currentChatId) ? { ...c, messages: updatedMessages } : c);
      return { ...prev, [currentContextName]: { ...db, chats } };
    });

    setInputText(''); setSelectedImage(null); setSelectedPdf(null); setIsTyping(true);
    
    const mode = activeTab === 'retencao' ? 'retencao' : (activeTab === 'assistente' ? 'assistant' : 'analytical');
    const responseText = await sendMessageToAi(updatedMessages, mode);
    
    const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', parts: [{ text: responseText }] };
    setState(prev => {
      const db = prev[currentContextName as keyof PersistedState] as any;
      const chats = db.chats.map((c: any) => c.id === (currentChat?.id || db.currentChatId) ? { ...c, messages: [...c.messages, modelMsg] } : c);
      return { ...prev, [currentContextName]: { ...db, chats } };
    });
    setIsTyping(false);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [currentChat?.messages, isTyping]);

  const dashboardTitles = {
    assistente: "Assistente Virtual do Agendamento",
    retencao: "Assistente da Retenção",
    dashboard: "Auditoria Logística"
  };

  if (isCloudLoading) return <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-6"><CloudSync size={64} className="text-blue-500 animate-spin" /><h2 className="text-2xl font-black uppercase tracking-widest animate-pulse">Iniciando Cloud IA</h2></div>;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
      {enlargedImage && <Lightbox src={enlargedImage} onClose={() => setEnlargedImage(null)} />}
      
      <BunnyMascot 
        onTriggerGlobalVibrate={triggerGlobalVibration} 
        monthAlert={mascotMonthAlert} 
        birthdayMessage={mascotBirthdaySpeech}
        onPlayAudio={playMascotAudio}
      />
      
      <nav className="w-20 bg-slate-950 flex flex-col items-center py-8 gap-8 border-r border-slate-800 shrink-0 z-50">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-xl mb-4"><Bot size={24} className="text-white" /></div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setActiveTab('assistente')} title="Assistente Virtual do Agendamento" className={`p-4 rounded-xl transition-all ${activeTab === 'assistente' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={24} /></button>
          <button onClick={() => setActiveTab('retencao')} title="Assistente da Retenção" className={`p-4 rounded-xl transition-all ${activeTab === 'retencao' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><ShieldCheck size={24} /></button>
          <button onClick={() => setActiveTab('dashboard')} title="Auditoria Logística" className={`p-4 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><BarChart3 size={24} /></button>
          <button onClick={() => setActiveTab('jornal')} title="Diário" className={`p-4 rounded-xl transition-all ${activeTab === 'jornal' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Newspaper size={24} /></button>
          <button onClick={() => setActiveTab('aniversariantes')} title="Equipe em Festa" className={`p-4 rounded-xl transition-all ${activeTab === 'aniversariantes' ? 'bg-pink-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Cake size={24} /></button>
        </div>
        <div className="mt-auto flex flex-col items-center gap-4 pb-6">
           <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'}`}></div>
           <Cloud size={16} className={isSyncing ? 'text-blue-500' : 'text-slate-700'} />
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-full bg-[#f0f2f5] overflow-hidden">
        {(activeTab === 'assistente' || activeTab === 'retencao' || activeTab === 'dashboard') ? (
          <div className="flex-1 flex overflow-hidden h-full">
            <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full animate-in slide-in-from-left duration-500">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                  <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-500">Conversas</h3>
                  <button onClick={handleCreateChat} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 text-[10px] font-bold uppercase"><Plus size={16}/> Novo</button>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/20">
                  {currentContext?.chats?.map((chat: any) => (
                    <div 
                      key={chat.id} 
                      onClick={() => { if (editingChatId !== chat.id) setState(p => ({ ...p, [currentContextName]: { ...currentContext, currentChatId: chat.id } })); }}
                      className={`group relative p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 border-2 ${currentChat?.id === chat.id ? 'bg-white border-blue-500 shadow-xl shadow-blue-50' : 'bg-transparent border-transparent hover:bg-white/80'}`}
                    >
                       <div className={`p-3 rounded-xl ${currentChat?.id === chat.id ? (activeTab === 'retencao' ? 'bg-indigo-600' : 'bg-blue-600') + ' text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                          <MessageSquare size={18} />
                       </div>
                       <div className="flex-1 overflow-hidden">
                          {editingChatId === chat.id ? (
                            <div className="flex items-center gap-2">
                              <input autoFocus value={tempChatName} onChange={(e) => setTempChatName(e.target.value)} onBlur={saveChatTitle} onKeyDown={(e) => { if (e.key === 'Enter') saveChatTitle(); if (e.key === 'Escape') setEditingChatId(null); }} className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 text-sm font-bold text-slate-900" />
                              <button onClick={saveChatTitle} className="text-green-500 p-1"><Check size={16}/></button>
                            </div>
                          ) : (
                            <>
                              <p className={`font-bold text-sm truncate ${currentChat?.id === chat.id ? 'text-blue-900' : 'text-slate-700'}`}>{chat.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{new Date(chat.createdAt).toLocaleDateString()}</p>
                            </>
                          )}
                       </div>
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => startEditTitle(chat, e)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-all" title="Editar título"><Edit3 size={16}/></button>
                          <button onClick={(e) => handleDeleteChat(chat.id, e)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-all" title="Excluir conversa"><Trash2 size={16}/></button>
                       </div>
                    </div>
                  ))}
               </div>
            </aside>

            <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
              <header className="px-10 py-6 border-b flex items-center justify-between z-40 bg-white/95 backdrop-blur-md shrink-0">
                 <div className="flex items-center gap-6">
                    <AiAvatar isTalking={isPlayingAudio} />
                    <div>
                      <h2 className="font-black text-2xl text-slate-950 tracking-tight leading-none">{dashboardTitles[currentContextName as keyof typeof dashboardTitles]}</h2>
                      <div className="flex items-center gap-2 mt-2">
                         <span className={`w-2 h-2 rounded-full animate-pulse ${activeTab === 'retencao' ? 'bg-indigo-500' : 'bg-green-500'}`}></span>
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest truncate max-w-[200px]">{currentChat?.name || 'Iniciando...'}</span>
                      </div>
                    </div>
                 </div>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-12 py-10 space-y-12 custom-scrollbar bg-[#f8fafc]">
                 {currentChat?.messages.map(msg => (
                   <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-6 duration-500 group/msg`}>
                     <div className={`max-w-[85%] flex flex-col gap-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                       <div className="relative">
                         <div className={`p-8 rounded-[2.5rem] border ${msg.role === 'user' ? (activeTab === 'retencao' ? 'bg-indigo-600' : 'bg-blue-600') + ' text-white border-blue-500 rounded-tr-none shadow-xl' : 'bg-white text-slate-800 border-slate-100 rounded-tl-none shadow-sm'}`}>
                           {msg.parts.map((p, idx) => (
                             <div key={idx} className="flex flex-col gap-8">
                               {p.text && <div className="text-[16px] font-medium leading-relaxed whitespace-pre-wrap">{p.text}</div>}
                               {p.inlineData && p.inlineData.mimeType.includes('image') && <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="rounded-3xl max-h-[500px] object-contain border-4 border-white shadow-lg cursor-pointer" onClick={() => setEnlargedImage(`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`)} />}
                               {p.inlineData && p.inlineData.mimeType.includes('pdf') && (
                                  <div className="flex items-center gap-4 p-5 bg-black/10 rounded-3xl border border-white/20">
                                     <div className="p-3 bg-red-500 text-white rounded-xl shadow-lg">
                                        <FileText size={24} />
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest opacity-60">Documento PDF</span>
                                        <span className="text-sm font-bold">Arquivo em análise pela IA</span>
                                     </div>
                                  </div>
                               )}
                               {p.inlineData && p.inlineData.mimeType.includes('audio') && <div className="flex items-center gap-3 p-4 bg-black/5 rounded-2xl"><Volume2 size={24}/> <span className="text-xs font-black uppercase tracking-widest opacity-60">Mensagem de Voz</span></div>}
                             </div>
                           ))}
                         </div>
                         <button onClick={() => handleDeleteMessage(msg.id!)} className="absolute -top-3 -right-3 p-2 bg-white text-slate-300 hover:text-red-500 rounded-full shadow-lg opacity-0 group-hover/msg:opacity-100 transition-all border border-slate-50"><Trash2 size={14}/></button>
                       </div>
                       {msg.role === 'model' && (
                          <button onClick={async () => playMascotAudio(msg.parts[0].text!)} className={`flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${isPlayingAudio ? 'text-blue-600 ring-4 ring-blue-500/5' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Volume2 size={18} /> {isPlayingAudio ? 'Narrando...' : 'Ouvir Análise'}
                          </button>
                       )}
                     </div>
                   </div>
                 ))}
                 {isTyping && <div className="flex gap-2 p-6 rounded-3xl w-fit shadow-md border bg-white border-slate-50 animate-pulse"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300"></div></div>}
              </div>

              <footer className="px-8 py-8 border-t bg-white shrink-0">
                <div className="max-w-4xl mx-auto flex flex-col gap-4">
                  {(selectedImage || selectedPdf) && (
                    <div className="relative w-32 h-32 mb-2 animate-in zoom-in duration-300">
                      {selectedImage ? (
                        <img src={selectedImage} className="w-full h-full object-cover rounded-3xl border-4 border-blue-500 shadow-xl" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 rounded-3xl border-4 border-blue-500 flex flex-col items-center justify-center gap-2 p-2">
                          <FileText size={32} className="text-blue-500" />
                          <span className="text-[8px] font-black uppercase text-center truncate w-full">{selectedPdf?.name}</span>
                        </div>
                      )}
                      <button onClick={() => { setSelectedImage(null); setSelectedPdf(null); }} className="absolute -top-3 -right-3 bg-slate-950 text-white p-2 rounded-full shadow-xl"><X size={12}/></button>
                    </div>
                  )}
                  <div className={`border-2 border-slate-100 rounded-[3rem] p-3 bg-slate-50 flex items-center gap-4 px-6 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-2xl focus-within:shadow-blue-50`}>
                    <button onClick={() => fileInputRef.current?.click()} className="p-4 text-slate-400 hover:text-blue-600 transition-all bg-white rounded-full shadow-sm" title="Anexar Imagem ou PDF"><Paperclip size={24}/></button>
                    <textarea value={inputText} onPaste={handlePaste} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Anexe um PDF, cole um print ou digite aqui..." className="flex-1 bg-transparent border-none focus:ring-0 text-lg py-4 resize-none font-semibold text-slate-900 custom-scrollbar max-h-32" rows={1} />
                    <div className="flex items-center gap-4">
                       <button onClick={isRecording ? stopRecording : startRecording} className={`p-5 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg' : 'bg-white text-slate-400 hover:text-red-500 shadow-sm'}`}>{isRecording ? <Square size={24} /> : <Mic size={24} />}</button>
                       <button onClick={() => handleSend()} className={`p-5 text-white rounded-[2rem] px-10 font-black uppercase text-[12px] tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-xl ${activeTab === 'retencao' ? 'bg-indigo-900 hover:bg-indigo-600' : 'bg-slate-950 hover:bg-blue-600'}`}>Enviar <Send size={20} /></button>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        ) : activeTab === 'jornal' ? (
           <div className="flex-1 p-12 overflow-y-auto custom-scrollbar h-full">
              <h2 className="text-4xl font-black mb-8 flex items-center gap-4 uppercase"><Newspaper size={40}/> Diário de Agendamento</h2>
              <textarea value={state.jornal.currentContent} onChange={(e) => setState(p => ({ ...p, jornal: { ...p.jornal, currentContent: e.target.value }}))} placeholder="O que aconteceu de importante no setor hoje?" className="w-full h-40 p-10 bg-white border-2 border-slate-100 rounded-[3rem] font-bold text-xl outline-none focus:border-blue-500 shadow-lg transition-all mb-8" />
              <button onClick={() => { if (!state.jornal.currentContent.trim()) return; const entry = { id: Date.now().toString(), date: new Date().toLocaleString('pt-BR'), content: state.jornal.currentContent }; setState(p => ({ ...p, jornal: { ...p.jornal, history: [entry, ...p.jornal.history], currentContent: '' }})); }} className="px-12 py-5 bg-slate-950 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-600 transition-all mb-16">Publicar no Diário</button>
              <div className="space-y-8">
                {state.jornal.history.map(h => (
                  <div key={h.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm group relative hover:shadow-md transition-all">
                    <button onClick={() => setState(p => ({ ...p, jornal: { ...p.jornal, history: p.jornal.history.filter(it => it.id !== h.id) } }))} className="absolute top-8 right-8 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={24}/></button>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">{h.date}</p>
                    <p className="text-xl font-medium text-slate-800 leading-relaxed">{h.content}</p>
                  </div>
                ))}
              </div>
           </div>
        ) : (
          <div className="flex-1 p-12 overflow-y-auto custom-scrollbar h-full">
             <header className="mb-12 border-b-[6px] border-pink-500 pb-10 flex justify-between items-end">
                <h2 className="text-4xl font-black flex items-center gap-4 uppercase font-serif"><Cake size={40} className="text-pink-500"/> Equipe em Festa</h2>
             </header>
             <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {state.aniversariantes.map(emp => (
                    <div key={emp.id} className="bg-white p-8 rounded-[3rem] border-2 border-slate-100 flex items-center gap-6 shadow-sm hover:shadow-xl transition-all group relative">
                      <div className="w-24 h-24 rounded-[2rem] bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-slate-50">
                        {emp.photo ? <img src={emp.photo} style={{transform: `scale(${emp.photoZoom})` }} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-300"/>}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-800 uppercase text-sm">{emp.name}</p>
                        <p className="text-pink-500 font-bold text-xs flex items-center gap-2 mt-1"><Calendar size={14}/> {emp.day} de {emp.month}</p>
                        <div className="flex gap-4 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => { setEditingId(emp.id); setEmpName(emp.name); setEmpDay(emp.day); setEmpMonth(emp.month); setEmpPhoto(emp.photo || null); setEmpZoom(emp.photoZoom || 1); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 size={18}/></button>
                           <button onClick={() => setState(p => ({ ...p, aniversariantes: p.aniversariantes.filter(e => e.id !== emp.id) }))} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="md:col-span-4">
                  <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-950 shadow-2xl sticky top-0">
                    <h3 className="font-black text-[11px] uppercase tracking-widest mb-10 text-slate-500 flex items-center gap-3"><UserPlus size={18} className="text-pink-500"/> Registro</h3>
                    <div className="space-y-8">
                      <div className="flex flex-col items-center gap-4">
                         <div onClick={() => empPhotoRef.current?.click()} className="w-32 h-32 rounded-[2.5rem] bg-slate-50 border-4 border-dashed border-slate-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-pink-300 transition-all shadow-inner">
                            {empPhoto ? <img src={empPhoto} style={{transform: `scale(${empZoom})` }} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="opacity-10"/>}
                         </div>
                         <input type="range" min="1" max="3" step="0.1" value={empZoom} onChange={(e) => setEmpZoom(parseFloat(e.target.value))} className="w-full accent-pink-500" />
                      </div>
                      <input type="text" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Nome completo" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold border-2 border-transparent focus:border-pink-500 outline-none transition-all shadow-sm" />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" min="1" max="31" value={empDay} onChange={(e) => setEmpDay(parseInt(e.target.value))} className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold" />
                        <select value={empMonth} onChange={(e) => setEmpMonth(e.target.value)} className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold outline-none">
                          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <button onClick={() => { if (!empName.trim()) return; const newEmp = { id: editingId || Date.now().toString(), name: empName, day: empDay, month: empMonth, photo: empPhoto || undefined, photoZoom: empZoom, reminderActive: true }; setState(p => ({ ...p, aniversariantes: editingId ? p.aniversariantes.map(e => e.id === editingId ? newEmp : e) : [...p.aniversariantes, newEmp] })); setEmpName(''); setEmpPhoto(null); setEditingId(null); }} className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-widest hover:bg-pink-600 transition-all shadow-xl shadow-pink-100">Salvar Registro</button>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" accept="image/*,application/pdf" />
        <input type="file" ref={empPhotoRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (ev) => setEmpPhoto(ev.target?.result as string); r.readAsDataURL(f); } }} />
      </main>

      <style>{`
        @keyframes talk-vibrate { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.06) rotate(0.6deg); } 75% { transform: scale(1.06) rotate(-0.6deg); } }
        .animate-talk-vibrate { animation: talk-vibrate 0.12s linear infinite; }
        @keyframes float-bunny { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
        .animate-float-bunny { animation: float-bunny 6s ease-in-out infinite; }
        @keyframes bunny-wobble { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-12deg); } 75% { transform: rotate(12deg); } }
        .animate-bunny-wobble { animation: bunny-wobble 0.25s ease-in-out infinite; }
        @keyframes screen-shake { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 10% { transform: translate(-20px, -20px) rotate(-2deg); } 30% { transform: translate(20px, 20px) rotate(2deg); } 50% { transform: translate(-20px, 20px) rotate(-2deg); } 70% { transform: translate(20px, -20px) rotate(2deg); } }
        body.animate-screen-shake { animation: screen-shake 0.08s linear infinite; }
        @keyframes dramatic-smile { 0% { transform: scale(1) rotate(0deg); filter: contrast(1) brightness(1) hue-rotate(0deg); } 50% { transform: scale(1.6) rotate(12deg); filter: contrast(3) brightness(1.8) hue-rotate(180deg) drop-shadow(0 0 60px rgba(239,68,68,1)); } 100% { transform: scale(1) rotate(0deg); filter: contrast(1) brightness(1) hue-rotate(0deg); } }
        .animate-dramatic-smile { animation: dramatic-smile 4s ease-in-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 30px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default App;
