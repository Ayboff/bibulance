"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VehicleType } from "@/types/database";

type Vehicle = {
  id: string;
  code: string;
  vehicle_type: VehicleType;
  is_active: boolean;
};

type Driver = {
  id: string;
  display_name: string;
  vehicle_id: string | null;
  status: string;
  is_active: boolean;
};

export function FleetPanel({
  initialVehicles,
  initialDrivers,
}: {
  initialVehicles: Vehicle[];
  initialDrivers: Driver[];
}) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("VSL");
  const [driverName, setDriverName] = useState("");
  const [driverVehicleId, setDriverVehicleId] = useState("");

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/fleet/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, vehicle_type: vehicleType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec");
      setVehicles((prev) => [...prev, json.vehicle].sort((a, b) => a.code.localeCompare(b.code)));
      setCode("");
      setSuccess("Véhicule ajouté.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVehicle(id: string, is_active: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fleet/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec");
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? json.vehicle : v)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function createDriver(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/fleet/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: driverName,
          vehicle_id: driverVehicleId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec");
      setDrivers((prev) =>
        [...prev, json.driver].sort((a, b) =>
          a.display_name.localeCompare(b.display_name),
        ),
      );
      setDriverName("");
      setDriverVehicleId("");
      setSuccess("Chauffeur ajouté.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDriver(id: string, is_active: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/fleet/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Échec");
      setDrivers((prev) =>
        prev.map((d) => (d.id === id ? json.driver : d)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
      {error ? (
        <div className="lg:col-span-2">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {success ? (
        <div className="lg:col-span-2">
          <Alert tone="success">{success}</Alert>
        </div>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Véhicules</h2>
        <ul className="divide-y divide-border">
          {vehicles.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-semibold">{v.code}</p>
                <p className="text-sm text-muted">
                  {v.vehicle_type} · {v.is_active ? "Actif" : "Inactif"}
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void toggleVehicle(v.id, v.is_active)}
              >
                {v.is_active ? "Désactiver" : "Activer"}
              </Button>
            </li>
          ))}
          {vehicles.length === 0 ? (
            <li className="py-4 text-sm text-muted">Aucun véhicule.</li>
          ) : null}
        </ul>

        <form onSubmit={createVehicle} className="space-y-3 border-t border-border pt-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VSL 12"
              required
            />
          </div>
          <div>
            <Label htmlFor="vehicle_type">Type</Label>
            <select
              id="vehicle_type"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
            >
              <option value="VSL">VSL</option>
              <option value="AMB">AMB</option>
            </select>
          </div>
          <Button type="submit" loading={busy}>
            Ajouter le véhicule
          </Button>
        </form>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Chauffeurs</h2>
        <ul className="divide-y divide-border">
          {drivers.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-semibold">{d.display_name}</p>
                <p className="text-sm text-muted">
                  {d.vehicle_id
                    ? vehicleMap.get(d.vehicle_id)?.code ?? "Véhicule"
                    : "Sans véhicule"}{" "}
                  · {d.is_active ? "Actif" : "Inactif"}
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void toggleDriver(d.id, d.is_active)}
              >
                {d.is_active ? "Désactiver" : "Activer"}
              </Button>
            </li>
          ))}
          {drivers.length === 0 ? (
            <li className="py-4 text-sm text-muted">Aucun chauffeur.</li>
          ) : null}
        </ul>

        <form onSubmit={createDriver} className="space-y-3 border-t border-border pt-4">
          <div>
            <Label htmlFor="driver_name">Nom</Label>
            <Input
              id="driver_name"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="driver_vehicle">Véhicule (optionnel)</Label>
            <select
              id="driver_vehicle"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
              value={driverVehicleId}
              onChange={(e) => setDriverVehicleId(e.target.value)}
            >
              <option value="">Aucun</option>
              {vehicles
                .filter((v) => v.is_active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.code} ({v.vehicle_type})
                  </option>
                ))}
            </select>
          </div>
          <Button type="submit" loading={busy}>
            Ajouter le chauffeur
          </Button>
        </form>
      </section>
    </div>
  );
}
