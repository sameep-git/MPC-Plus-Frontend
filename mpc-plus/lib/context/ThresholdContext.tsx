'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchThresholds, Threshold } from '../api';

interface ThresholdContextType {
    thresholds: Threshold[];
    loading: boolean;
    error: string | null;
    getThreshold: (machineId: string, checkType: 'geometry' | 'beam', metricType: string, beamVariant?: string) => number | null;
    refreshThresholds: () => Promise<void>;
}

const ThresholdContext = createContext<ThresholdContextType | undefined>(undefined);

export function ThresholdProvider({ children }: { children: React.ReactNode }) {
    const [thresholds, setThresholds] = useState<Threshold[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch once on mount
        const loadThresholds = async () => {
            try {
                const data = await fetchThresholds();
                setThresholds(data);
            } catch (err) {
                console.error('Failed to load thresholds', err);
                setError('Failed to load thresholds');
            } finally {
                setLoading(false);
            }
        };

        loadThresholds();
    }, []);

    const getThreshold = (
        machineId: string,
        checkType: 'geometry' | 'beam',
        metricType: string,
        beamVariant?: string
    ): number | null => {
        // Find matching threshold
        // Priority: Specific beam variant > General (no variant)
        // Note: The API/DB might store metrics slightly differently, so fuzzy matching might be needed eventually.
        // For now, strict matching based on how we expect to query.

        // Normalize metric type for comparison if needed (e.g. lowercase)
        const normalizedMetric = metricType.toLowerCase();

        // 1. Try exact match with variant
        let match = thresholds.find(t =>
            t.machineId === machineId &&
            t.checkType === checkType &&
            t.metricType.toLowerCase() === normalizedMetric &&
            t.beamVariant === beamVariant
        );

        // 2. If not found and variants don't matter (or fallback logic applies), maybe try without variant?
        // Usually thresholds are specific to variants for beams. For geometry, beamVariant might be undefined.
        if (!match && !beamVariant) {
            match = thresholds.find(t =>
                t.machineId === machineId &&
                t.checkType === checkType &&
                t.metricType.toLowerCase() === normalizedMetric
            );
        }

        return match ? match.value : null;
    };

    const refreshThresholds = async () => {
        setLoading(true);
        try {
            const data = await fetchThresholds();
            setThresholds(data);
            setError(null);
        } catch (err) {
            console.error('Failed to refresh thresholds', err);
            setError('Failed to refresh thresholds');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThresholdContext.Provider value={{ thresholds, loading, error, getThreshold, refreshThresholds }}>
            {children}
        </ThresholdContext.Provider>
    );
}

export function useThresholds() {
    const context = useContext(ThresholdContext);
    if (context === undefined) {
        throw new Error('useThresholds must be used within a ThresholdProvider');
    }
    return context;
}
