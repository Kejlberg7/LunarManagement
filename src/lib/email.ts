import "server-only";
import nodemailer from "nodemailer";

export async function sendLoginLink(email: string, url: string) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    if (process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_LOGIN_LINK === "true") {
      console.info(`[LunarManagement] Local sign-in link for ${email}: ${url}`);
      return { developmentUrl: url };
    }
    throw new Error("E-mailafsenderen er ikke sat op endnu.");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "Lunar Holdmanager <login@example.com>",
    to: email,
    subject: "Log ind på Lunar Holdmanager",
    text: `Brug dette sikre link til at logge ind. Linket virker én gang og udløber om 15 minutter:\n\n${url}`,
    html: `<p>Brug dette sikre link til at logge ind. Linket virker én gang og udløber om 15 minutter.</p><p><a href="${url}">Log ind på Lunar Holdmanager</a></p>`,
  });
  return {};
}
