
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { fetchUser, handleApiError, approveBeams } from '../../lib/api';
import {
  Navbar,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Checkbox,
} from '../../components/ui';
import { UI_CONSTANTS } from '../../constants';
// Hooks
// Hooks
import { useResultDetailData } from '../../hooks/useResultDetailData';
import { useGraphData } from '../../hooks/useGraphData';
import { mapBeamsToResults, mapGeoCheckToResults } from '../../lib/transformers/resultTransformers';
// Components
import { DateRangePicker } from '../../components/ui/date-range-picker';
import { MetricTable } from '../../components/results/MetricTable';
import { GraphSection } from '../../components/results/GraphSection';
import { ResultHeader } from '../../components/results/ResultHeader';
import { ResultList } from '../../components/results/ResultList';
import type { CheckGroup as CheckGroupModel } from '../../models/CheckGroup';
import type { DateRange } from "react-day-picker";
import { useThresholds } from '../../lib/context/ThresholdContext';

function ResultDetailPageContent() {
  // --- State & Hooks ---
  const [user, setUser] = useState<{ id: string; name?: string; role?: string } | null>(null);
  const { thresholds } = useThresholds();

  // Data Hook
  const {
    selectedDate,
    updateDate,
  } = useResultDetailData();

  // const router = useRouter(); // Unused
  const searchParams = useSearchParams();

  // Ensure machineId is available for graph (hook handles it too, but we need it here for graph hook)
  const machineId = searchParams.get('machineId') ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('resultDetailMachineId') : '') || '';

  // Graph State
  const [showGraph, setShowGraph] = useState<boolean>(false);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [graphDateRange, setGraphDateRange] = useState<{ start: Date; end: Date }>(() => {
    // Initial range: 14 days ending on selected date
    const end = new Date(selectedDate);
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 14);
    return { start, end };
  });

  // Sync graph range end to selected date when page loads/changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGraphDateRange(prev => {
      const end = new Date(selectedDate);
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - 14);
      if (prev.end.getTime() === end.getTime() && prev.start.getTime() === start.getTime()) return prev;
      return { start, end };
    });
  }, [selectedDate]);

  const { data: graphData, beams: allBeams, geoChecks: allGeoChecks, loading: dataLoading, error: dataError, refresh } = useGraphData(graphDateRange.start, graphDateRange.end, machineId);

  // Pagination State
  const [activeCheckIndex, setActiveCheckIndex] = useState(0);

  // Reset pagination when date changes
  useEffect(() => {
    setActiveCheckIndex(0);
  }, [selectedDate]);

  // Filter groups for the *selected date*
  const dailyGroups = useMemo(() => {
    if (!allBeams || allBeams.length === 0) return [];

    // allBeams is CheckGroup[] from the updated API/Hook pipe
    const groups = allBeams as unknown as CheckGroupModel[];

    const isoDate = selectedDate.toISOString().split('T')[0];
    // Filter by timestamp matching the date
    return groups
      .filter(g => g.timestamp.startsWith(isoDate))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [allBeams, selectedDate]);

  // Map results for the CURRENT active check group
  const beamResults = useMemo(() => {
    if (dailyGroups.length === 0) return [];
    const group = dailyGroups[activeCheckIndex];
    // fallback to first if index out of bounds (safety)
    const beams = group ? group.beams : dailyGroups[0].beams;
    return mapBeamsToResults(beams, thresholds);
  }, [dailyGroups, activeCheckIndex, thresholds]);


  // Determine the timestamp of the currently selected beam check group
  const activeBeamTimestamp = useMemo(() => {
    if (dailyGroups.length > 0 && dailyGroups[activeCheckIndex]) {
      // Prefer timestamp field, fallback to date if needed
      const ts = dailyGroups[activeCheckIndex].timestamp;
      return ts ? new Date(ts).getTime() : null;
    }
    return null;
  }, [dailyGroups, activeCheckIndex]);

  const geoResults = useMemo(() => {
    if (!allGeoChecks || allGeoChecks.length === 0) return [];

    const targetDateStr = selectedDate.toISOString().split('T')[0];

    // 1. Filter checks belonging to the selected date
    // We check if the date string starts with our target YYYY-MM-DD
    const dayGeoChecks = allGeoChecks.filter(g =>
      (g.date && g.date.startsWith(targetDateStr)) ||
      (g.timestamp && g.timestamp.startsWith(targetDateStr))
    );

    if (dayGeoChecks.length === 0) return [];

    let selectedGeoCheck = dayGeoChecks[0];

    // 2. If we have an active beam check, find the GeoCheck closest in time
    if (activeBeamTimestamp) {
      let minDiff = Number.MAX_VALUE;

      dayGeoChecks.forEach(g => {
        // Use timestamp if available, else date
        const timeStr = g.timestamp || g.date;
        if (!timeStr) return;

        const gTime = new Date(timeStr).getTime();
        const diff = Math.abs(gTime - activeBeamTimestamp);

        if (diff < minDiff) {
          minDiff = diff;
          selectedGeoCheck = g;
        }
      });
    }

    // 3. Map the selected GeoCheck to results
    return mapGeoCheckToResults(selectedGeoCheck, thresholds);
  }, [allGeoChecks, selectedDate, thresholds, activeBeamTimestamp]);

  // UI State
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set(['group-beam-checks']));
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  // Removed signOffSelectedChecks as we now approve all after viewing
  const [isApproving, setIsApproving] = useState(false);
  const [approvalCurrentIndex, setApprovalCurrentIndex] = useState(0);
  const [approvalVisitedIndices, setApprovalVisitedIndices] = useState<Set<number>>(new Set([0]));

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState<Date>(() => new Date());
  const [reportEndDate, setReportEndDate] = useState<Date>(() => new Date());
  const [reportSelectedChecks, setReportSelectedChecks] = useState<Set<string>>(new Set());

  // --- Effects ---
  useEffect(() => {
    fetchUser().then(setUser).catch(console.error);
    // Thresholds now handled by context
  }, []);

  // --- Handlers ---
  const toggleCheckExpand = (checkId: string) => {
    setExpandedChecks(prev => {
      const next = new Set(prev);
      if (next.has(checkId)) next.delete(checkId);
      else next.add(checkId);
      return next;
    });
  };

  const toggleMetric = (metricName: string) => {
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metricName)) next.delete(metricName);
      else next.add(metricName);
      return next;
    });
    setShowGraph(true);
  };

  // Graph Date Helpers
  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setGraphDateRange({
        start: range.from,
        end: range.to || range.from
      });
    }
  };

  const handleQuickDateRange = (range: string) => {
    const today = new Date();
    let start: Date;
    let end = new Date(today);

    switch (range) {
      case 'today': start = today; end = today; break;
      case 'yesterday':
        start = new Date(today); start.setDate(start.getDate() - 1); end = new Date(start); break;
      case 'lastWeek': start = new Date(today); start.setDate(start.getDate() - 7); break;
      case 'lastMonth': start = new Date(today); start.setMonth(start.getMonth() - 1); break;
      case 'lastQuarter': start = new Date(today); start.setMonth(start.getMonth() - 3); break;
      default: return;
    }
    setGraphDateRange({ start, end });
  };

  // --- Report Helpers ---
  const availableReportChecks = useMemo(() => [
    ...beamResults.map(b => ({ id: b.id, name: b.name, type: 'beam' })),
    ...geoResults.map(g => ({ id: g.id, name: g.name, type: 'geo' }))
  ], [beamResults, geoResults]);

  useEffect(() => {
    if (availableReportChecks.length > 0) {
      // Default report selection: all
      setReportSelectedChecks(new Set(availableReportChecks.map(c => c.id)));
    }
  }, [availableReportChecks]);

  // Helpers for Select All
  const isAllChecksSelected = availableReportChecks.length > 0 && reportSelectedChecks.size === availableReportChecks.length;

  const toggleAllReportChecks = (checked: boolean) => {
    if (checked) {
      setReportSelectedChecks(new Set(availableReportChecks.map(c => c.id)));
    } else {
      setReportSelectedChecks(new Set());
    }
  };

  const toggleReportCheck = (id: string) => {
    setReportSelectedChecks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Approval Modal Handlers ---
  const openApprovalModal = () => {
    setApprovalCurrentIndex(0);
    setApprovalVisitedIndices(new Set([0]));
    setIsSignOffModalOpen(true);
  };

  const handleNextBeam = () => {
    const nextIndex = approvalCurrentIndex + 1;
    // Filter out already approved beams to know the true length of what we are approving?
    // The requirement says "visit every beam type".
    // We will iterate through `beamResults`.
    if (nextIndex < beamResults.length) {
      setApprovalCurrentIndex(nextIndex);
      setApprovalVisitedIndices(prev => {
        const next = new Set(prev);
        next.add(nextIndex);
        return next;
      });
    }
  };

  const handlePrevBeam = () => {
    if (approvalCurrentIndex > 0) {
      setApprovalCurrentIndex(approvalCurrentIndex - 1);
    }
  };

  const handleApproveAll = async () => {
    try {
      if (!user) {
        alert("User not authenticated.");
        return;
      }

      // Collect ALL beam IDs that are NOT yet approved
      const beamsToApprove = beamResults
        .filter(b => !b.approvedBy)
        .map(b => b.id.replace('beam-', ''));

      if (beamsToApprove.length === 0) {
        setIsSignOffModalOpen(false);
        return;
      }

      setIsApproving(true);
      await approveBeams(beamsToApprove, user.name || user.id);
      setIsSignOffModalOpen(false);
      refresh();
    } catch (err) {
      console.error("Approve failed", err);
      alert(handleApiError(err));
    } finally {
      setIsApproving(false);
    }
  };

  const handleGenerateReport = () => {
    setIsReportModalOpen(true);
  };

  const handleSaveReport = () => {
    // Placeholder for actual report generation
    setIsReportModalOpen(false);
  };

  const getAllAvailableMetrics = (): string[] => {
    const metricsSet = new Set<string>();
    [...beamResults, ...geoResults].forEach(check => {
      check.metrics.forEach(metric => {
        if (!metric.name.includes('Leaf')) metricsSet.add(metric.name);
      });
    });
    return Array.from(metricsSet).sort();
  };

  // --- Render Helpers ---


  const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };



  return (
    <div className="min-h-screen bg-background transition-colors">
      <Navbar user={user} />
      <main className="p-6 max-w-7xl mx-auto">
        <ResultHeader
          selectedDate={selectedDate}
          onGenerateReport={handleGenerateReport}
          onApprove={openApprovalModal}
          onToggleGraph={() => setShowGraph(prev => !prev)}
          showGraph={showGraph}
          availableReportChecks={availableReportChecks}
          beamResults={beamResults}
        />

        {dataError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {UI_CONSTANTS.ERRORS.LOADING_DATA} {dataError}
          </div>
        )}

        <div className={`grid gap-8 mt-8 ${showGraph ? 'grid-cols-1 lg:grid-cols-[30%_70%]' : 'grid-cols-1'}`}>
          <ResultList
            beamResults={beamResults}
            geoResults={geoResults}
            dailyGroups={dailyGroups}
            activeCheckIndex={activeCheckIndex}
            setActiveCheckIndex={setActiveCheckIndex}
            expandedChecks={expandedChecks}
            toggleCheckExpand={toggleCheckExpand}
            selectedMetrics={selectedMetrics}
            toggleMetric={toggleMetric}
            dataLoading={dataLoading}
          />

          {/* Graph Column */}
          {showGraph && (
            <div className="space-y-6">
              <GraphSection
                data={graphData}
                selectedMetrics={selectedMetrics}
                onToggleMetric={toggleMetric}
                onClearMetrics={() => setSelectedMetrics(new Set())}
                onClose={() => setShowGraph(false)}
                availableMetrics={getAllAvailableMetrics()}
              />
              {/* Quick Dates */}
              <div className="mb-4 border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex gap-2">
                    {['lastWeek', 'lastMonth', 'lastQuarter'].map((rangeType) => (
                      <Button
                        key={rangeType}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuickDateRange(rangeType)}
                        className="hover:text-primary hover:bg-primary/10"
                      >
                        {rangeType.replace('last', 'Last ')}
                      </Button>
                    ))}
                  </div>
                  <DateRangePicker
                    date={{ from: graphDateRange.start, to: graphDateRange.end }}
                    setDate={handleDateRangeChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Report Generation Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker
                date={{ from: reportStartDate, to: reportEndDate }}
                setDate={(range: DateRange | undefined) => {
                  if (range?.from) {
                    setReportStartDate(range.from);
                    setReportEndDate(range.to || range.from);
                  }
                }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Checks</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-checks"
                    checked={isAllChecksSelected}
                    onCheckedChange={(c) => toggleAllReportChecks(c as boolean)}
                  />
                  <label
                    htmlFor="select-all-checks"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              </div>
              <div className="border rounded-md h-[200px] overflow-y-auto space-y-2 p-2">
                {availableReportChecks.map(check => (
                  <div key={check.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`report-${check.id}`}
                      checked={reportSelectedChecks.has(check.id)}
                      onCheckedChange={() => toggleReportCheck(check.id)}
                    />
                    <label htmlFor={`report-${check.id}`} className="text-sm cursor-pointer w-full">
                      {check.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveReport}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Off Modal (Paginated) */}
      <Dialog open={isSignOffModalOpen} onOpenChange={setIsSignOffModalOpen}>
        <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Approve Results ({approvalCurrentIndex + 1} of {beamResults.length})</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {beamResults.length > 0 && (() => {
              const currentBeam = beamResults[approvalCurrentIndex];
              // Safe check for data consistency during updates/modal transitions
              if (!currentBeam) return null;

              const isPass = currentBeam.status === 'PASS';
              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{currentBeam.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Review data carefully before approving.
                      </p>
                    </div>
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isPass ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                      {currentBeam.status}
                    </div>
                  </div>

                  {/* Reusing MetricTable logic but inline or we can just render the component */}
                  <div className="border rounded-lg overflow-hidden">
                    <MetricTable
                      metrics={currentBeam.metrics}
                      selectedMetrics={new Set()}
                      onToggleMetric={() => { }} // No graphing in modal
                      showAbsolute={true}
                    />
                  </div>
                </div>
              );
            })()}
            {beamResults.length === 0 && <div className="text-center text-muted-foreground mt-10">No results to show.</div>}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full mt-auto border-t pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevBeam}
                disabled={approvalCurrentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNextBeam}
                disabled={approvalCurrentIndex === beamResults.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsSignOffModalOpen(false)}>Cancel</Button>
              <Button
                onClick={handleApproveAll}
                disabled={isApproving || approvalVisitedIndices.size < beamResults.length}
                variant={approvalVisitedIndices.size < beamResults.length ? "secondary" : "default"}
              >
                {isApproving ? 'Approving...' : 'Approve All'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResultDetailPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ResultDetailPageContent />
    </Suspense>
  );
}
