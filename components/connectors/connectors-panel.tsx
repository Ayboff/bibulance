"use client";

import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORM_LABELS } from "@/lib/missions/format";

type Connector = {
  id: string;
  platform: string;
  display_name: string | null;
  sync_mode: string;
  is_enabled: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  status: string;
};

type Adapter = {
  platform: string;
  capabilities: { pull?: boolean; webhook?: boolean };
};

const PLATFORMS = [
  "amblea",
  "sps",
  "scr_urgences",
  "ptah",
  "paramedic",
  "csv",
] as const;

export function ConnectorsPanel({
  initialConnectors,
  adapters,
  companyId,
}: {
  initialConnectors: Connector[];
  adapters: Adapter[];
  companyId: string;
}) {
  const [connectors, setConnectors] = useState(initialConnectors);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [platform, setPlatform] = useState<string>("amblea");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [syncMode, setSyncMode] = useState("pull");

  const adapterMap = useMemo(
    () => new Map(adapters.map((a) => [a.platform, a])),
    [adapters],
  );

  async function refresh() {
    const res = await fetch("/api/connectors");
    const json = await res.json();
    if (res.ok) setConnectors(json.connectors ?? []);
  }

  async function saveConnector(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          sync_mode: platform === "csv" ? "csv" : syncMode,
          api_url: apiUrl || undefined,
          api_key: apiKey || undefined,
          webhook_secret: webhookSecret || undefined,
          is_enabled: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec");
      setSuccess(`Connecteur ${platform} enregistré.`);
      setApiKey("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function runSync(id: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/connectors/${id}/sync`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync échouée");
      const s = json.result?.stats;
      setSuccess(
        `Sync ${json.result?.platform}: +${s?.inserted ?? 0} / ~${s?.updated ?? 0} / skip ${s?.skipped ?? 0}`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("platform", "csv");
      const res = await fetch("/api/import/csv", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import échoué");
      setSuccess(`CSV importé: ${json.imported} mission(s).`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Connecteurs configurés</h2>
        {connectors.length === 0 ? (
          <p className="text-sm text-muted">Aucun connecteur pour l’instant.</p>
        ) : (
          <ul className="divide-y divide-border">
            {connectors.map((c) => {
              const caps = adapterMap.get(c.platform)?.capabilities;
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {PLATFORM_LABELS[c.platform] ?? c.display_name ?? c.platform}
                    </p>
                    <p className="text-sm text-muted">
                      {c.sync_mode} · {c.status}
                      {c.last_sync_at
                        ? ` · sync ${new Date(c.last_sync_at).toLocaleString("fr-FR")}`
                        : ""}
                    </p>
                    {c.last_error ? (
                      <p className="text-xs text-danger">{c.last_error}</p>
                    ) : null}
                    {caps?.webhook ? (
                      <p className="mt-1 break-all font-mono text-xs text-muted">
                        Webhook: /api/webhooks/connectors/{c.platform}
                        <br />
                        Header x-company-id: {companyId}
                      </p>
                    ) : null}
                  </div>
                  {c.platform !== "csv" ? (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void runSync(c.id)}
                    >
                      Synchroniser
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Ajouter / mettre à jour</h2>
        <form onSubmit={saveConnector} className="space-y-3">
          <div>
            <Label htmlFor="platform">Plateforme</Label>
            <select
              id="platform"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p] ?? p}
                </option>
              ))}
            </select>
          </div>

          {platform !== "csv" ? (
            <>
              <div>
                <Label htmlFor="sync_mode">Mode</Label>
                <select
                  id="sync_mode"
                  className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
                  value={syncMode}
                  onChange={(e) => setSyncMode(e.target.value)}
                >
                  <option value="pull">Pull API (cron)</option>
                  <option value="webhook">Webhook</option>
                  <option value="manual">Manuel</option>
                </select>
              </div>
              <div>
                <Label htmlFor="api_url">URL API (pull)</Label>
                <Input
                  id="api_url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.partenaire.example/missions"
                />
              </div>
              <div>
                <Label htmlFor="api_key">Clé API (optionnel)</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="webhook_secret">Secret webhook (HMAC)</Label>
                <Input
                  id="webhook_secret"
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">
              Le connecteur CSV s’utilise via l’import de fichier ci-dessous.
            </p>
          )}

          <Button type="submit" loading={busy}>
            Enregistrer
          </Button>
        </form>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Import CSV</h2>
        <p className="text-sm text-muted">
          Colonnes minimales : <code>source_mission_id</code>,{" "}
          <code>rdv_time</code>. Optionnelles : patient_*, emitter_*,
          destination_*, vehicle_type, status, care_type, notes.
        </p>
        <Input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={importCsv}
        />
      </section>
    </div>
  );
}
