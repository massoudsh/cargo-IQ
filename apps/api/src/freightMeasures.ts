import type { FreightMeasures, ShipmentRequest } from "./types.js";

// Illustrative industry conventions. Carriers and forwarders contract their own
// divisors, so every value derived here is a planning figure, not a billed one.
export const airDivisor = 6000;
export const roadDivisor = 3000;
export const loadingWidthCm = 240;

export function cargoVolumeCbm(request: ShipmentRequest) {
  if (request.dimensionsCm) {
    return (request.dimensionsCm.length * request.dimensionsCm.width * request.dimensionsCm.height * (request.pieces ?? 1)) / 1_000_000;
  }
  return request.volumeCbm ?? 0;
}

export function calculateFreightMeasures(request: ShipmentRequest): FreightMeasures {
  const volumeCbm = cargoVolumeCbm(request);
  const actualWeightKg = request.weightKg ?? 0;
  const volumeCm3 = volumeCbm * 1_000_000;

  const airVolumetricKg = volumeCm3 / airDivisor;
  const airChargeableKg = Math.max(actualWeightKg, airVolumetricKg);

  const seaRevenueTon = Math.max(actualWeightKg / 1000, volumeCbm);

  const roadVolumetricKg = volumeCm3 / roadDivisor;
  const roadChargeableKg = Math.max(actualWeightKg, roadVolumetricKg);
  const loadingMetres = request.dimensionsCm
    ? (request.dimensionsCm.length / 100) * (request.dimensionsCm.width / loadingWidthCm) * (request.pieces ?? 1)
    : 0;

  return {
    volumeCbm,
    actualWeightKg,
    air: {
      volumetricKg: airVolumetricKg,
      chargeableKg: airChargeableKg,
      basis: airVolumetricKg > actualWeightKg ? "volumetric" : "actual",
    },
    seaLcl: { revenueTon: seaRevenueTon, basis: volumeCbm >= actualWeightKg / 1000 ? "volume" : "weight" },
    road: {
      volumetricKg: roadVolumetricKg,
      chargeableKg: roadChargeableKg,
      loadingMetres,
      basis: roadVolumetricKg > actualWeightKg ? "volumetric" : "actual",
    },
  };
}

export function calculateChargeableWeightKg(request: ShipmentRequest) {
  return calculateFreightMeasures(request).air.chargeableKg;
}
