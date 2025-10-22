'use client';

import { useState, useEffect } from 'react';
import { fetchMachines, fetchUpdates, fetchUser, handleApiError, type Machine, type Update, type User } from '../lib/api';
import { Navbar } from '../components/ui';

export default function Home() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            Welcome, {user?.name || 'User'}!
          </h1>
          <p className="text-gray-600 mb-6 max-w-2xl">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla tortor.
          </p>
          <button className="bg-purple-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-800 transition-colors">
            View All Results
          </button>
        </section>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error loading data: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-red-600 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Today's Machine Updates */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Today's Machine Updates</h2>
          <div className="flex flex-wrap gap-4">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-gray-200 animate-pulse h-12 w-48 rounded-lg"></div>
              ))
            ) : machines.length === 0 ? (
              <div className="text-gray-500 italic">No machines available</div>
            ) : (
              machines.map((machine) => (
                <button
                  key={machine.id}
                  className="bg-purple-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-800 transition-colors min-w-[200px] relative"
                  title={`Status: ${machine.status}${machine.location ? ` | Location: ${machine.location}` : ''}`}
                >
                  {machine.name}
                  {machine.status === 'maintenance' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"></span>
                  )}
                </button>
              ))
            )}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Latest Updates */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Updates</h2>
            <p className="text-gray-600 mb-6">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean nunc elit, iaculis in turpis at, porta fringilla quam.
            </p>
            <button className="bg-purple-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-800 transition-colors">
              View All Updates
            </button>
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
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
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
