"use client";

import { useState, type FormEvent } from "react";
import { CampoNumero, CampoTexto } from "@/components/Campo";
import { useConfiguracoes } from "@/components/ConfiguracoesContexto";
import { botao } from "@/components/estilos";
import { validarParametros, type ErrosParametros } from "@/lib/calculos";
import { descreverErro, salvarConfiguracoes, type Configuracoes as TipoConfiguracoes } from "@/lib/dados";
import { apenasDigitos, lerNumero, numeroParaCampo } from "@/lib/formatacao";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

/** Formata enquanto digita: 5531984837807 → +55 31 98483-7807 */
function telefoneParcial(digitos: string): string {
  const d = digitos.slice(0, 13);
  if (!d) return "";
  let t = `+${d.slice(0, 2)}`;
  if (d.length > 2) t += ` ${d.slice(2, 4)}`;
  if (d.length > 4) {
    const resto = d.slice(4);
    t += ` ${resto.length > 4 ? `${resto.slice(0, -4)}-${resto.slice(-4)}` : resto}`;
  }
  return t;
}

type Erros = ErrosParametros & { whatsappNome?: string; whatsappNumero?: string };

export function Configuracoes() {
  const { configuracoes, definirConfiguracoes } = useConfiguracoes();
  const [custo, setCusto] = useState(numeroParaCampo(configuracoes.custoOperacional));
  const [vermelho, setVermelho] = useState(numeroParaCampo(configuracoes.faixaVermelho));
  const [laranja, setLaranja] = useState(numeroParaCampo(configuracoes.faixaLaranja));
  const [amarelo, setAmarelo] = useState(numeroParaCampo(configuracoes.faixaAmarelo));
  const [nome, setNome] = useState(configuracoes.whatsappNome);
  const [numero, setNumero] = useState(configuracoes.whatsappNumero);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const custoNumero = lerNumero(custo);
  const margemMaxima = custoNumero !== null && custoNumero < 100 ? 100 - custoNumero : null;

  function limparAvisos() {
    setAviso(null);
    setErroSalvar(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    limparAvisos();
    const nova: TipoConfiguracoes = {
      custoOperacional: lerNumero(custo) ?? NaN,
      faixaVermelho: lerNumero(vermelho) ?? NaN,
      faixaLaranja: lerNumero(laranja) ?? NaN,
      faixaAmarelo: lerNumero(amarelo) ?? NaN,
      whatsappNome: nome.trim(),
      whatsappNumero: apenasDigitos(numero),
    };
    const novosErros: Erros = validarParametros(nova);
    if (!nova.whatsappNome) novosErros.whatsappNome = "Informe o nome de quem recebe.";
    if (nova.whatsappNumero.length < 12) {
      novosErros.whatsappNumero = "Informe o número com código do país e DDD, como +55 31 98483-7807.";
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setSalvando(true);
    try {
      await salvarConfiguracoes(criarClienteNavegador(), nova);
      definirConfiguracoes(nova);
      setAviso("Configurações salvas");
    } catch (e) {
      setErroSalvar(descreverErro(e, "As configurações não foram salvas."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <p className="mt-1 text-linha">Valem para os próximos cálculos. Preços já aprovados guardam os valores da época.</p>

      <form onSubmit={salvar} onChange={limparAvisos} noValidate className="mt-8">
        <fieldset className="border-t border-trama pt-6">
          <legend className="float-left mb-4 w-full text-lg font-semibold">Custos</legend>
          <CampoNumero
            tipo="percentual"
            rotulo="Custo operacional"
            valor={custo}
            aoMudar={setCusto}
            erro={erros.custoOperacional}
            ajuda="Descontado do preço de venda para chegar ao preço líquido."
            className="clear-left max-w-xs"
          />
        </fieldset>

        <fieldset className="mt-10 border-t border-trama pt-6">
          <legend className="float-left mb-1 w-full text-lg font-semibold">Faixas de margem</legend>
          <p className="clear-left mb-5 text-linha">
            Os limites precisam ser crescentes
            {margemMaxima !== null ? ` e menores que a margem máxima possível, ${numeroParaCampo(Number(margemMaxima.toFixed(1)))}%` : ""}.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            <CampoNumero
              tipo="percentual"
              rotulo="Vermelho até"
              valor={vermelho}
              aoMudar={setVermelho}
              erro={erros.faixaVermelho}
              ajuda="Margem mínima aceitável."
            />
            <CampoNumero tipo="percentual" rotulo="Laranja até" valor={laranja} aoMudar={setLaranja} erro={erros.faixaLaranja} />
            <CampoNumero tipo="percentual" rotulo="Amarelo até" valor={amarelo} aoMudar={setAmarelo} erro={erros.faixaAmarelo} />
          </div>
          <p className="mt-4 text-sm text-linha">Acima do limite do amarelo, a margem fica verde.</p>
        </fieldset>

        <fieldset className="mt-10 border-t border-trama pt-6">
          <legend className="float-left mb-4 w-full text-lg font-semibold">Destinatário do WhatsApp</legend>
          <div className="clear-left grid gap-5 sm:grid-cols-2">
            <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} erro={erros.whatsappNome} autoComplete="off" />
            <CampoTexto
              rotulo="Número"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              valor={telefoneParcial(numero)}
              aoMudar={(v) => setNumero(apenasDigitos(v).slice(0, 13))}
              erro={erros.whatsappNumero}
              placeholder="+55 31 98483-7807"
            />
          </div>
        </fieldset>

        <div className="mt-10 flex flex-col gap-4 border-t border-trama pt-6 sm:flex-row sm:items-center">
          <button type="submit" disabled={salvando} className={`${botao.principal} w-full sm:w-auto`}>
            {salvando ? "Salvando…" : "Salvar configurações"}
          </button>
          <p role="status" className="font-medium text-grafite">
            {aviso}
          </p>
          {erroSalvar && (
            <p role="alert" className="text-vermelho">
              {erroSalvar}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
