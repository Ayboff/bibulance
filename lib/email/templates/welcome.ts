export type WelcomeAudience = "patient" | "company";

export type WelcomeEmailContent = {
  subject: string;
  html: string;
  text: string;
};

type WelcomeParams = {
  fullName: string;
  audience: WelcomeAudience;
  appOrigin: string;
};

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || "bonjour";
}

export function buildWelcomeEmail(params: WelcomeParams): WelcomeEmailContent {
  const { audience, appOrigin } = params;
  const name = firstName(params.fullName);
  const logoUrl = `${appOrigin}/logo-bibulance.png`;
  const ctaHref =
    audience === "company" ? `${appOrigin}/pro/onboarding` : `${appOrigin}/commander`;
  const ctaLabel =
    audience === "company" ? "Configurer ma société" : "Commander un transport";

  const headline =
    audience === "company"
      ? "Bienvenue dans la régulation Bibulance"
      : "Bienvenue sur Bibulance";

  const lead =
    audience === "company"
      ? "Votre compte société est confirmé. Vous pouvez maintenant créer votre ambulance, inviter votre équipe et recevoir les demandes au même endroit."
      : "Votre compte est confirmé. Vous pouvez commander un transport sanitaire en quelques étapes, pour vous ou pour un proche.";

  const tips =
    audience === "company"
      ? [
          "Créez votre société et votre flotte",
          "Recevez les demandes patients et plateformes",
          "Assignez un véhicule avant de confirmer",
        ]
      : [
          "Choisissez votre société habituelle ou un partenaire",
          "Commandez pour vous ou pour un proche",
          "Suivez vos trajets dans « Mes trajets »",
        ];

  const subject =
    audience === "company"
      ? "Bienvenue sur Bibulance — votre compte société est prêt"
      : "Bienvenue sur Bibulance — votre inscription est confirmée";

  const tipsHtml = tips
    .map(
      (tip) => `
      <tr>
        <td style="padding:0 0 10px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:28px;vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:18px;height:18px;border-radius:999px;background:#e8f3f6;color:#3d8fa3;font-size:12px;line-height:18px;text-align:center;font-weight:700;">✓</span>
              </td>
              <td style="font-size:15px;line-height:1.5;color:#1a2332;">${escapeHtml(tip)}</td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef5f7;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#1a2332;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,#eef5f7 0%,#f6f8f9 55%,#ffffff 100%);padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 8px 20px 8px;">
              <img src="${logoUrl}" alt="Bibulance" width="180" height="59" style="display:block;width:180px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #d9e2e8;border-radius:16px;box-shadow:0 8px 28px -16px rgba(26,35,50,0.16);overflow:hidden;">
              <div style="height:6px;background:linear-gradient(90deg,#3d8fa3 0%,#5fa88a 100%);"></div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 28px 8px 28px;">
                    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#3d8fa3;">
                      Inscription confirmée
                    </p>
                    <h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.25;font-weight:700;color:#1a2332;">
                      ${escapeHtml(headline)}
                    </h1>
                    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.55;color:#5f6b7a;">
                      Bonjour ${escapeHtml(name)},
                    </p>
                    <p style="margin:0 0 22px 0;font-size:16px;line-height:1.6;color:#1a2332;">
                      ${escapeHtml(lead)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 8px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8f3f6;border-radius:12px;">
                      <tr>
                        <td style="padding:18px 16px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            ${tipsHtml}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 28px 12px 28px;" align="left">
                    <a href="${ctaHref}" style="display:inline-block;background:#3d8fa3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 22px;border-radius:12px;">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 32px 28px;">
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#5f6b7a;">
                      Si le bouton ne fonctionne pas, ouvrez&nbsp;:<br />
                      <a href="${ctaHref}" style="color:#3d8fa3;word-break:break-all;">${escapeHtml(ctaHref)}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0 8px;text-align:left;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#5f6b7a;">
                Vous recevez cet email car un compte Bibulance a été créé avec cette adresse.
                Besoin d’aide&nbsp;? Répondez à ce message.
              </p>
              <p style="margin:12px 0 0 0;font-size:12px;color:#5f6b7a;">
                © ${new Date().getFullYear()} Bibulance
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    "",
    `Bonjour ${name},`,
    "",
    lead,
    "",
    ...tips.map((t) => `• ${t}`),
    "",
    `${ctaLabel} : ${ctaHref}`,
    "",
    "— L’équipe Bibulance",
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
