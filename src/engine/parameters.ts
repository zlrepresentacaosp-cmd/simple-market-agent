// Regras puras de parâmetros de negócio (sem I/O). Compartilhado por server e web.

export type ParamType =
  "moeda" | "percentual" | "inteiro" | "decimal" | "horario" | "texto" | "email" | "lista";

export interface ListField {
  chave: string;
  rotulo: string;
  tipo: "texto" | "url" | "inteiro";
}

export interface ParamDef {
  chave: string;
  grupo: GrupoChave;
  rotulo: string;
  descricao?: string;
  tipo: ParamType;
  unidade?: string;
  /** Valor inicial da especificação. null = campo [PREENCHER] (começa vazio). */
  padrao: unknown;
  /** Campo [PREENCHER]: não pode ser inventado, começa vazio e editável. */
  preencher?: boolean;
  min?: number;
  max?: number;
  campos?: ListField[];
}

export type GrupoChave =
  | "financeiro"
  | "custos_fixos"
  | "tributario"
  | "cobertura"
  | "pereciveis"
  | "concorrentes"
  | "fornecedores"
  | "automacao";

export const GRUPOS: { chave: GrupoChave; rotulo: string }[] = [
  { chave: "financeiro", rotulo: "Financeiro e metas" },
  { chave: "custos_fixos", rotulo: "Custos fixos" },
  { chave: "tributario", rotulo: "Tributação" },
  { chave: "cobertura", rotulo: "Cobertura e estoque de segurança (curva ABC)" },
  { chave: "pereciveis", rotulo: "Tetos de perecíveis e giro" },
  { chave: "concorrentes", rotulo: "Concorrentes" },
  { chave: "fornecedores", rotulo: "Fornecedores" },
  { chave: "automacao", rotulo: "Automação e notificações" },
];

