// Notificações push no navegador: registro do service worker e inscrição do aparelho.
import { criarClienteNavegador } from "./supabase/cliente";

export type EstadoPush = "indisponivel" | "precisa-instalar" | "bloqueado" | "desativado" | "ativo";

function chavePublica(): Uint8Array<ArrayBuffer> {
  const base64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const ajustado = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(ajustado);
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

function ehIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function instaladoNaTela() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

async function registrar() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

async function salvar(inscricao: PushSubscription) {
  const json = inscricao.toJSON();
  const { error } = await criarClienteNavegador().rpc("calc_salvar_inscricao", {
    p_endpoint: inscricao.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
  });
  if (error) throw error;
}

/** Descobre o estado atual e, se já estiver ativo, reassocia o aparelho ao usuário logado. */
export async function verificarPush(): Promise<EstadoPush> {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "indisponivel";
  const suporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!suporta) return ehIOS() && !instaladoNaTela() ? "precisa-instalar" : "indisponivel";
  if (Notification.permission === "denied") return "bloqueado";
  const registro = await registrar();
  const inscricao = await registro.pushManager.getSubscription();
  if (!inscricao || Notification.permission !== "granted") return "desativado";
  await salvar(inscricao).catch(() => undefined);
  return "ativo";
}

/** Pede permissão e inscreve o aparelho. Chamar a partir de um toque do usuário. */
export async function ativarPush(): Promise<EstadoPush> {
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "desativado";
  const registro = await registrar();
  await navigator.serviceWorker.ready;
  const inscricao =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chavePublica() }));
  await salvar(inscricao);
  return "ativo";
}

/** Pede ao servidor para avisar os interessados. Falhas não interrompem o fluxo. */
export function notificar(solicitacaoId: string, evento: "nova" | "resposta") {
  void fetch("/api/notificar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ solicitacaoId, evento }),
    keepalive: true,
  }).catch(() => undefined);
}
