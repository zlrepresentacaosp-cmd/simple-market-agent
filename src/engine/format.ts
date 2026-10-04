export const FUSO_PADRAO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** R$ 1.234,56 */
export function formatarMoeda(v: number): string {
  return moeda.format(v).replace(/\u00a0/g, " ");
}

export function formatarNumero(v: number): string {
  return numero.format(v);
}

export function formatarPercentual(v: number): string {
  return `${numero.format(v)}%`;
}

/** dd/mm/aaaa HH:MM no fuso America/Sao_Paulo. */
export function formatarDataHora(iso: string, fuso: string = FUSO_PADRAO): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")} ${g("hour")}:${g("minute")}`;
}

/** dd/mm/aaaa */
export function formatarData(iso: string, fuso: string = FUSO_PADRAO): string {
  return formatarDataHora(iso, fuso).slice(0, 10);
}
