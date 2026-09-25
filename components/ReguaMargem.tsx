import { NOMES_FAIXA, classificarMargem, type ParametrosCalculo, type PisosDePreco } from "@/lib/calculos";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";
import { corFaixa } from "./estilos";

interface PropsRegua {
  /** Margem atual em fração, ou null quando não há resultado. */
  margem: number | null;
  parametros: ParametrosCalculo;
  pisos: PisosDePreco | null;
  /** Descrição curta do que o marcador mostra, para leitores de tela. */
  descricao: string;
}

const MINIMO = -10;

function escala(p: ParametrosCalculo) {
  const maximo = Math.max(40, Math.ceil((p.faixaAmarelo + 15) / 5) * 5);
  const posicao = (pct: number) => ((Math.min(Math.max(pct, MINIMO), maximo) - MINIMO) / (maximo - MINIMO)) * 100;
  const marcas: number[] = [];
  for (let v = MINIMO; v <= maximo; v += 5) marcas.push(v);
  return { maximo, posicao, marcas };
}

/**
 * Régua inspirada na fita métrica de costura: marcações a cada 5%,
 * trechos das quatro faixas e um marcador que desliza até a margem atual.
 */
export function ReguaMargem({ margem, parametros, pisos, descricao }: PropsRegua) {
  const { maximo, posicao, marcas } = escala(parametros);
  const trechos = [
    { faixa: "vermelho", de: MINIMO, ate: parametros.faixaVermelho },
    { faixa: "laranja", de: parametros.faixaVermelho, ate: parametros.faixaLaranja },
    { faixa: "amarelo", de: parametros.faixaLaranja, ate: parametros.faixaAmarelo },
    { faixa: "verde", de: parametros.faixaAmarelo, ate: maximo },
  ] as const;

  const pct = margem === null ? null : margem * 100;
  const faixaAtual = margem === null ? null : classificarMargem(margem, parametros);
  const foraDaEscala = pct !== null && (pct < MINIMO || pct > maximo);

  const listaPisos = pisos
    ? [
        { chave: "equilibrio", rotulo: "Equilíbrio", ...pisos.equilibrio },
        { chave: "vermelho", rotulo: formatarPercentual(pisos.vermelho.margem).replace(",0", ""), ...pisos.vermelho },
        { chave: "laranja", rotulo: formatarPercentual(pisos.laranja.margem).replace(",0", ""), ...pisos.laranja },
        { chave: "amarelo", rotulo: formatarPercentual(pisos.amarelo.margem).replace(",0", ""), ...pisos.amarelo },
      ]
    : [];

  return (
    <figure className="select-none">
      <figcaption className="sr-only">
        {pct === null
          ? "Régua de margem sem resultado."
          : `${descricao}: ${formatarPercentual(margem)}, faixa ${NOMES_FAIXA[faixaAtual!]}.`}
      </figcaption>

      {pct !== null && <p className="text-sm text-linha">Na régua: {descricao.toLowerCase()}</p>}

      {/* Etiqueta do marcador */}
      <div aria-hidden className="relative h-9">
        {pct !== null && (
          <div className="regua-marcador absolute bottom-0" style={{ left: `${posicao(pct)}%` }}>
            <span
              className={`numeros absolute bottom-2 -translate-x-1/2 rounded-md px-2 py-0.5 text-sm font-semibold whitespace-nowrap ${corFaixa[faixaAtual!].fundo} ${corFaixa[faixaAtual!].texto}`}
              style={{
                translate: posicao(pct) < 8 ? "0 0" : posicao(pct) > 92 ? "-100% 0" : undefined,
              }}
            >
              {foraDaEscala && pct < MINIMO ? "‹ " : ""}
              {formatarPercentual(margem)}
              {foraDaEscala && pct > maximo ? " ›" : ""}
            </span>
            <span className="absolute bottom-0 block size-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-grafite" />
          </div>
        )}
      </div>

      {/* Fita */}
      <div aria-hidden className="relative h-14 overflow-hidden rounded-md border border-trama bg-superficie">
        {marcas.map((v) => {
          const longa = v % 10 === 0;
          return (
            <div key={v} className="absolute top-0" style={{ left: `${posicao(v)}%` }}>
              <span className={`absolute top-0 block w-px -translate-x-1/2 bg-linha/70 ${longa ? "h-5" : "h-3"}`} />
              {longa && v > MINIMO && v < maximo && (
                <span className="numeros absolute top-5 -translate-x-1/2 text-[0.6875rem] leading-4 text-linha">
                  {v}
                </span>
              )}
            </div>
          );
        })}
        {/* Marcações finas de 1% entre as de 5% */}
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(91,98,114,0.35) 1px, transparent 1px)",
            backgroundSize: `${100 / (maximo - MINIMO)}% 100%`,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex h-2">
          {trechos.map((t) => (
            <span
              key={t.faixa}
              className={corFaixa[t.faixa].ponto}
              style={{ width: `${posicao(t.ate) - posicao(t.de)}%` }}
            />
          ))}
        </div>
        {pct !== null && (
          <span
            className="regua-marcador absolute top-0 bottom-0 block w-0.5 -translate-x-1/2 bg-grafite"
            style={{ left: `${posicao(pct)}%` }}
          />
        )}
      </div>

      {/* Pisos de preço alinhados às marcações */}
      {listaPisos.length > 0 && (
        <>
          <div aria-hidden className="relative h-[6.25rem]">
            {listaPisos.map((p, i) => {
              const baixo = i % 2 === 1;
              return (
                <div key={p.chave} className="absolute top-0" style={{ left: `${posicao(p.margem * 100)}%` }}>
                  <span className={`absolute top-0 block w-px -translate-x-1/2 bg-trama ${baixo ? "h-12" : "h-2.5"}`} />
                  <div
                    className={`absolute -translate-x-1/2 text-center leading-tight whitespace-nowrap ${baixo ? "top-12" : "top-2.5"} pt-1`}
                  >
                    <div className="text-xs text-linha">{p.rotulo}</div>
                    <div className="numeros text-[0.8125rem] font-medium text-grafite">
                      {p.preco === null ? "—" : formatarMoeda(p.preco)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <ul className="sr-only">
            {listaPisos.map((p) => (
              <li key={p.chave}>
                {p.chave === "equilibrio" ? "Preço de equilíbrio" : `Preço mínimo para ${p.rotulo}`}:{" "}
                {p.preco === null ? "inatingível" : formatarMoeda(p.preco)}
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  );
}
