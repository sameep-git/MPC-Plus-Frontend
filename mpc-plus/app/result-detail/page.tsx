
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { LineChart as ChartIcon } from 'lucide-react';
import { fetchUser, handleApiError, acceptBeams } from '../../lib/api';
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
import { useResultDetailData } from '../../hooks/useResultDetailData';
import { useGraphData } from '../../hooks/useGraphData';
import { mapBeamsToResults, mapGeoCheckToResults } from '../../lib/transformers/resultTransformers';
// Components
import { DateRangePicker } from '../../components/ui/date-range-picker';
import { MetricTable } from '../../components/results/MetricTable';
import { CheckGroup } from '../../components/results/CheckGroup';
import { GraphSection } from '../../components/results/GraphSection';
// Models & Utils
import type { DateRange } from "react-day-picker";

function ResultDetailPageContent() {
  // --- State & Hooks ---
  const [user, setUser] = useState<{ id: string; name?: string; role?: string } | null>(null);

  // Data Hook
  // Data Hook (Date management only)
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

  // Filter and map results for the *selected date* from the broader graph dataset
  const beamResults = useMemo(() => {
    if (!allBeams || allBeams.length === 0) return [];
    // Ensure we match date string format YYYY-MM-DD
    const isoDate = selectedDate.toISOString().split('T')[0];
    const daysBeams = allBeams.filter(b => b.date === isoDate);
    return mapBeamsToResults(daysBeams);
  }, [allBeams, selectedDate]);

  const geoResults = useMemo(() => {
    if (!allGeoChecks || allGeoChecks.length === 0) return [];
    const isoDate = selectedDate.toISOString().split('T')[0];
    const daysGeo = allGeoChecks.find(g => g.date === isoDate);
    return daysGeo ? mapGeoCheckToResults(daysGeo) : [];
  }, [allGeoChecks, selectedDate]);

  // UI State
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set(['group-beam-checks']));
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [signOffSelectedChecks, setSignOffSelectedChecks] = useState<Set<string>>(new Set());
  const [isAccepting, setIsAccepting] = useState(false);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState<Date>(() => new Date());
  const [reportEndDate, setReportEndDate] = useState<Date>(() => new Date());
  const [reportSelectedChecks, setReportSelectedChecks] = useState<Set<string>>(new Set());

  // --- Effects ---
  useEffect(() => {
    fetchUser().then(setUser).catch(console.error);
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

  // Sign Off / Accept Logic (Kept local for now)
  const availableReportChecks = useMemo(() => [
    ...beamResults.map(b => ({ id: b.id, name: b.name, type: 'beam' })),
    ...geoResults.map(g => ({ id: g.id, name: g.name, type: 'geo' }))
  ], [beamResults, geoResults]);

  useEffect(() => {
    if (availableReportChecks.length > 0) {
      // Default report selection: all
      setReportSelectedChecks(new Set(availableReportChecks.map(c => c.id)));

      // Default signoff selection: all BEAMS (checking if they are already accepted is handled in render)
      const beamIds = availableReportChecks.filter(c => c.type === 'beam').map(c => c.id);
      setSignOffSelectedChecks(new Set(beamIds));
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

  const isAllSignOffChecksSelected = availableReportChecks.length > 0 && signOffSelectedChecks.size === availableReportChecks.length;

  const toggleAllSignOffChecks = (checked: boolean) => {
    if (checked) {
      setSignOffSelectedChecks(new Set(availableReportChecks.map(c => c.id)));
    } else {
      setSignOffSelectedChecks(new Set());
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

  const toggleSignOffCheck = (id: string) => {
    setSignOffSelectedChecks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSignOff = async () => {
    try {
      if (!user) {
        alert("User not authenticated.");
        return;
      }
      // Filter functionality: only accept selected beams
      const selectedBeamIds = Array.from(signOffSelectedChecks)
        .filter(id => id.startsWith('beam-'))
        .map(id => id.replace('beam-', ''));

      if (selectedBeamIds.length === 0) return;

      setIsAccepting(true);
      await acceptBeams(selectedBeamIds, user.name || user.id);
      setIsSignOffModalOpen(false);
      refresh();
      // Reset selection after accept
      setSignOffSelectedChecks(new Set());
    } catch (err) {
      console.error("Accept failed", err);
      alert(handleApiError(err));
    } finally {
      setIsAccepting(false);
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
  const renderBeamSection = () => (
    <CheckGroup
      id="group-beam-checks"
      title="Beam Checks"
      isExpanded={expandedChecks.has('group-beam-checks')}
      onToggle={toggleCheckExpand}
      className="border border-gray-200 rounded-lg overflow-hidden bg-white"
    >
      <div className="p-2 space-y-2">
        {dataLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {beamResults.map(check => (
              <CheckGroup
                key={check.id}
                id={check.id}
                title={check.name}
                status={check.status}
                isExpanded={expandedChecks.has(check.id)}
                onToggle={toggleCheckExpand}
              >
                <MetricTable
                  metrics={check.metrics}
                  selectedMetrics={selectedMetrics}
                  onToggleMetric={toggleMetric}
                  showAbsolute={true}
                />
              </CheckGroup>
            ))}
            {beamResults.length === 0 && <div className="p-4 text-muted-foreground text-sm">No beam checks found.</div>}
          </>
        )}
      </div>
    </CheckGroup>
  );

  const renderGeoSection = () => (
    <CheckGroup
      id="group-geo-checks"
      title="Geometry Checks"
      isExpanded={expandedChecks.has('group-geo-checks')}
      onToggle={toggleCheckExpand}
      className="border border-gray-200 rounded-lg overflow-hidden bg-white"
    >
      <div className="p-2 space-y-2">
        {dataLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Simple Groups */}
            {['geo-isocenter', 'geo-collimation', 'geo-gantry', 'geo-couch', 'geo-jaws', 'geo-jaws-parallelism', 'geo-mlc-offsets'].map(id => {
              const check = geoResults.find(c => c.id === id);
              if (!check) return null;
              return (
                <CheckGroup
                  key={check.id}
                  id={check.id}
                  title={check.name}
                  isExpanded={expandedChecks.has(check.id)}
                  onToggle={toggleCheckExpand}
                >
                  <MetricTable
                    metrics={check.metrics}
                    selectedMetrics={selectedMetrics}
                    onToggleMetric={toggleMetric}
                  />
                </CheckGroup>
              );
            })}

            {/* Nested Groups: MLC Leaves */}
            {geoResults.some(c => c.id.includes('geo-mlc-')) && (
              <CheckGroup
                id="geo-mlc-leaves-group"
                title="MLC Leaves"
                isExpanded={expandedChecks.has('geo-mlc-leaves-group')}
                onToggle={toggleCheckExpand}
              >
                <div className="pl-2 space-y-2 pt-2">
                  {['geo-mlc-a', 'geo-mlc-b'].map(id => {
                    const check = geoResults.find(c => c.id === id);
                    if (!check) return null;
                    return (
                      <CheckGroup
                        key={check.id}
                        id={check.id}
                        title={check.name}
                        isExpanded={expandedChecks.has(check.id)}
                        onToggle={toggleCheckExpand}
                      >
                        <MetricTable metrics={check.metrics} selectedMetrics={selectedMetrics} onToggleMetric={toggleMetric} />
                      </CheckGroup>
                    );
                  })}
                </div>
              </CheckGroup>
            )}

            {/* Nested Groups: Backlash Leaves */}
            {geoResults.some(c => c.id.includes('geo-backlash-')) && (
              <CheckGroup
                id="geo-backlash-group"
                title="Backlash Leaves"
                isExpanded={expandedChecks.has('geo-backlash-group')}
                onToggle={toggleCheckExpand}
              >
                <div className="pl-2 space-y-2 pt-2">
                  {['geo-backlash-a', 'geo-backlash-b'].map(id => {
                    const check = geoResults.find(c => c.id === id);
                    if (!check) return null;
                    return (
                      <CheckGroup
                        key={check.id}
                        id={check.id}
                        title={check.name}
                        isExpanded={expandedChecks.has(check.id)}
                        onToggle={toggleCheckExpand}
                      >
                        <MetricTable metrics={check.metrics} selectedMetrics={selectedMetrics} onToggleMetric={toggleMetric} />
                      </CheckGroup>
                    );
                  })}
                </div>
              </CheckGroup>
            )}
          </>
        )}
      </div>
    </CheckGroup>
  );

  const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };



  return (
    <div className="min-h-screen bg-background transition-colors">
      <Navbar user={user} />
      <main className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            MPC Results for {formatDate(selectedDate)}
          </h1>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            {UI_CONSTANTS.PLACEHOLDERS.MPC_RESULTS_DESCRIPTION}
          </p>
          <div className="flex items-center w-full gap-4 flex-wrap">
            <Button
              variant="outline"
              size="lg"
              // Keeping placeholder logic for Generate Report if needed, or removing if deprecated in refactor
              onClick={handleGenerateReport}
              className="text-muted-foreground border-gray-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            >
              {UI_CONSTANTS.BUTTONS.GENERATE_DAILY_REPORT}
            </Button>

            {(() => {
              // Only beam checks are accepted.
              const beams = availableReportChecks.filter(c => c.type === 'beam');
              // Check if ALL beams are accepted
              const allAccepted = beams.length > 0 && beams.every(b => {
                const res = beamResults.find(cr => cr.id === b.id);
                return !!res?.acceptedBy;
              });

              if (allAccepted) {
                // Use info from the first valid beam for display, or generic. Assuming similar acceptance.
                const firstAccepted = beamResults.find(cr => cr.id === beams[0].id);
                const formatTime = (d?: string) => {
                  if (!d) return '';
                  const utc = d.endsWith('Z') ? d : `${d}Z`;
                  return new Date(utc).toLocaleString();
                };
                const timestamp = formatTime(firstAccepted?.acceptedDate);
                return (
                  <div className="flex items-center px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm italic h-11">
                    Accepted by {firstAccepted?.acceptedBy} on {timestamp}
                  </div>
                );
              }

              return (
                <Button
                  onClick={() => setIsSignOffModalOpen(true)}
                  size="lg"
                  variant="default"
                >
                  Accept Results
                </Button>
              );
            })()}

            <Button
              onClick={() => setShowGraph(prev => !prev)}
              size="lg"
              variant={showGraph ? "secondary" : "outline"}
              className={showGraph
                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                : "text-muted-foreground border-gray-300 hover:bg-gray-50 hover:text-primary hover:border-primary/30"}
            >
              Graph
              <ChartIcon className={`ml-2 h-5 w-5 ${showGraph ? 'text-primary' : 'text-gray-500 group-hover:text-primary'}`} />
            </Button>
          </div>
        </div>

        {dataError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {UI_CONSTANTS.ERRORS.LOADING_DATA} {dataError}
          </div>
        )}

        <div className={`grid gap-8 mt-8 ${showGraph ? 'grid-cols-1 lg:grid-cols-[30%_70%]' : 'grid-cols-1'}`}>
          {/* Checks Column */}
          <div className="space-y-4">
            {renderBeamSection()}
            {renderGeoSection()}
          </div>

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

      {/* Sign Off Modal */}
      <Dialog open={isSignOffModalOpen} onOpenChange={setIsSignOffModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Accept Results</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Beams to Accept</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-accept-checks"
                    checked={isAllSignOffChecksSelected}
                    onCheckedChange={(c) => toggleAllSignOffChecks(c as boolean)}
                  />
                  <label
                    htmlFor="select-all-accept-checks"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Select All
                  </label>
                </div>
              </div>
              <div className="border rounded-md h-[200px] overflow-y-auto space-y-2 p-2">
                {beamResults.map(check => {
                  const isAccepted = !!check.acceptedBy;
                  return (
                    <div key={check.id} className="flex flex-col p-1 hover:bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`accept-${check.id}`}
                          checked={isAccepted || signOffSelectedChecks.has(check.id)}
                          disabled={isAccepted}
                          onCheckedChange={() => !isAccepted && toggleSignOffCheck(check.id)}
                        />
                        <label htmlFor={`accept-${check.id}`} className={`text-sm w-full ${isAccepted ? 'text-gray-500 cursor-default' : 'cursor-pointer'}`}>
                          {check.name}
                        </label>
                      </div>
                      {isAccepted && (
                        <div className="ml-6 text-xs text-gray-400 italic">
                          Accepted by {check.acceptedBy} on {(() => {
                            const d = check.acceptedDate;
                            if (!d) return '';
                            const utc = d.endsWith('Z') ? d : `${d}Z`;
                            return new Date(utc).toLocaleString();
                          })()}
                        </div>
                      )}
                    </div>
                  )
                })}
                {beamResults.length === 0 && <div className="text-sm text-gray-400">No beams to accept.</div>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignOffModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSignOff} disabled={isAccepting}>
              {isAccepting ? 'Accepting...' : 'Confirm Acceptance'}
            </Button>
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
