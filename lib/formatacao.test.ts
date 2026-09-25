import { describe, expect, it } from "vitest";
import {
  formatarMetragem,
  formatarPercentual,
  formatarTelefone,
  lerNumero,
  linkWhatsApp,
  mascararDecimal,
  mascararMoeda,
  mensagemWhatsApp,
} from "./formatacao";

describe("leitura de números", () => {
  it("aceita vírgula e separador de milhar", () => {
    expect(lerNumero("1.234,56")).toBe(1234.56);
    expect(lerNumero("12,5")).toBe(12.5);
    expect(lerNumero("42")).toBe(42);
    expect(lerNumero("R$ 10.000,00")).toBe(10000);
    expect(lerNumero("")).toBeNull();
    expect(lerNumero("abc")).toBeNull();
  });
});

describe("máscaras", () => {
  it("moeda entra pela direita", () => {
    expect(mascararMoeda("4")).toBe("0,04");
    expect(mascararMoeda("4200")).toBe("42,00");
    expect(mascararMoeda("1000000")).toBe("10.000,00");
    expect(mascararMoeda("")).toBe("");
  });

  it("decimal aceita uma vírgula e limita casas", () => {
    expect(mascararDecimal("12.5")).toBe("12,5");
    expect(mascararDecimal("12,555")).toBe("12,55");
    expect(mascararDecimal(",5")).toBe("0,5");
    expect(mascararDecimal("1a2")).toBe("12");
  });
});

describe("exibição", () => {
  it("percentual com uma casa e sinal", () => {
    expect(formatarPercentual(0.17476)).toBe("17,5%");
    expect(formatarPercentual(-0.0633)).toBe("-6,3%");
    expect(formatarPercentual(null)).toBe("—");
  });

  it("metragem com até duas casas", () => {
    expect(formatarMetragem(12.5)).toBe("12,5 m");
    expect(formatarMetragem(1500)).toBe("1.500 m");
  });

  it("telefone", () => {
    expect(formatarTelefone("5531984837807")).toBe("+55 31 98483-7807");
  });
});

describe("WhatsApp", () => {
  it("monta a mensagem em duas linhas", () => {
    expect(mensagemWhatsApp("12345", 42)).toBe(
      "Segue preço que conseguimos realizar no produto de código 12345\nPreço: R$ 42,00/m",
    );
  });

  it("codifica a URL preservando quebra de linha e acentos", () => {
    const url = linkWhatsApp("5531984837807", "12345", 1234.5);
    expect(url.startsWith("https://wa.me/5531984837807?text=")).toBe(true);
    expect(url).toContain("%0APre%C3%A7o%3A%20R%24%201.234%2C50%2Fm");
  });
});
