// SkyKraken — formulaire de contact (remplace api/contact.php sur Vercel)
// Les identifiants SMTP sont lus dans les variables d'environnement Vercel :
//   SMTP_USER, SMTP_PASS, MAIL_TO (optionnel, par défaut = SMTP_USER)

import nodemailer from 'nodemailer';

const SITE_NAME = 'SkyKraken';

async function readFields(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    return await request.json();
  }
  // Gère à la fois multipart/form-data et application/x-www-form-urlencoded
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

const clean = (v) => (typeof v === 'string' ? v.trim().slice(0, 5000) : '');

export async function POST(request) {
  let fields;
  try {
    fields = await readFields(request);
  } catch {
    return Response.json({ ok: false, error: 'Invalid input' }, { status: 422 });
  }

  // Anti-spam (honeypot) : si le champ caché "website" est rempli, on ignore
  if (clean(fields.website)) {
    return Response.json({ ok: true });
  }

  const name = clean(fields.name);
  const org = clean(fields.org);
  const email = clean(fields.email);
  const sector = clean(fields.sector);
  const product = clean(fields.product);
  const lang = clean(fields.lang);
  const message = clean(fields.message);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: 'Invalid input' }, { status: 422 });
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.MAIL_TO || user;

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const text =
    `New enquiry from the SkyKraken website\n` +
    `--------------------------------------\n` +
    `Name:         ${name}\n` +
    `Organization: ${org}\n` +
    `Email:        ${email}\n` +
    `Sector:       ${sector}\n` +
    `Product:      ${product || '-'}\n` +
    `Language:     ${lang || '-'}\n` +
    `--------------------------------------\n\n` +
    `${message}\n`;

  try {
    await transporter.sendMail({
      from: { name: `${SITE_NAME} — Website`, address: user },
      to,
      replyTo: { name, address: email },
      subject: `New enquiry${product ? ` [${product}]` : ''} — ${name}${org ? ` (${org})` : ''}`,
      text,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('Send failed:', err);
    return Response.json({ ok: false, error: 'Send failed' }, { status: 500 });
  }
}

export function GET() {
  return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}
