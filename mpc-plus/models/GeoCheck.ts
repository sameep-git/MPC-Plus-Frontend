
export interface GeoCheck {
    id: string;
    type: string;
    date: string; // ISO date
    machineId: string;
    path?: string;
    timestamp?: string; // ISO date-time

    // IsoCenter
    isoCenterSize?: number;
    isoCenterMVOffset?: number;
    isoCenterKVOffset?: number;

    // Beam
    relativeOutput?: number;
    relativeUniformity?: number;
    centerShift?: number;

    // Collimation & Gantry
    collimationRotationOffset?: number;
    gantryAbsolute?: number;
    gantryRelative?: number;

    // Couch
    couchLat?: number;
    couchLng?: number;
    couchVrt?: number;
    couchRtnFine?: number;
    couchRtnLarge?: number;
    couchMaxPositionError?: number;
    rotationInducedCouchShiftFullRange?: number;

    // MLC Offsets
    meanOffsetA?: number;
    meanOffsetB?: number;
    maxOffsetA?: number;
    maxOffsetB?: number;

    // MLC Backlash Aggregates
    mlcBacklashMaxA?: number;
    mlcBacklashMaxB?: number;
    mlcBacklashMeanA?: number;
    mlcBacklashMeanB?: number;

    // Jaws
    jawX1?: number;
    jawX2?: number;
    jawY1?: number;
    jawY2?: number;

    // Jaw Parallelism
    jawParallelismX1?: number;
    jawParallelismX2?: number;
    jawParallelismY1?: number;
    jawParallelismY2?: number;

    // Detailed MLC Data (Leaf11 - Leaf50)
    mlcLeavesA?: Record<string, number>;
    mlcLeavesB?: Record<string, number>;
    mlcBacklashA?: Record<string, number>;
    mlcBacklashB?: Record<string, number>;

    note?: string;
    createdAt?: string;
    updatedAt?: string;
}

export default GeoCheck;
