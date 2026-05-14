import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "Biblioteca Comunitária <onboarding@resend.dev>";

export type SendReturnReminderEmailInput = {
  to: string;
  userName: string;
  bookTitle: string;
  bookCode: string;
  dueDate: Date;
  message: string;
};

export type SendRegistrationConfirmationEmailInput = {
  to: string;
  userName: string;
  code: string;
};

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

function getResendClient() {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY não configurada no ambiente.");
  }

  return new Resend(resendApiKey);
}

function getEmailDiagnostics() {
  return {
    hasResendApiKey: Boolean(resendApiKey),
    fromEmail,
    appUrl: getAppUrl(),
  };
}

export function getEmailConfigurationDiagnostics() {
  return getEmailDiagnostics();
}

export async function sendRegistrationConfirmationEmail({
  to,
  userName,
  code,
}: SendRegistrationConfirmationEmailInput) {
  const resend = getResendClient();
  const confirmationUrl = `${getAppUrl()}/verify-email?code=${code}`;

  const text = `Olá, ${userName}.\n\nSeu cadastro na Biblioteca Comunitária foi recebido.\n\nPara liberar seu acesso, confirme seu e-mail acessando:\n${confirmationUrl}\n\nSe não conseguir confirmar pelo link, fale com um administrador para liberar seu cadastro.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1>Confirme seu cadastro</h1>

      <p>Olá, <strong>${userName}</strong>.</p>

      <p>
        Seu cadastro na Biblioteca Comunitária da empresa foi recebido com sucesso.
      </p>

      <p>
        Para liberar seu acesso, confirme seu e-mail pelo link abaixo. Caso não consiga,
        peça para um administrador liberar seu cadastro.
      </p>

      <p style="margin: 28px 0;">
        <a href="${confirmationUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #dc2626; color: #ffffff; font-weight: bold; text-decoration: none;">
          Confirmar cadastro
        </a>
      </p>

      <p>Se o botão não funcionar, copie e cole este endereço no navegador:</p>

      <p style="word-break: break-all; color: #374151;">
        ${confirmationUrl}
      </p>

      <p style="margin-top: 32px; color: #6b7280;">
        Biblioteca Comunitária
      </p>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: "Confirme seu cadastro na Biblioteca Comunitária",
    html,
    text,
  });

  if (error) {
    console.error("Resend registration email error:", {
      error,
      diagnostics: getEmailDiagnostics(),
      to,
    });

    throw new Error(`Erro ao enviar e-mail: ${JSON.stringify(error)}`);
  }

  console.info("Resend registration email sent:", {
    id: data?.id,
    to,
    diagnostics: getEmailDiagnostics(),
  });

  return data;
}

export async function sendReturnReminderEmail({
  to,
  userName,
  bookTitle,
  bookCode,
  dueDate,
  message,
}: SendReturnReminderEmailInput) {
  const resend = getResendClient();

  const dueDateFormatted = new Intl.DateTimeFormat("pt-BR").format(dueDate);
  const text = `Olá, ${userName}.\n\n${message}\n\nLivro: ${bookTitle}\nCódigo do exemplar: ${bookCode}\nData prevista de devolução: ${dueDateFormatted}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1 style="color: #111827;">Lembrete de devolução</h1>

      <p>Olá, <strong>${userName}</strong>.</p>

      <p>${message}</p>

      <div style="margin: 24px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
        <p><strong>Livro:</strong> ${bookTitle}</p>
        <p><strong>Código do exemplar:</strong> ${bookCode}</p>
        <p><strong>Data prevista de devolução:</strong> ${dueDateFormatted}</p>
      </div>

      <p>
        Caso precise renovar o empréstimo, solicite a renovação antes do vencimento.
        A renovação dependerá da disponibilidade do exemplar.
      </p>

      <p style="margin-top: 32px; color: #6b7280;">
        Biblioteca Comunitária
      </p>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Lembrete de devolução: ${bookTitle}`,
    html,
    text,
  });

  if (error) {
    console.error("Resend return reminder email error:", {
      error,
      diagnostics: getEmailDiagnostics(),
      to,
    });

    throw new Error(`Erro ao enviar e-mail: ${JSON.stringify(error)}`);
  }

  console.info("Resend return reminder email sent:", {
    id: data?.id,
    to,
    diagnostics: getEmailDiagnostics(),
  });

  return data;
}
