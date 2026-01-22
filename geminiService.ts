
import { GoogleGenAI, Modality } from "@google/genai";
import { TEAMS, CITIES } from "./constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BASE_RULES = `
Você é o Assistente Operacional Inteligente BRQA.

CONHECIMENTOS TÉCNICOS DE REDE:
- FTTA (Fiber To The Apartment): Fibra dedicada até a unidade, maior controle de metragem.
- FTTB / PACPON (Fiber To The Building): Fibra até o prédio, distribuição interna compartilhada.

REGRAS DE METRAGEM EXCEDENTE (FIBRA):
- Regra Geral: Acima de 200 metros é excedente.
- Exceção Ivoti: Acima de 300 metros é excedente.
- Custo: R$ 1,00 por metro adicional.

DIRETRIZES TÉCNICAS E LOGÍSTICAS:
1. Capacidade: Máximo 4 períodos por equipe/dia.
2. Suporte (S1-S8): Foco em "Sem Acesso" e emergências (50% livre).
3. Logística: Identifique sequências ineficientes. Agrupe demandas por proximidade.

CONTEXTO DAS EQUIPES: ${JSON.stringify(TEAMS)}
CIDADES ATENDIDAS: ${JSON.stringify(CITIES)}

CLAREZA TÉCNICA:
- Ajuste o nível conforme o contexto. Evite jargão excessivo para clientes.
`;

const ASSISTANT_MODE = `
MODO: Assistente Operacional (Visão Rápida).
OBJETIVO: Ajudar o operador com respostas rápidas e acionáveis.
ESTILO: Robô atua como "colega avisando". Extremamente conciso, frases curtas.
`;

const ANALYTICAL_MODE = `
MODO: Análise Avançada / Auditoria Operacional.
OBJETIVO: Apoiar coordenação e melhoria contínua. Analisar padrões e eficiência.
ESTILO: Robô atua como "especialista". Analítico, estruturado e técnico.
`;

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  parts: { 
    text?: string; 
    inlineData?: { mimeType: string; data: string };
  }[];
}

export const sendMessageToAi = async (messages: ChatMessage[], mode: 'assistant' | 'analytical' = 'assistant') => {
  const modeInstruction = mode === 'assistant' ? ASSISTANT_MODE : ANALYTICAL_MODE;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages.map(m => ({ role: m.role, parts: m.parts })),
      config: {
        systemInstruction: BASE_RULES + modeInstruction,
        temperature: 0.2,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "⚠️ Dados insuficientes para análise completa no momento.";
  }
};

/**
 * Converte a análise técnica em uma explicação auditiva humana e fluida.
 * Foca apenas no essencial (Resumo, Pontos Críticos e Recomendações).
 */
export const generateAudioTips = async (lastAnalysis: string) => {
  // Prompt de Personalidade de Auditora Sênior super simpática para o TTS
  const HUMAN_AUDITOR_VOICE_PROMPT = `
    PERSONA: Você é a "Gabi", uma Auditora Sênior da BRQA com uma voz feminina, extremamente simpática, calorosa e com um toque de humor.
    SUA TAREFA: Explicar os pontos principais do relatório de forma rápida, como se estivesse contando uma novidade boa (ou dando um conselho de amiga) para um colega.

    REGRAS DE OURO DA GABI:
    1. TOM: Use uma voz feminina, alegre e acolhedora. Pode soltar um "Oi! Deixa eu te contar...", "Olha só que curioso...", ou "Damos um jeitinho nisso!".
    2. HUMOR: Use um humor leve e humano. Se algo estiver errado, não seja dura, seja resolutiva com um sorriso na voz.
    3. FLUIDEZ: Converta tópicos em frases de conversa natural. Esqueça que existe uma lista.
    4. VELOCIDADE: Vá direto ao ponto. O usuário quer a solução rápido, mas com carinho.
    5. O QUE IGNORAR: Nunca leia asteriscos, símbolos, códigos técnicos chatos ou pontuação. Transforme tudo em fala humana.
    6. CONTEÚDO: Resuma o que é mais importante, aponte o risco e dê a recomendação de ouro.
    
    Exemplo: "Oi! Analisei aqui e, olha, temos um detalhezinho na metragem de Ivoti, mas nada que a gente não resolva. Minha dica é ajustar a rota da equipe quatro pra ganhar tempo. Vamos nessa?"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: `${HUMAN_AUDITOR_VOICE_PROMPT}\n\nCONTEÚDO PARA FALAR AGORA:\n${lastAnalysis}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore costuma ter uma boa versatilidade para tons femininos/neutros amigáveis
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};
