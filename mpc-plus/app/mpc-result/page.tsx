'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MdKeyboardArrowDown, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { fetchMachines, fetchUser, handleApiError, type Machine, type User } from '../../lib/api';
import { Navbar } from '../../components/ui';
import { UI_CONSTANTS, CALENDAR_CONSTANTS, API_CONSTANTS } from '../../constants';

// Mock MPC result data for demonstration
interface MPCResult {
  id: string;
  date: string;
  machineId: string;
  checks: {
    geometry: boolean;
    beam: boolean;
  };
  status: 'passed' | 'failed' | 'warning';
}

// Mock function to generate MPC results
const generateMockResults = (machineId: string, startDate: Date, endDate: Date): MPCResult[] => {
  const results: MPCResult[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Randomly generate results for demonstration
    const hasGeometry = Math.random() > API_CONSTANTS.PROBABILITIES.GEOMETRY_CHECK;
    const hasBeam = Math.random() > API_CONSTANTS.PROBABILITIES.BEAM_CHECK;
    
    if (hasGeometry || hasBeam) {
      results.push({
        id: `${machineId}-${currentDate.toISOString().split('T')[0]}`,
        date: currentDate.toISOString().split('T')[0],
        machineId,
        checks: {
          geometry: hasGeometry,
          beam: hasBeam,
        },
        status: Math.random() > API_CONSTANTS.PROBABILITIES.WARNING_STATUS ? 'passed' : 'warning',
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return results;
};

export default function MPCResultPage() {
  const searchParams = useSearchParams();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [mpcResults, setMpcResults] = useState<MPCResult[]>([]);
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
        
        // Set machine from URL parameter or default to first machine
        const machineId = searchParams.get('machine');
        if (machineId) {
          const machine = machinesData.find(m => m.id === machineId);
          if (machine) {
            setSelectedMachine(machine);
          } else if (machinesData.length > 0) {
            setSelectedMachine(machinesData[0]);
          }
        } else if (machinesData.length > 0) {
          setSelectedMachine(machinesData[0]);
        }
        
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
        setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
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
    if (selectedMachine && startDate && endDate) {
      const results = generateMockResults(
        selectedMachine.id,
        new Date(startDate),
        new Date(endDate)
      );
      setMpcResults(results);
    }
  }, [selectedMachine, startDate, endDate]);

  const handleGenerateReport = () => {
    console.log('Generating report for:', {
      machine: selectedMachine?.name,
      startDate,
      endDate,
      results: mpcResults.length
    });
    // TODO: Implement actual report generation
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    
    // Update date range to match the new month
    const firstDay = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1);
    const lastDay = new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

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
    if (!selectedMachine) return null;
    
    const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    return mpcResults.find(result => result.date === dateStr);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

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
          <button
            onClick={handleGenerateReport}
            className="bg-purple-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-800 transition-colors"
          >
            {UI_CONSTANTS.BUTTONS.GENERATE_REPORT}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{UI_CONSTANTS.ERRORS.LOADING_DATA} {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-red-600 underline hover:text-red-800"
            >
              {UI_CONSTANTS.BUTTONS.RETRY}
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="mb-8 space-y-6">
          {/* Machine Selection */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">{UI_CONSTANTS.LABELS.MACHINE}</label>
            <div className="relative">
              <select
                value={selectedMachine?.id || ''}
                onChange={(e) => {
                  const machine = machines.find(m => m.id === e.target.value);
                  setSelectedMachine(machine || null);
                }}
                className="bg-purple-900 text-white px-4 py-2 rounded-lg font-medium appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </select>
              <MdKeyboardArrowDown 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" 
              />
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">{UI_CONSTANTS.LABELS.START_DATE}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">{UI_CONSTANTS.LABELS.END_DATE}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MdChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900">
              {formatMonthYear(currentMonth)}
            </h2>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MdChevronRight className="w-5 h-5 text-gray-600" />
            </button>
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
            {getDaysInMonth(currentMonth).map((dayObj, index) => {
              if (dayObj === null) {
                return <div key={`empty-${index}`} className="p-2"></div>;
              }
              
              const results = getResultsForDate(dayObj);
              const uniqueKey = `${dayObj.year}-${dayObj.month}-${dayObj.day}`;
              
              return (
                <div
                  key={uniqueKey}
                  className={`p-2 min-h-[${CALENDAR_CONSTANTS.MIN_CALENDAR_HEIGHT}px] border border-gray-100 hover:bg-gray-50 transition-colors`}
                >
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {dayObj.day}
                  </div>
                  
                  {results && (
                    <div className="space-y-1">
                      {results.checks.geometry && (
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {UI_CONSTANTS.CHECKS.GEOMETRY_CHECK}
                        </div>
                      )}
                      {results.checks.beam && (
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
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
        {selectedMachine && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {UI_CONSTANTS.TITLES.RESULTS_SUMMARY} {selectedMachine.name}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{UI_CONSTANTS.SUMMARY.TOTAL_CHECKS}</span>
                <span className="ml-2 font-medium">{mpcResults.length}</span>
              </div>
              <div>
                <span className="text-gray-600">{UI_CONSTANTS.SUMMARY.GEOMETRY_CHECKS}</span>
                <span className="ml-2 font-medium">
                  {mpcResults.filter(r => r.checks.geometry).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">{UI_CONSTANTS.SUMMARY.BEAM_CHECKS}</span>
                <span className="ml-2 font-medium">
                  {mpcResults.filter(r => r.checks.beam).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
