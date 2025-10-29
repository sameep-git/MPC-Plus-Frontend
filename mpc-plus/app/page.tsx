'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MdOpenInNew } from 'react-icons/md';
import { fetchMachines, fetchUpdates, fetchUser, handleApiError, type Machine, type Update, type User } from '../lib/api';
import { Navbar, Button } from '../components/ui';
import { UI_CONSTANTS, NAVIGATION } from '../constants';

export default function Home() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const handleMachineSelect = (machineId: string, e: React.MouseEvent) => {
    e.preventDefault();
    // Store the selected machine ID in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedMachineId', machineId);
      // Navigate to the results page
      window.location.href = NAVIGATION.ROUTES.MPC_RESULT;
    }
  };
  
  const handleViewAllResults = (e: React.MouseEvent) => {
    e.preventDefault();
    // If there are machines, select the first one by default
    if (machines.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedMachineId', machines[0].id);
      }
    }
    // Navigate to the results page
    window.location.href = NAVIGATION.ROUTES.MPC_RESULT;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [machinesData, updatesData, userData] = await Promise.all([
          fetchMachines(),
          fetchUpdates(),
          fetchUser()
        ]);
        setMachines(machinesData);
        setUpdates(updatesData);
        setUser(userData);
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Navbar user={user} />

      <main className="p-6">
        {/* Welcome Section */}
        <section className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {UI_CONSTANTS.TITLES.WELCOME}, {user?.name || UI_CONSTANTS.STATUS.USER}!
          </h1>
          <p className="text-gray-600 mb-6 max-w-2xl">
            {UI_CONSTANTS.PLACEHOLDERS.WELCOME_DESCRIPTION}
          </p>
          <Button 
            size="lg" 
            onClick={handleViewAllResults}
          >
            {UI_CONSTANTS.BUTTONS.VIEW_ALL_RESULTS}
          </Button>
        </section>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{UI_CONSTANTS.ERRORS.LOADING_DATA} {error}</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="text"
              className="mt-2 text-red-600 hover:text-red-800"
            >
              {UI_CONSTANTS.BUTTONS.RETRY}
            </Button>
          </div>
        )}

        {/* Today's Machine Updates */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{UI_CONSTANTS.TITLES.TODAYS_UPDATES}</h2>
          <div className="flex flex-wrap gap-4">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-gray-200 animate-pulse h-12 w-48 rounded-lg"></div>
              ))
            ) : machines.length === 0 ? (
              <div className="text-gray-500 italic">{UI_CONSTANTS.ERRORS.NO_MACHINES}</div>
            ) : (
              machines.map((machine) => {
                const handleMachineClick = (e: React.MouseEvent) => {
                  handleMachineSelect(machine.id, e);
                };
                
                return (
                  <Link
                    key={machine.id}
                    href={NAVIGATION.ROUTES.MPC_RESULT}
                    onClick={handleMachineClick}
                    className="bg-purple-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-800 transition-colors min-w-[200px] relative inline-block text-center"
                    title={`Status: ${machine.status}${machine.location ? ` | Location: ${machine.location}` : ''}`}
                  >
                    {machine.name}
                    {machine.status === 'maintenance' && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"></span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Latest Updates */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{UI_CONSTANTS.TITLES.LATEST_UPDATES}</h2>
            <p className="text-gray-600 mb-6">
              {UI_CONSTANTS.PLACEHOLDERS.UPDATES_DESCRIPTION}
            </p>
            <Button size="lg">
              {UI_CONSTANTS.BUTTONS.VIEW_ALL_UPDATES}
            </Button>
          </div>

          <div className="space-y-4">
            {loading ? (
              // Loading skeleton for updates
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-gray-100 animate-pulse h-20 rounded-lg"></div>
              ))
            ) : (
              updates.map((update) => (
                <div key={update.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{update.title}</h3>
                      <p className="text-sm text-gray-600">{update.description}</p>
                    </div>
                    <MdOpenInNew className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
