import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "Biblioteca Comunitária <onboarding@resend.dev>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

function getResendClient() {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY não configurada no .env.");
  }

  return new Resend(resendApiKey);
}

export async function sendRegistrationConfirmationEmail({
  to,
  userName,
  code,
}: SendRegistrationConfirmationEmailInput) {
  const resend = getResendClient();
  const confirmationUrl = `${appUrl}/verify-email?code=${code}`;

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
        <a href="${confirmationUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #fbbf24; color: #0f172a; font-weight: bold; text-decoration: none;">
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
  });

  if (error) {
    throw new Error(`Erro ao enviar e-mail: ${JSON.stringify(error)}`);
  }

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
  });

  if (error) {
    throw new Error(`Erro ao enviar e-mail: ${JSON.stringify(error)}`);
  }

  return data;
}
