import { NOMES_FAIXA } from "@/lib/calculos";
import type { PrecoAprovado } from "@/lib/dados";
import { formatarDataHora, formatarMetragem, formatarMoeda, formatarPercentual, formatarTelefone } from "@/lib/formatacao";
import { LinhaValor } from "./LinhaValor";
import { SeloFaixa } from "./SeloFaixa";

/** Todos os números de um preço aprovado, como foram salvos. */
export function DetalhesPreco({ registro: r }: { registro: PrecoAprovado }) {
  return (
    <div className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2">
      <section>
        <h3 className="font-semibold text-grafite">Negociação</h3>
        <dl className="mt-1">
          <LinhaValor rotulo="Metragem">{formatarMetragem(r.metragem_negociada)}</LinhaValor>
          <LinhaValor rotulo="Valor do metro">{formatarMoeda(r.preco_negociado_m)}</LinhaValor>
          <LinhaValor rotulo="Preço líquido">{formatarMoeda(r.preco_liquido_negociado)}</LinhaValor>
          <LinhaValor rotulo="Lucro por metro">{formatarMoeda(r.lucro_metro_negociado)}</LinhaValor>
          <LinhaValor rotulo="Margem da negociação" destaque>
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {formatarPercentual(r.margem_negociacao)}
              <SeloFaixa faixa={r.faixa} />
            </span>
          </LinhaValor>
          <LinhaValor rotulo="Receita">{formatarMoeda(r.receita_negociacao)}</LinhaValor>
          <LinhaValor rotulo="Lucro total">{formatarMoeda(r.lucro_total_negociacao)}</LinhaValor>
          <LinhaValor rotulo="Nova margem média">{formatarPercentual(r.nova_margem_media)}</LinhaValor>
          <LinhaValor rotulo="Saldo de estoque">{formatarMetragem(r.saldo_estoque)}</LinhaValor>
        </dl>
      </section>
      <section>
        <h3 className="font-semibold text-grafite">Análise do produto</h3>
        <dl className="mt-1">
          <LinhaValor rotulo="Estoque">{formatarMetragem(r.estoque)}</LinhaValor>
          <LinhaValor rotulo="Quantidade vendida">{formatarMetragem(r.quantidade_vendida)}</LinhaValor>
          <LinhaValor rotulo="Valor vendido">{formatarMoeda(r.valor_vendido)}</LinhaValor>
          <LinhaValor rotulo="Custo por metro">{formatarMoeda(r.custo_metro)}</LinhaValor>
          <LinhaValor rotulo="Preço médio">{formatarMoeda(r.preco_medio)}</LinhaValor>
          <LinhaValor rotulo="Preço médio líquido">{formatarMoeda(r.preco_medio_liquido)}</LinhaValor>
          <LinhaValor rotulo="Lucro líquido por metro">{formatarMoeda(r.lucro_liquido_metro)}</LinhaValor>
          <LinhaValor rotulo="Margem do produto">{formatarPercentual(r.margem_produto)}</LinhaValor>
          <LinhaValor rotulo="Lucro total">{formatarMoeda(r.lucro_total_analise)}</LinhaValor>
        </dl>
      </section>
      <section className="sm:col-span-2">
        <h3 className="font-semibold text-grafite">Configurações usadas</h3>
        <p className="mt-1 text-linha">
          Custo operacional de {formatarPercentual(r.custo_operacional / 100)}. Faixas: vermelho abaixo de{" "}
          {formatarPercentual(r.faixa_vermelho / 100)}, laranja abaixo de {formatarPercentual(r.faixa_laranja / 100)},
          amarelo abaixo de {formatarPercentual(r.faixa_amarelo / 100)}. Faixa desta margem: {NOMES_FAIXA[r.faixa].toLowerCase()}.
        </p>
        <p className="mt-2 text-linha">
          {r.whatsapp_enviado_em
            ? `Enviado para ${r.whatsapp_nome} (${formatarTelefone(r.whatsapp_numero)}) em ${formatarDataHora(r.whatsapp_enviado_em)}.`
            : "Ainda não enviado por WhatsApp."}
        </p>
      </section>
    </div>
  );
}
