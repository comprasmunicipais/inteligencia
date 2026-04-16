import type { VisualBrief, VisualOutput } from "./types";

export function generateVisualPrompt(input: VisualBrief): VisualOutput {
  const baseStyle =
    "Visual SaaS premium do CM Pro, interface editorial limpa, tons sóbrios, contraste elegante, textura discreta, sem aparência genérica de banco de imagens, sem pessoas sorrindo posadas, sem neon exagerado.";

  const formatByChannel: Record<VisualBrief["channel"], string> = {
    instagram: "square 1:1",
    linkedin: "horizontal 16:9",
    facebook: "square 1:1",
  };

  const byAngle: Record<
    VisualBrief["angle"],
    Pick<VisualOutput, "visualObjective" | "composition"> & {
      framing: string;
      visualElements: string;
      sceneContext: string;
      interfaceStyle: string;
      atmosphere: string;
      avoid: string;
    }
  > = {
    dor: {
      visualObjective:
        "Representar tensão operacional e desorganização controlada no processo comercial.",
      composition:
        "Mesa de trabalho ou dashboard com excesso de etapas, notificações e documentos organizados de forma tensa, enquadramento fechado, sensação de urgência controlada.",
      framing:
        "Enquadramento fechado, foco em detalhes da operação e proximidade visual com a interface.",
      visualElements:
        "Dashboard com cards acumulados, múltiplas notificações, timeline com etapas atrasadas, documentos sobrepostos e indicadores de prioridade.",
      sceneContext:
        "Ambiente B2B de operação comercial, com contexto de gestão pós-oportunidade e sensação de acúmulo realista.",
      interfaceStyle:
        "Interface SaaS premium, modular, sofisticada, com tipografia limpa, grids consistentes e componentes bem definidos.",
      atmosphere:
        "Tensão operacional, confusão controlada, pressão silenciosa e sensação de que o time precisa retomar o controle.",
      avoid:
        "Evitar pessoas genéricas sorrindo, poses de stock photo, neon forte, visual futurista exagerado e cenas desconectadas de operação real.",
    },
    processo: {
      visualObjective:
        "Mostrar organização, clareza e fluxo operacional no contexto do CM Pro.",
      composition:
        "Composição limpa com fluxo visual entre etapas, dashboard estruturado, blocos bem alinhados, hierarquia clara e sensação de progresso consistente.",
      framing:
        "Enquadramento médio e organizado, com leitura clara da interface e do fluxo entre blocos.",
      visualElements:
        "Etapas bem definidas, cards alinhados, checklist, timeline fluida, indicadores de progresso e módulos organizados.",
      sceneContext:
        "Cenário B2B de gestão comercial com foco em organização do processo e visibilidade operacional.",
      interfaceStyle:
        "Dashboard editorial premium com UI madura, espaçamento generoso, contrastes controlados e aparência confiável.",
      atmosphere:
        "Clareza, método, fluxo contínuo, segurança operacional e sensação de processo bem conduzido.",
      avoid:
        "Evitar caos visual, rostos genéricos, ícones excessivamente ilustrativos, neon exagerado e aparência de template barato.",
    },
    prova: {
      visualObjective:
        "Evidenciar resultado prático de uma operação estruturada sem exagero visual.",
      composition:
        "Cena estável com indicadores organizados, interface madura, documentação alinhada e elementos que transmitam operação previsível e bem conduzida.",
      framing:
        "Enquadramento equilibrado, mais aberto, mostrando estabilidade do sistema e leitura clara dos resultados visuais.",
      visualElements:
        "Indicadores estáveis, dashboards consistentes, documentação organizada, status claros e sinais sutis de eficiência operacional.",
      sceneContext:
        "Contexto B2B com operação estruturada em andamento, mostrando maturidade de gestão sem triunfalismo.",
      interfaceStyle:
        "Visual SaaS premium com painéis refinados, aparência executiva e acabamento contemporâneo.",
      atmosphere:
        "Estabilidade, confiança, previsibilidade, resultado prático e operação madura.",
      avoid:
        "Evitar promessas visuais exageradas, estética heroica demais, personagens posados, banco de imagens genérico e excesso de efeitos.",
    },
  };

  const angleData = byAngle[input.angle];
  const postFormat = formatByChannel[input.channel];

  return {
    visualObjective: angleData.visualObjective,
    style: baseStyle,
    composition: angleData.composition,
    imagePrompt: `Criar imagem para post ${postFormat} de ${input.channel} do CM Pro sobre "${input.theme}". Basear a direção no conteúdo: "${input.content}". Objetivo visual: ${angleData.visualObjective} Enquadramento: ${angleData.framing} Composição: ${angleData.composition} Elementos visuais prioritários: ${angleData.visualElements} Contexto de cena: ${angleData.sceneContext} Estilo de interface: ${angleData.interfaceStyle} Atmosfera: ${angleData.atmosphere} Manter estética SaaS premium, contexto B2B, operação, dashboard, interface e gestão. Inserir sofisticação visual realista e contemporânea, com linguagem madura de software e operação comercial. Evitar: ${angleData.avoid} CTA de referência do post: "${input.cta}".`,
    notes: [
      "Priorizar linguagem visual de software premium e operação comercial estruturada.",
      "Usar elementos de interface, documentos, fluxos e contexto de trabalho em vez de rostos genéricos.",
      "Manter coerência com o posicionamento do CM Pro: clareza, processo e sofisticação prática.",
    ],
  };
}
