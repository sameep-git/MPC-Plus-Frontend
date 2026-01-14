'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { fetchMachines, fetchUser, fetchResults, handleApiError } from '../../lib/api';
import type { Machine as MachineType } from '../../models/Machine';
import { Navbar, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui';
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
    console.log('Generating report for:', {
      machine: selectedMachine?.name,
      month: selectedMonth + 1,
      year: selectedYear,
      resultsCount: monthlyResults?.checks.length ?? 0
    });
    // TODO: Implement actual report generation
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
      <div className="min-h-screen bg-white">
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
    <div className="min-h-screen bg-white">
      <Navbar user={user} />

      <main className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {UI_CONSTANTS.TITLES.MPC_RESULTS}
            </h1>
            <p className="text-gray-600 mb-6 max-w-2xl">
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
            <label className="text-sm font-medium text-gray-700">{UI_CONSTANTS.LABELS.MACHINE}</label>
            <div className="relative">
              <Select
                value={selectedMachine?.id || ''}
                onValueChange={(val) => {
                  const machine = machines.find(m => m.id === val);
                  setSelectedMachine(machine || null);
                }}
              >
                <SelectTrigger className="w-[200px] bg-purple-900 text-white border-purple-800">
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
              <label className="text-sm font-medium text-gray-700">Month</label>
              <div className="relative">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(val) => setSelectedMonth(Number(val))}
                >
                  <SelectTrigger className="w-[140px] bg-white text-gray-900 border-gray-300">
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
              <label className="text-sm font-medium text-gray-700">Year</label>
              <div className="relative">
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(val) => setSelectedYear(Number(val))}
                >
                  <SelectTrigger className="w-[120px] bg-white text-gray-900 border-gray-300">
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
        <div className="bg-white border border-gray-200 rounded-lg p-6">
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </Button>
            <h2 className="text-xl font-semibold text-gray-900">
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
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
                    ? 'hover:bg-gray-50 cursor-pointer hover:border-purple-300'
                    : ''
                    }`}
                >
                  <div className="text-sm font-medium text-gray-900 mb-1">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {UI_CONSTANTS.TITLES.RESULTS_SUMMARY} {selectedMachine.name}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{UI_CONSTANTS.SUMMARY.TOTAL_CHECKS}</span>
                <span className="ml-2 font-medium">
                  {monthlyResults.checks.filter(c => c.beamCheckStatus || c.geometryCheckStatus).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">{UI_CONSTANTS.SUMMARY.GEOMETRY_CHECKS}</span>
                <span className="ml-2 font-medium">
                  {monthlyResults.checks.filter((c: DayCheckStatus) => c.geometryCheckStatus).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">{UI_CONSTANTS.SUMMARY.BEAM_CHECKS}</span>
                <span className="ml-2 font-medium">
                  {monthlyResults.checks.filter((c: DayCheckStatus) => c.beamCheckStatus).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
