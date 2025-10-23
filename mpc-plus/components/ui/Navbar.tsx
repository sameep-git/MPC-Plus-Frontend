'use client';

import { useState } from 'react';
import UserMenu from './UserMenu';
import { type User } from '../../lib/api';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
      {/* Logo/Brand */}
      <div className="text-2xl font-bold text-purple-900 font-fraunces">
        MPC Plus
      </div>

      {/* Navigation Items - For larger projects, this would be more extensive */}
      <nav className="hidden md:flex items-center space-x-8">
        <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
          Dashboard
        </a>
        <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
          Machines
        </a>
        <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
          Reports
        </a>
        <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
          Settings
        </a>
      </nav>

      {/* User Menu */}
      <UserMenu 
        user={user} 
        isOpen={isUserMenuOpen}
        onToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
        onClose={() => setIsUserMenuOpen(false)}
      />
    </header>
  );
}