export const PARAMETROS: ParamDef[] = [
  // Financeiro
  {
    chave: "faturamento_medio_mensal",
    grupo: "financeiro",
    rotulo: "Faturamento médio mensal",
    tipo: "moeda",
    padrao: 260000,
    min: 0,
  },
  {
    chave: "margem_bruta_alvo",
    grupo: "financeiro",
    rotulo: "Margem bruta alvo",
    tipo: "percentual",
    padrao: 35,
    min: 0,
    max: 100,
  },
  {
    chave: "orcamento_compras_mensal",
    grupo: "financeiro",
    rotulo: "Orçamento mensal de compras (CMV alvo)",
    tipo: "moeda",
    padrao: 169000,
    min: 0,
  },
  {
    chave: "salarios_referencia",
    grupo: "financeiro",
    rotulo: "Salários (referência)",
    tipo: "moeda",
    padrao: 8900,
    min: 0,
  },

  // Custos fixos [PREENCHER]
  {
    chave: "aluguel",
    grupo: "custos_fixos",
    rotulo: "Aluguel",
    tipo: "moeda",
    padrao: null,
    preencher: true,
    min: 0,
  },
  {
    chave: "energia",
    grupo: "custos_fixos",
    rotulo: "Energia",
    tipo: "moeda",
    padrao: null,
    preencher: true,
    min: 0,
  },
  {
    chave: "pro_labore",
    grupo: "custos_fixos",
    rotulo: "Pró-labore",
    tipo: "moeda",
    padrao: null,
    preencher: true,
    min: 0,
  },
  {
    chave: "outros_custos_fixos",
    grupo: "custos_fixos",
    rotulo: "Outros custos fixos",
    tipo: "moeda",
    padrao: null,
    preencher: true,
    min: 0,
  },
  {
    chave: "encargos_percentual",
    grupo: "custos_fixos",
    rotulo: "Encargos sobre salários",
    tipo: "percentual",
    padrao: null,
    preencher: true,
    min: 0,
    max: 100,
  },

  // Tributário [PREENCHER]
  {
    chave: "regime_tributario",
    grupo: "tributario",
    rotulo: "Regime tributário",
    tipo: "texto",
    padrao: null,
    preencher: true,
  },
  {
    chave: "aliquota_tributaria",
    grupo: "tributario",
    rotulo: "Alíquota tributária",
    tipo: "percentual",
    padrao: null,
    preencher: true,
    min: 0,
    max: 100,
  },

  // Cobertura ABC
  {
    chave: "cobertura_dias_a",
    grupo: "cobertura",
    rotulo: "Cobertura — curva A",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 7,
    min: 0,
  },
  {
    chave: "cobertura_dias_b",
    grupo: "cobertura",
    rotulo: "Cobertura — curva B",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 14,
    min: 0,
  },
  {
    chave: "cobertura_dias_c",
    grupo: "cobertura",
    rotulo: "Cobertura — curva C",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 21,
    min: 0,
  },
  {
    chave: "seguranca_dias_a",
    grupo: "cobertura",
    rotulo: "Segurança — curva A",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 2,
    min: 0,
  },
  {
    chave: "seguranca_dias_b",
    grupo: "cobertura",
    rotulo: "Segurança — curva B",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 2,
    min: 0,
  },
  {
    chave: "seguranca_dias_c",
    grupo: "cobertura",
    rotulo: "Segurança — curva C",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 0,
    min: 0,
  },

  // Perecíveis
  {
    chave: "teto_hortifruti_dias",
    grupo: "pereciveis",
    rotulo: "Teto — hortifrúti",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 3,
    min: 0,
  },
  {
    chave: "teto_acougue_dias",
    grupo: "pereciveis",
    rotulo: "Teto — açougue",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 3,
    min: 0,
  },
  {
    chave: "teto_padaria_matinais_dias",
    grupo: "pereciveis",
    rotulo: "Teto — padaria/matinais",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 2,
    min: 0,
  },
  {
    chave: "teto_frios_congelados_dias",
    grupo: "pereciveis",
    rotulo: "Teto — frios/congelados",
    tipo: "inteiro",
    unidade: "dias",
    padrao: 7,
    min: 0,
  },
  {
    chave: "giro_minimo",
    grupo: "pereciveis",
    rotulo: "Giro mínimo",
    tipo: "decimal",
    padrao: 3,
    min: 0,
  },

  // Concorrentes
  {
    chave: "limite_concorrente_mais_caro_atencao",
    grupo: "concorrentes",
    rotulo: "Nosso preço mais caro — atenção",
    tipo: "percentual",
    padrao: 10,
    min: 0,
    max: 100,
  },
  {
    chave: "limite_concorrente_mais_caro_critico",
    grupo: "concorrentes",
    rotulo: "Nosso preço mais caro — crítico",
    tipo: "percentual",
    padrao: 15,
    min: 0,
    max: 100,
  },
  {
    chave: "limite_concorrente_mais_barato_atencao",
    grupo: "concorrentes",
    rotulo: "Nosso preço mais barato — atenção",
    tipo: "percentual",
    padrao: 10,
    min: 0,
    max: 100,
  },
  {
    chave: "limite_concorrente_mais_barato_critico",
    grupo: "concorrentes",
    rotulo: "Nosso preço mais barato — crítico",
    tipo: "percentual",
    padrao: 15,
    min: 0,
    max: 100,
  },
  {
    chave: "concorrentes",
    grupo: "concorrentes",
    rotulo: "Concorrentes e URLs",
    tipo: "lista",
    padrao: null,
    preencher: true,
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto" },
      { chave: "url", rotulo: "URL", tipo: "url" },
    ],
  },

  // Fornecedores [PREENCHER]
  {
    chave: "fornecedores_prazos",
    grupo: "fornecedores",
    rotulo: "Prazos e dias de pedido dos fornecedores",
    tipo: "lista",
    padrao: null,
    preencher: true,
    campos: [
      { chave: "fornecedor", rotulo: "Fornecedor", tipo: "texto" },
      { chave: "prazo_entrega_dias", rotulo: "Prazo de entrega (dias)", tipo: "inteiro" },
      { chave: "dias_pedido", rotulo: "Dias de pedido", tipo: "texto" },
    ],
  },

  // Automação
  {
    chave: "horario_automacao",
    grupo: "automacao",
    rotulo: "Horário da automação diária",
    tipo: "horario",
    padrao: "08:00",
  },
  {
    chave: "fuso_horario",
    grupo: "automacao",
    rotulo: "Fuso horário",
    tipo: "texto",
    padrao: "America/Sao_Paulo",
  },
  {
    chave: "email_notificacoes",
    grupo: "automacao",
    rotulo: "E-mail de notificações",
    tipo: "email",
    padrao: null,
    preencher: true,
  },
];

