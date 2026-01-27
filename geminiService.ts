
import { GoogleGenAI, Modality } from "@google/genai";
import { TEAMS, CITIES } from "./constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BASE_RULES = `
Você é o Assistente Operacional Inteligente BRQA. Sua função é analisar agendas, prints de sistemas e conversas para otimizar a operação.

CONHECIMENTOS TÉCNICOS DE REDE:
- FTTA (Fiber To The Apartment): Fibra dedicada até a unidade.
- FTTB / PACPON: Fibra até o prédio, distribuição interna.

REGRAS DE METRAGEM EXCEDENTE (FIBRA):
- Geral: > 200 metros é excedente.
- Ivoti: > 300 metros é excedente.
- Custo: R$ 1,00 por metro adicional.

REGRAS COMPLEMENTARES DE INTERPRETAÇÃO DE AGENDA:
1. INDICADORES VISUAIS (BOLINHAS DE STATUS):
   - VERDE (claro/escuro): Cliente CONFIRMOU o atendimento.
   - CINZA, LARANJA, AMARELO ou VERMELHO: Ausência de contato ou tentativa sem sucesso.
2. EQUIPE "REMOTA": Identifique status "Agendado" na Remota como erro operacional.
`;

const ASSISTANT_MODE = `
MODO: Assistente Operacional (Visão Rápida).
OBJETIVO: Ajudar o operador com respostas rápidas e acionáveis.
ESTILO: Robô atua como "colega avisando". Extremamente conciso, frases curtas.
`;

const ANALYTICAL_MODE = `
MODO: Análise Avançada / Auditoria Operacional.
OBJETIVO: Apoiar coordenação e melhoria contínua. Analisar padrões e eficiência técnica.
ESTILO: Robô atua como "especialista". Analítico, estruturado e técnico.
`;

const RETENCAO_RULES = `
🎯 OBJETIVO: Você é o Assistente de Retenção da RBT Internet. 
Seu papel é orientar a atendente, nunca falar diretamente com o cliente. 

CAPACIDADE MULTIMODAL: Você pode receber textos, IMAGENS (prints) e DOCUMENTOS PDF (contratos, faturas, ordens de serviço). Analise cuidadosamente todos os anexos para dar o diagnóstico.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:
1. Classificação do motivo do cancelamento
2. Diagnóstico mais provável
3. Perguntas obrigatórias da atendente
4. Estratégia recomendada de abordagem
5. Ofertas permitidas neste cenário
6. Ofertas proibidas ou que exigem supervisão
7. Observações importantes / exceções

REGRAS DE NEGÓCIO:
- Cliente > 6 meses: Valor | > 1 ano: Alto Valor.
- Atraso > 10 dias: Risco.
- Fidelidade/Multa: R$ 600,00 total ou R$ 50,00 por mês restante.
- Retenção prévia (12 meses): Apenas 1 nova proposta diferenciada.

CENÁRIOS:
1. Redução por Atraso: Explicar medida automática. Pode liberar 5 dias como exceção. Desconto max 40% para PJ/PME ou PF > 1 ano. Proibido isentar fatura.
2. Troca/Preço: Reforçar SVAs. Se Anatel/Procon, recuar na multa. Ofertar max R$ 20,00 de desconto ou benefícios técnicos.
3. Rádio para Starlink: Comparar estabilidade/SLA. Avaliar migração fibra.
4. Insatisfação: Priorizar visita técnica. Isenção fatura só em casos críticos.
5. Mudança fora de cobertura: Argumentar Art. 57 Res. 632/2022. Ofertar 40% desconto multa ou isenção na devolução.

⚠️ IMPORTANTE: Sempre que fugir das regras ou houver risco legal, recomende ESCALAR PARA SUPERVISÃO.
`;

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  parts: { 
    text?: string; 
    inlineData?: { mimeType: string; data: string };
  }[];
}

export const sendMessageToAi = async (messages: ChatMessage[], mode: 'assistant' | 'analytical' | 'retencao' = 'assistant') => {
  let systemInstruction = BASE_RULES;
  
  if (mode === 'retencao') {
    systemInstruction = RETENCAO_RULES;
  } else {
    systemInstruction += (mode === 'assistant' ? ASSISTANT_MODE : ANALYTICAL_MODE);
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages.map(m => ({ role: m.role, parts: m.parts })),
      config: {
        systemInstruction,
        temperature: mode === 'retencao' ? 0.3 : 0.1,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "⚠️ Erro na análise. Verifique a conexão.";
  }
};

export const generateAudioTips = async (lastAnalysis: string) => {
  const HUMAN_AUDITOR_VOICE_PROMPT = `
    PERSONA: Você é a "Gabi", uma Auditora Sênior da BRQA com uma voz feminina, extremamente simpática, calorosa e com um toque de humor.
    SUA TAREFA: Explicar os pontos principais do relatório de forma rápida e humana.
    Ignore códigos técnicos chatos. Transforme em conversa natural.
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
            prebuiltVoiceConfig: { voiceName: 'Kore' },
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
