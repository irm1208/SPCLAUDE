import type { StandaloneTrack17V22Client } from "./standalone-track17-v22";
import type {
  StandaloneShipmentRefreshResult,
  StandaloneShipmentSnapshot,
} from "./standalone-shipment-refresh";
import { isManualTrackingRefreshAllowed } from "./tracking-refresh-policy";

type ShipmentRow = StandaloneShipmentSnapshot & {
  label: string;
  origin: string;
  estimatedDelivery: string | null;
  cachedEvents: string | null;
  createdAt: Date;
  [key: string]: unknown;
};

type JsonResponse = {
  status(code: number): JsonResponse;
  json(body: unknown): unknown;
};

function maskedEvents(cachedEvents: string | null): unknown[] {
  try {
    const parsed: unknown = JSON.parse(cachedEvents ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createPublicShipmentsHandler({
  loadShipments,
  provider: _provider,
}: {
  loadShipments: () => Promise<ShipmentRow[]>;
  provider: StandaloneTrack17V22Client;
}) {
  return async (_req: unknown, res: JsonResponse): Promise<void> => {
    try {
      const rows = await loadShipments();
      res.json(rows.map(row => ({
        id: row.id,
        label: row.label,
        carrier: row.carrier,
        status: row.status,
        origin: row.origin,
        estimatedDelivery: row.estimatedDelivery,
        events: maskedEvents(row.cachedEvents),
        lastChecked: row.lastChecked,
        createdAt: row.createdAt,
      })));
    } catch {
      res.status(500).json({ error: "Failed to load shipments" });
    }
  };
}

export function createManualShipmentRefreshHandler({
  loadShipment,
  hasApiKey,
  refreshShipment,
}: {
  loadShipment: (id: string) => Promise<ShipmentRow | undefined>;
  hasApiKey: () => Promise<boolean>;
  refreshShipment: (shipment: ShipmentRow) => Promise<StandaloneShipmentRefreshResult>;
}) {
  return async (req: { params: { id: string } }, res: JsonResponse): Promise<void> => {
    const { id } = req.params;
    try {
      const shipment = await loadShipment(id);
      if (!shipment) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (!isManualTrackingRefreshAllowed(shipment.lastChecked, shipment.status)) {
        res.json(shipment);
        return;
      }
      if (!(await hasApiKey())) {
        res.status(422).json({ error: "17track API key not configured" });
        return;
      }

      const result = await refreshShipment(shipment);
      if (result.kind === "unavailable") {
        res.status(502).json({
          error: "17track tracking data unavailable; saved shipment was not changed",
        });
        return;
      }

      const updated = await loadShipment(id);
      if (!updated) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (result.kind === "conflict") {
        res.status(409).json({
          error: "Shipment changed during refresh",
          shipment: updated,
        });
        return;
      }
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to refresh" });
    }
  };
}