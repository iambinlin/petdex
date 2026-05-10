import {
  buildUnsubscribeFooter,
  normalizeLocale,
  p,
  petdexUrl,
  wrapBroadcastEmail,
} from "@/lib/email-templates/shared";

import type { Locale } from "@/i18n/config";

type Vars = {
  unsubscribeToken: string;
};

export function renderDesktopLaunchEmail(
  locale: Locale,
  vars: Vars,
): { subject: string; html: string; text: string } {
  const current = normalizeLocale(locale);

  const copy =
    current === "es"
      ? {
          subject: "Petdex Desktop está listo — tu pet flota junto a tu IDE",
          intro:
            "La app de Petdex para macOS ya está disponible. Tu pet flota encima de Cursor, Claude Code, Codex CLI y reacciona a cada tool call que hace tu agente.",
          highlightsTitle: "Qué hace:",
          highlight1:
            "Habla con bubbles ('Reading server.ts', 'Editing main.zig', 'Done.') — sin LLM, plantillas fijas, instantáneo.",
          highlight2:
            "9 estados sprite mapeados a hooks de cada agente: idle, running-left/right, review, waving, jumping, failed, waiting.",
          highlight3:
            "Click en cualquier pet de Petdex y se abre directo en la app vía petdex://. Si no lo tienes instalado, lo descarga solo.",
          ctaPrimary: "Descargar Petdex Desktop",
          ctaSecondary: "Ver pets",
          footnote:
            "macOS Apple Silicon. Windows y Linux pronto. Si te llega este correo y ya no usas Petdex, puedes desuscribirte abajo.",
        }
      : current === "zh"
        ? {
            subject: "Petdex Desktop 上线了 — 你的宠物飘在你的 IDE 旁边",
            intro:
              "Petdex 的 macOS 桌面应用已经上线。宠物会浮动在 Cursor、Claude Code、Codex CLI 之上，对你 AI agent 的每次工具调用做出反应。",
            highlightsTitle: "它能做什么：",
            highlight1:
              "用气泡说话（'Reading server.ts'、'Editing main.zig'、'Done.'）—— 零 LLM，全是模板，瞬时反应。",
            highlight2:
              "9 个 sprite 状态映射到 agent 的 hook：idle、running-left/right、review、waving、jumping、failed、waiting。",
            highlight3:
              "在 Petdex 上点任何一只宠物，会直接在桌面应用里打开（petdex:// 协议）。没装？自动下载。",
            ctaPrimary: "下载 Petdex Desktop",
            ctaSecondary: "浏览宠物",
            footnote:
              "支持 macOS Apple Silicon。Windows 和 Linux 即将推出。如果你不再使用 Petdex，可在下方退订。",
          }
        : {
            subject: "Petdex Desktop is here — your pet, floating by your IDE",
            intro:
              "The macOS desktop app is live. Your pet floats over Cursor, Claude Code, and Codex CLI, reacting to every tool call your agent makes.",
            highlightsTitle: "What it does:",
            highlight1:
              "Speaks via bubbles ('Reading server.ts', 'Editing main.zig', 'Done.') — zero LLM, fixed templates, instant.",
            highlight2:
              "9 sprite states wired into agent hooks: idle, running-left/right, review, waving, jumping, failed, waiting.",
            highlight3:
              "Click any pet on Petdex and it opens directly in the app via petdex://. Not installed? It auto-downloads.",
            ctaPrimary: "Download Petdex Desktop",
            ctaSecondary: "Browse pets",
            footnote:
              "macOS Apple Silicon. Windows + Linux coming. If you no longer use Petdex, unsubscribe below.",
          };

  const downloadUrl = petdexUrl(current, "/download");
  const petsUrl = petdexUrl(current, "/pets");

  const text = [
    copy.intro,
    "",
    copy.highlightsTitle,
    `- ${copy.highlight1}`,
    `- ${copy.highlight2}`,
    `- ${copy.highlight3}`,
    "",
    `${copy.ctaPrimary}: ${downloadUrl}`,
    `${copy.ctaSecondary}: ${petsUrl}`,
    "",
    copy.footnote,
    buildUnsubscribeFooter(current, vars.unsubscribeToken).text,
  ].join("\n");

  const highlights = `<ul style="margin:0 0 18px;padding:0 0 0 18px;color:#57534e;font-size:14px;line-height:1.6;">
    <li style="margin-bottom:8px;">${copy.highlight1}</li>
    <li style="margin-bottom:8px;">${copy.highlight2}</li>
    <li style="margin-bottom:0;">${copy.highlight3}</li>
  </ul>`;

  const ctaBlock = `<div style="margin:28px 0 16px;">
    <a href="${downloadUrl}" style="display:inline-block;padding:12px 22px;background:#171717;color:#fafaf9;border-radius:999px;font-size:14px;font-weight:500;text-decoration:none;margin-right:8px;">${copy.ctaPrimary}</a>
    <a href="${petsUrl}" style="display:inline-block;padding:12px 22px;background:transparent;color:#171717;border:1px solid #d6d3d1;border-radius:999px;font-size:14px;font-weight:500;text-decoration:none;">${copy.ctaSecondary}</a>
  </div>`;

  const footnoteBlock = `<p style="margin:24px 0 0;color:#a8a29e;font-size:12px;line-height:1.5;">${copy.footnote}</p>`;

  const html = wrapBroadcastEmail(
    copy.subject,
    [
      p(copy.intro),
      `<p style="margin:18px 0 8px;color:#171717;font-size:14px;font-weight:600;">${copy.highlightsTitle}</p>`,
      highlights,
      ctaBlock,
      footnoteBlock,
    ],
    current,
    vars.unsubscribeToken,
  );

  return { subject: copy.subject, html, text };
}