const POR_CHAVE = new Map(PARAMETROS.map((p) => [p.chave, p]));

export function getParamDef(chave: string): ParamDef | undefined {
  return POR_CHAVE.get(chave);
}

export type ValidationResult = { ok: true; value: unknown } | { ok: false; error: string };

/** Converte "1.234,56" ou "1234.56" em número. Retorna NaN se inválido. */
export function parseNumeroBR(input: string): number {
  const s = input.trim().replace(/\s|R\$|%/g, "");
  if (s === "") return NaN;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return NaN;
  return Number(normalized);
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseNumeroBR(v);
  return NaN;
}

export function validarParametro(def: ParamDef, raw: unknown): ValidationResult {
  const vazio =
    raw === null ||
    raw === undefined ||
    (typeof raw === "string" && raw.trim() === "") ||
    (Array.isArray(raw) && raw.length === 0);
  if (vazio) {
    if (def.preencher) return { ok: true, value: null };
    return { ok: false, error: `${def.rotulo}: valor obrigatório.` };
  }

  switch (def.tipo) {
    case "moeda":
    case "percentual":
    case "decimal":
    case "inteiro": {
      const n = toNumber(raw);
      if (!Number.isFinite(n)) return { ok: false, error: `${def.rotulo}: número inválido.` };
      if (def.tipo === "inteiro" && !Number.isInteger(n))
        return { ok: false, error: `${def.rotulo}: deve ser inteiro.` };
      if (def.min !== undefined && n < def.min)
        return { ok: false, error: `${def.rotulo}: mínimo ${def.min}.` };
      if (def.max !== undefined && n > def.max)
        return { ok: false, error: `${def.rotulo}: máximo ${def.max}.` };
      return { ok: true, value: def.tipo === "moeda" ? Math.round(n * 100) / 100 : n };
    }
    case "horario": {
      const s = String(raw).trim();
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))
        return { ok: false, error: `${def.rotulo}: use HH:MM.` };
      return { ok: true, value: s };
    }
    case "email": {
      const s = String(raw).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
        return { ok: false, error: `${def.rotulo}: e-mail inválido.` };
      return { ok: true, value: s };
    }
    case "texto": {
      if (typeof raw !== "string") return { ok: false, error: `${def.rotulo}: texto inválido.` };
      return { ok: true, value: raw.trim() };
    }
    case "lista": {
      if (!Array.isArray(raw)) return { ok: false, error: `${def.rotulo}: lista inválida.` };
      const campos = def.campos ?? [];
      const linhas: Record<string, unknown>[] = [];
      for (const [i, item] of raw.entries()) {
        if (typeof item !== "object" || item === null)
          return { ok: false, error: `${def.rotulo}: linha ${i + 1} inválida.` };
        const linha: Record<string, unknown> = {};
        for (const c of campos) {
          const v = (item as Record<string, unknown>)[c.chave];
          if (v === undefined || v === null || String(v).trim() === "") {
            return {
              ok: false,
              error: `${def.rotulo}: linha ${i + 1}, "${c.rotulo}" obrigatório.`,
            };
          }
          if (c.tipo === "inteiro") {
            const n = toNumber(v);
            if (!Number.isInteger(n) || n < 0)
              return {
                ok: false,
                error: `${def.rotulo}: linha ${i + 1}, "${c.rotulo}" deve ser inteiro ≥ 0.`,
              };
            linha[c.chave] = n;
          } else if (c.tipo === "url") {
            const s = String(v).trim();
            if (!/^https?:\/\/\S+$/.test(s))
              return { ok: false, error: `${def.rotulo}: linha ${i + 1}, URL inválida.` };
            linha[c.chave] = s;
          } else {
            linha[c.chave] = String(v).trim();
          }
        }
        linhas.push(linha);
      }
      return { ok: true, value: linhas };
    }
  }
}

/** Valores iniciais para semear o banco. [PREENCHER] => null. */
export function valoresPadrao(): Record<string, unknown> {
  return Object.fromEntries(PARAMETROS.map((p) => [p.chave, p.preencher ? null : p.padrao]));
}
