'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { fetchMachines, fetchUser, fetchResults, handleApiError, fetchBeamTypes } from '../../lib/api';
import type { Machine as MachineType } from '../../models/Machine';
import {
  Navbar,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Checkbox,
  DatePicker
} from '../../components/ui';
import { UI_CONSTANTS, CALENDAR_CONSTANTS } from '../../constants';

// API response types
interface DayCheckStatus {
  date: string;
  beamCheckStatus: 'pass' | 'warning' | 'fail' | null;
  geometryCheckStatus: 'pass' | 'warning' | 'fail' | null;
}

interface MonthlyResults {
  month: number;
  year: number;
  machineId: string;
  checks: DayCheckStatus[];
}

export default function MPCResultPage() {

  const router = useRouter();
  const [machines, setMachines] = useState<MachineType[]>([]);
  const [user, setUser] = useState<{ id: string; name?: string } | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<MachineType | null>(null);
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [monthlyResults, setMonthlyResults] = useState<MonthlyResults | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Report Generation Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState<Date>(() => new Date());
  const [reportEndDate, setReportEndDate] = useState<Date>(() => new Date());
  const [reportSelectedChecks, setReportSelectedChecks] = useState<Set<string>>(new Set());
  const [availableReportChecks, setAvailableReportChecks] = useState<{ id: string; name: string; type: 'beam' | 'geo' }[]>([]);

  // Initialize available checks
  useEffect(() => {
    const loadChecks = async () => {
      // Static Geometry Checks
      const geoChecks = [
        { id: 'geo-isocenter', name: 'IsoCenter Group', type: 'geo' },
        { id: 'geo-beam', name: 'Beam Group', type: 'geo' },
        { id: 'geo-collimation', name: 'Collimation Group', type: 'geo' },
        { id: 'geo-gantry', name: 'Gantry Group', type: 'geo' },
        { id: 'geo-couch', name: 'Enhanced Couch Group', type: 'geo' },
        { id: 'geo-mlc-a', name: 'MLC Leaves A', type: 'geo' },
        { id: 'geo-mlc-b', name: 'MLC Leaves B', type: 'geo' },
        { id: 'geo-mlc-offsets', name: 'MLC Offsets', type: 'geo' },
        { id: 'geo-backlash-a', name: 'Backlash Leaves A', type: 'geo' },
        { id: 'geo-backlash-b', name: 'Backlash Leaves B', type: 'geo' },
        { id: 'geo-jaws', name: 'Jaws Group', type: 'geo' },
        { id: 'geo-jaws-parallelism', name: 'Jaws Parallelism', type: 'geo' },
      ] as const;

      // Fetch Beam Types to build dynamic beam list
      let beamChecks: { id: string; name: string; type: 'beam' }[] = [];
      try {
        const types = await fetchBeamTypes();
        if (types && types.length > 0) {
          beamChecks = types.map(t => ({
            id: `beam-${t}`,
            name: `Beam Check (${t})`,
            type: 'beam'
          }));
        } else {
          // Fallback default
          const defaults = ['6x', '6xFFF', '10x', '10xFFF', '15x', '6e', '9e', '12e', '16e', '20e'];
          beamChecks = defaults.map(t => ({ id: `beam-${t}`, name: `Beam Check (${t})`, type: 'beam' }));
        }
      } catch (e) {
        console.error('Failed to fetch beam types for report:', e);
        // Fallback default on error
        const defaults = ['6x', '6xFFF', '10x', '10xFFF', '15x', '6e', '9e', '12e', '16e', '20e'];
        beamChecks = defaults.map(t => ({ id: `beam-${t}`, name: `Beam Check (${t})`, type: 'beam' }));
      }

      setAvailableReportChecks([...beamChecks, ...geoChecks]);
      // Default select all
      setReportSelectedChecks(new Set([...beamChecks, ...geoChecks].map(c => c.id)));
    };

    if (isReportModalOpen) {
      loadChecks();
    }
  }, [isReportModalOpen]);

  const toggleReportCheck = (checkId: string) => {
    setReportSelectedChecks(prev => {
      const next = new Set(prev);
      if (next.has(checkId)) {
        next.delete(checkId);
      } else {
        next.add(checkId);
      }
      return next;
    });
  };

  const toggleAllReportChecks = (checked: boolean) => {
    if (checked) {
      setReportSelectedChecks(new Set(availableReportChecks.map(c => c.id)));
    } else {
      setReportSelectedChecks(new Set());
    }
  };

  const isAllChecksSelected = availableReportChecks.length > 0 && reportSelectedChecks.size === availableReportChecks.length;
  const handleSaveReport = () => {
    console.log('Generating report', { start: reportStartDate, end: reportEndDate, checks: Array.from(reportSelectedChecks) });
    setIsReportModalOpen(false);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [machinesData, userData] = await Promise.all([
          fetchMachines(),
          fetchUser()
        ]);
        setMachines(machinesData);
        setUser(userData);

        // Set machine from localStorage or default to first machine
        if (machinesData.length > 0) {
          const savedMachineId = typeof window !== 'undefined' ? localStorage.getItem('selectedMachineId') : null;
          const machineToSelect = savedMachineId
            ? machinesData.find(m => m.id === savedMachineId) || machinesData[0]
            : machinesData[0];
          setSelectedMachine(machineToSelect);

          // Update localStorage to ensure it's set
          if (typeof window !== 'undefined') {
            localStorage.setItem('selectedMachineId', machineToSelect.id);
          }
        }

        // Month and year default to current via initial state
      } catch (error) {
        const errorMessage = handleApiError(error);
        setError(errorMessage);
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      const loadResults = async () => {
        try {
          setError(null);
          const data = await fetchResults(selectedMonth + 1, selectedYear, selectedMachine.id);
          setMonthlyResults(data);
        } catch (err) {
          const errorMessage = handleApiError(err);
          setError(errorMessage);
          console.error('Error loading results:', err);
          setMonthlyResults(null);
        } finally {

        }
      };

      loadResults();
    }
  }, [selectedMachine, selectedMonth, selectedYear]);

  const handleGenerateReport = () => {
    setIsReportModalOpen(true);
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, month, year });
    }

    return days;
  };

  const getResultsForDate = (dayObj: { day: number; month: number; year: number }) => {
    if (!monthlyResults) return null;

    const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    return monthlyResults.checks.find((check: DayCheckStatus) => {
      // Extract just the date portion (YYYY-MM-DD) from the API response which may include timestamps
      const checkDate = check.date.split('T')[0];
      return checkDate === dateStr;
    });
  };

  const handleDateClick = (dayObj: { day: number; month: number; year: number }) => {
    const results = getResultsForDate(dayObj);
    if (results) {
      // Navigate to detail page with the date passed through router state (hidden from URL)
      const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
      // Store the date and a guard flag in sessionStorage for the detail page to retrieve
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('resultDetailFrom', '1');
        sessionStorage.setItem('resultDetailDate', dateStr);
        if (selectedMachine) {
          sessionStorage.setItem('resultDetailMachineId', selectedMachine.id);
        }
        // Also store the day's status to pre-fill the UI
        try {
          sessionStorage.setItem('resultDetailDayStatus', JSON.stringify(results));
        } catch { }
      }
      router.push(`/result-detail`);
    }
  };

  // Format helpers not needed; using month/year state directly

  const weekDays = CALENDAR_CONSTANTS.WEEK_DAYS;

  if (loading) {
    return (
      <div className="min-h-screen bg-background transition-colors">
        <Navbar user={user} />
        <main className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-10 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors">
      <Navbar user={user} />

      <main className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {UI_CONSTANTS.TITLES.MPC_RESULTS}
            </h1>
            <p className="text-muted-foreground mb-6 max-w-2xl">
              {UI_CONSTANTS.PLACEHOLDERS.MPC_RESULTS_DESCRIPTION}
            </p>
          </div>
          <Button onClick={handleGenerateReport} size="lg">
            {UI_CONSTANTS.BUTTONS.GENERATE_REPORT}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{UI_CONSTANTS.ERRORS.LOADING_DATA} {error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              className="mt-2 text-red-600 hover:text-red-800"
            >
              {UI_CONSTANTS.BUTTONS.RETRY}
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 space-y-6">
          {/* Machine Selection */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-muted-foreground">{UI_CONSTANTS.LABELS.MACHINE}</label>
            <div className="relative">
              <Select
                value={selectedMachine?.id || ''}
                onValueChange={(val) => {
                  const machine = machines.find(m => m.id === val);
                  setSelectedMachine(machine || null);
                }}
              >
                <SelectTrigger className="w-[200px] bg-primary text-primary-foreground border-primary">
                  <SelectValue placeholder="Select Machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Month/Year Selection */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-muted-foreground">Month</label>
              <div className="relative">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(val) => setSelectedMonth(Number(val))}
                >
                  <SelectTrigger className="w-[140px] bg-white text-foreground border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, idx) => (
                      <SelectItem key={name} value={idx.toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-muted-foreground">Year</label>
              <div className="relative">
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(val) => setSelectedYear(Number(val))}
                >
                  <SelectTrigger className="w-[120px] bg-white text-foreground border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const y = today.getFullYear() - 5 + i;
                      return (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-card text-card-foreground border border-border rounded-lg p-6">
          {/* Month/Year Heading with Navigation */}
          <div className="flex justify-between items-center mb-6 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(prev => prev - 1);
                } else {
                  setSelectedMonth(prev => prev - 1);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </Button>
            <h2 className="text-xl font-semibold text-foreground">
              {monthNames[selectedMonth]} {selectedYear}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(prev => prev + 1);
                } else {
                  setSelectedMonth(prev => prev + 1);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {getDaysInMonth(new Date(selectedYear, selectedMonth, 1)).map((dayObj, index) => {
              if (dayObj === null) {
                return <div key={`empty-${index}`} className="p-2"></div>;
              }

              const results = getResultsForDate(dayObj);
              const uniqueKey = `${dayObj.year}-${dayObj.month}-${dayObj.day}`;
              const hasResults = results && (results.beamCheckStatus || results.geometryCheckStatus);

              return (
                <div
                  key={uniqueKey}
                  onClick={() => hasResults && handleDateClick(dayObj)}
                  className={`p-2 min-h-[${CALENDAR_CONSTANTS.MIN_CALENDAR_HEIGHT}px] border border-gray-100 transition-colors ${hasResults
                    ? 'hover:bg-gray-50 cursor-pointer hover:border-primary'
                    : ''
                    }`}
                >
                  <div className="text-sm font-medium text-foreground mb-1">
                    {dayObj.day}
                  </div>

                  {results && (
                    <div className="space-y-1">
                      {results.geometryCheckStatus && (
                        <div className={`text-xs px-2 py-1 rounded ${results.geometryCheckStatus === 'pass'
                          ? 'bg-green-100 text-green-800'
                          : results.geometryCheckStatus === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {UI_CONSTANTS.CHECKS.GEOMETRY_CHECK}
                        </div>
                      )}
                      {results.beamCheckStatus && (
                        <div className={`text-xs px-2 py-1 rounded ${results.beamCheckStatus === 'pass'
                          ? 'bg-green-100 text-green-800'
                          : results.beamCheckStatus === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {UI_CONSTANTS.CHECKS.BEAM_CHECK}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Results Summary */}
        {selectedMachine && monthlyResults && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {UI_CONSTANTS.TITLES.RESULTS_SUMMARY} {selectedMachine.name}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{UI_CONSTANTS.SUMMARY.TOTAL_CHECKS}</span>
                <span className="ml-2 font-medium">
                  {monthlyResults.checks.filter(c => c.beamCheckStatus || c.geometryCheckStatus).length}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{UI_CONSTANTS.SUMMARY.GEOMETRY_CHECKS}</span>
                <span className="ml-2 font-medium">
                  {monthlyResults.checks.filter((c: DayCheckStatus) => c.geometryCheckStatus).length}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{UI_CONSTANTS.SUMMARY.BEAM_CHECKS}</span>
                <span className="ml-2 font-medium">
                  {monthlyResults.checks.filter((c: DayCheckStatus) => c.beamCheckStatus).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Report Generation Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Date Range Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  date={reportStartDate}
                  setDate={(d) => d && setReportStartDate(d)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  date={reportEndDate}
                  setDate={(d) => d && setReportEndDate(d)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Check Selection */}
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
              <div className="border rounded-md h-[300px] overflow-y-auto space-y-4">
                {availableReportChecks.length > 0 ? (
                  <>
                    {/* Beam Checks Group */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide sticky top-0 bg-white z-10 py-1 px-2 border-b">Beam Checks</div>
                      <div className="space-y-1 px-2">
                        {availableReportChecks.filter(c => c.type === 'beam').map((check) => (
                          <div key={check.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={`check-${check.id}`}
                              checked={reportSelectedChecks.has(check.id)}
                              onCheckedChange={() => toggleReportCheck(check.id)}
                            />
                            <label
                              htmlFor={`check-${check.id}`}
                              className="text-sm cursor-pointer w-full"
                            >
                              {check.name}
                            </label>
                          </div>
                        ))}
                        {availableReportChecks.filter(c => c.type === 'beam').length === 0 && <div className="text-sm text-gray-400 pl-2">No beam checks</div>}
                      </div>
                    </div>

                    {/* Geometry Checks Group */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2 mt-2 uppercase tracking-wide sticky top-0 bg-white z-10 py-1 px-2 border-b">Geometry Checks</div>
                      <div className="space-y-1 px-2">
                        {availableReportChecks.filter(c => c.type === 'geo').map((check) => (
                          <div key={check.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={`check-${check.id}`}
                              checked={reportSelectedChecks.has(check.id)}
                              onCheckedChange={() => toggleReportCheck(check.id)}
                            />
                            <label
                              htmlFor={`check-${check.id}`}
                              className="text-sm cursor-pointer w-full"
                            >
                              {check.name}
                            </label>
                          </div>
                        ))}
                        {availableReportChecks.filter(c => c.type === 'geo').length === 0 && <div className="text-sm text-gray-400 pl-2">No geometry checks</div>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 p-2 text-center">Loading checks...</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveReport}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
