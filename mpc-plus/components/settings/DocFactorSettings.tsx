'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { DatePicker } from '../ui/date-picker';
import {
    fetchDocFactors,
    createDocFactor,
    deleteDocFactor,
    fetchBeamChecksForDate,
    fetchBeamVariantsWithIds,
    fetchMachines,
    type DocFactor,
    type BeamCheckOption,
    type BeamVariantWithId,
} from '../../lib/api';
import type { Machine } from '../../models/Machine';

export default function DocFactorSettings() {
    // Machine state
    const [machines, setMachines] = useState<Machine[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<string>('');
    const [loadingMachines, setLoadingMachines] = useState(true);

    // Data states
    const [docFactors, setDocFactors] = useState<DocFactor[]>([]);
    const [beamVariants, setBeamVariants] = useState<BeamVariantWithId[]>([]);
    const [beamChecks, setBeamChecks] = useState<BeamCheckOption[]>([]);

    // UI states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingBeamChecks, setLoadingBeamChecks] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form states
    const [selectedBeamVariantId, setSelectedBeamVariantId] = useState<string>('');
    const [measurementDate, setMeasurementDate] = useState<Date | undefined>(undefined);
    const [selectedBeamCheckId, setSelectedBeamCheckId] = useState<string>('');
    const [msdAbs, setMsdAbs] = useState<string>('');
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);

    // Computed values
    const selectedBeamCheck = beamChecks.find(b => b.id === selectedBeamCheckId);
    const calculatedDocFactor = selectedBeamCheck && msdAbs
        ? parseFloat(msdAbs) / selectedBeamCheck.relOutput
        : null;
    const selectedMachineName = machines.find(m => m.id === selectedMachineId)?.name;

    // Load machines on mount
    useEffect(() => {
        const loadMachines = async () => {
            try {
                setLoadingMachines(true);
                const machinesData = await fetchMachines();
                setMachines(machinesData);
                if (machinesData.length > 0) {
                    setSelectedMachineId(machinesData[0].id);
                }
            } catch (err) {
                console.error('Failed to load machines:', err);
                setError('Failed to load machines');
            } finally {
                setLoadingMachines(false);
            }
        };
        loadMachines();
    }, []);

    // Load DOC factors when machine changes
    const loadDocFactors = useCallback(async () => {
        if (!selectedMachineId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await fetchDocFactors(selectedMachineId);
            setDocFactors(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load DOC factors');
        } finally {
            setLoading(false);
        }
    }, [selectedMachineId]);

    // Load beam variants on mount
    useEffect(() => {
        const loadBeamVariants = async () => {
            try {
                const variants = await fetchBeamVariantsWithIds();
                setBeamVariants(variants);
            } catch (err) {
                console.error('Failed to load beam variants:', err);
            }
        };
        loadBeamVariants();
    }, []);

    // Load DOC factors when machine changes
    useEffect(() => {
        loadDocFactors();
    }, [loadDocFactors]);

    // Load beam checks when measurement date or beam variant changes
    useEffect(() => {
        const loadBeamChecks = async () => {
            if (!measurementDate || !selectedBeamVariantId || !selectedMachineId) {
                setBeamChecks([]);
                return;
            }

            const variant = beamVariants.find(v => v.id === selectedBeamVariantId);
            if (!variant) {
                console.log('Variant not found for ID:', selectedBeamVariantId);
                return;
            }

            try {
                setLoadingBeamChecks(true);
                setError(null);

                // Format date as YYYY-MM-DD, accounting for timezone
                const year = measurementDate.getFullYear();
                const month = String(measurementDate.getMonth() + 1).padStart(2, '0');
                const day = String(measurementDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                console.log('Fetching beam checks:', { machineId: selectedMachineId, beamType: variant.variant, date: dateStr });

                const checks = await fetchBeamChecksForDate(selectedMachineId, variant.variant, dateStr);
                console.log('Received beam checks:', checks);
                setBeamChecks(checks);
                setSelectedBeamCheckId(''); // Reset selection
            } catch (err) {
                console.error('Failed to load beam checks:', err);
                setError(err instanceof Error ? err.message : 'Failed to load beam checks');
                setBeamChecks([]);
            } finally {
                setLoadingBeamChecks(false);
            }
        };
        loadBeamChecks();
    }, [measurementDate, selectedBeamVariantId, selectedMachineId, beamVariants]);

    // Reset form
    const resetForm = () => {
        setSelectedBeamVariantId('');
        setMeasurementDate(undefined);
        setSelectedBeamCheckId('');
        setMsdAbs('');
        setStartDate(undefined);
        setBeamChecks([]);
        setError(null);
    };

    // Handle create DOC factor
    const handleCreate = async () => {
        if (!selectedBeamCheckId || !msdAbs || !startDate || !selectedBeamVariantId || !selectedMachineId) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            // Format dates properly
            const startYear = startDate.getFullYear();
            const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
            const startDay = String(startDate.getDate()).padStart(2, '0');
            const dateStr = `${startYear}-${startMonth}-${startDay}`;

            const measurementYear = measurementDate?.getFullYear() || startYear;
            const measurementMonth = String((measurementDate?.getMonth() || 0) + 1).padStart(2, '0');
            const measurementDay = String(measurementDate?.getDate() || startDay).padStart(2, '0');
            const measurementDateStr = `${measurementYear}-${measurementMonth}-${measurementDay}`;

            await createDocFactor({
                machineId: selectedMachineId,
                beamVariantId: selectedBeamVariantId,
                beamId: selectedBeamCheckId,
                msdAbs: parseFloat(msdAbs),
                mpcRel: selectedBeamCheck!.relOutput,
                measurementDate: measurementDateStr,
                startDate: dateStr,
            });

            setSuccess('DOC factor created successfully');
            setIsModalOpen(false);
            resetForm();
            await loadDocFactors();

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create DOC factor');
        } finally {
            setSaving(false);
        }
    };

    // Handle delete DOC factor
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this DOC factor?')) return;

        try {
            setError(null);
            await deleteDocFactor(id);
            setSuccess('DOC factor deleted successfully');
            await loadDocFactors();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete DOC factor');
        }
    };

    // Format date for display
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'Current';
        return new Date(dateStr).toLocaleDateString();
    };

    // Get beam variant name by ID
    const getBeamVariantName = (id: string) => {
        return beamVariants.find(v => v.id === id)?.variant || id;
    };

    if (loadingMachines) {
        return (
            <section id="doc-settings" className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 scroll-mt-24">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading machines...</span>
                </div>
            </section>
        );
    }

    return (
        <section
            id="doc-settings"
            className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 scroll-mt-24"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Dose Output Correction
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage DOC factors to convert MPC relative output to absolute values.
                    </p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2"
                    disabled={!selectedMachineId}
                >
                    <Plus className="w-4 h-4" />
                    Add DOC Factor
                </Button>
            </div>

            {/* Machine Selector */}
            <div className="mb-6">
                <Label className="mb-2 block">Select Machine</Label>
                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                    <SelectTrigger className="w-full max-w-xs bg-white dark:bg-gray-900">
                        <SelectValue placeholder="Select a machine" />
                    </SelectTrigger>
                    <SelectContent>
                        {machines.map((machine) => (
                            <SelectItem key={machine.id} value={machine.id}>
                                {machine.name || machine.id}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-700 dark:text-red-400">{error}</span>
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <span className="text-green-700 dark:text-green-400">{success}</span>
                </div>
            )}

            {/* DOC Factors Table */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : docFactors.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No DOC factors configured for {selectedMachineName || 'this machine'}.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Beam Type</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Msd Abs</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">MPC Rel</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">DOC Factor</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Valid From</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Valid Until</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docFactors.map((doc) => (
                                <tr key={doc.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">
                                        {doc.beamVariantName || getBeamVariantName(doc.beamVariantId)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                        {doc.msdAbs?.toFixed(4) ?? '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                        {doc.mpcRel?.toFixed(4) ?? '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                                        {doc.docFactor?.toFixed(4) ?? '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                        {formatDate(doc.startDate)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                        {formatDate(doc.endDate)}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(doc.id!)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add DOC Factor Modal */}
            <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add DOC Factor for {selectedMachineName}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Step 1: Beam Type */}
                        <div>
                            <Label>Beam Type</Label>
                            <Select value={selectedBeamVariantId} onValueChange={setSelectedBeamVariantId}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select beam type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {beamVariants.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>{v.variant}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Step 2: Measurement Date */}
                        {selectedBeamVariantId && (
                            <div>
                                <Label>Measurement Date</Label>
                                <div className="mt-1">
                                    <DatePicker
                                        date={measurementDate}
                                        setDate={setMeasurementDate}
                                        className="w-full"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Select the date when the MSD measurement was taken
                                </p>
                            </div>
                        )}

                        {/* Step 3: Select Beam Check */}
                        {measurementDate && selectedBeamVariantId && (
                            <div>
                                <Label>Select Beam Check</Label>
                                {loadingBeamChecks ? (
                                    <div className="flex items-center gap-2 mt-2 text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading beam checks...
                                    </div>
                                ) : beamChecks.length === 0 ? (
                                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                                        No beam checks found for this date/beam type combination on {selectedMachineName}.
                                    </p>
                                ) : (
                                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                                        {beamChecks.map((check) => (
                                            <label
                                                key={check.id}
                                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedBeamCheckId === check.id
                                                    ? 'bg-primary/10 border border-primary'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="beamCheck"
                                                        checked={selectedBeamCheckId === check.id}
                                                        onChange={() => setSelectedBeamCheckId(check.id)}
                                                        className="w-4 h-4"
                                                    />
                                                    <span className="text-sm">
                                                        {new Date(check.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                                    Rel: {check.relOutput.toFixed(4)}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Msd Abs Value */}
                        {selectedBeamCheckId && (
                            <div>
                                <Label>Measured Absolute Output (Msd Abs)</Label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    value={msdAbs}
                                    onChange={(e) => setMsdAbs(e.target.value)}
                                    placeholder="Enter measured absolute value"
                                    className="mt-1"
                                />
                            </div>
                        )}

                        {/* Step 5: Start Date */}
                        {msdAbs && (
                            <div>
                                <Label>Valid From (Start Date)</Label>
                                <div className="mt-1">
                                    <DatePicker
                                        date={startDate}
                                        setDate={setStartDate}
                                        className="w-full"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    DOC factor will apply to results from this date onwards
                                </p>
                            </div>
                        )}

                        {/* Calculated DOC Factor Preview */}
                        {calculatedDocFactor !== null && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="text-sm text-blue-700 dark:text-blue-400">
                                    <strong>Calculated DOC Factor:</strong> {calculatedDocFactor.toFixed(4)}
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                    Formula: {msdAbs} / {selectedBeamCheck?.relOutput.toFixed(4)} = {calculatedDocFactor.toFixed(4)}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!selectedBeamCheckId || !msdAbs || !startDate || saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Create DOC Factor'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
