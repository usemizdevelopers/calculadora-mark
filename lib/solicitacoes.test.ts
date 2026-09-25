import { describe, expect, it } from "vitest";
import { linkWhatsAppTexto, mensagemResposta, tipoResposta } from "./solicitacoes";

describe("tipo de resposta", () => {
  it("sem valor solicitado é aprovação", () => {
    expect(tipoResposta(null, 40)).toBe("aprovada");
  });

  it("mesmo valor (em centavos) é aprovação", () => {
    expect(tipoResposta(42, 42)).toBe("aprovada");
    expect(tipoResposta(42, 42.001)).toBe("aprovada");
  });

  it("valor diferente é contraproposta", () => {
    expect(tipoResposta(42, 45)).toBe("contraproposta");
    expect(tipoResposta(42, 41.99)).toBe("contraproposta");
  });
});

describe("mensagem de resposta", () => {
  it("aprovação usa o formato padrão", () => {
    expect(mensagemResposta("aprovada", "12345", 42)).toBe(
      "Segue preço que conseguimos realizar no produto de código 12345\nPreço: R$ 42,00/m",
    );
  });

  it("contraproposta inclui a observação", () => {
    expect(mensagemResposta("contraproposta", "12345", 1045.5, " Pedido mínimo de 200 m ")).toBe(
      "Contraproposta para o produto de código 12345\nPreço: R$ 1.045,50/m\nPedido mínimo de 200 m",
    );
  });

  it("link preserva quebra de linha", () => {
    expect(linkWhatsAppTexto("+55 31 98483-7807", "a\nb")).toBe("https://wa.me/5531984837807?text=a%0Ab");
  });
});
