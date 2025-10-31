'use client';

import { useState } from 'react';
import Link from 'next/link';
import UserMenu from './UserMenu';
import { type User } from '../../lib/api';
import { NAVIGATION } from '../../constants';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
      {/* Logo/Brand */}
      <Link href={NAVIGATION.ROUTES.HOME} className="text-2xl font-bold text-purple-900 font-fraunces hover:text-purple-700 transition-colors">
        MPC Plus
      </Link>
      
      {/* Navigation Links */}
      <nav className="hidden md:flex items-center space-x-8">
        <Link href={NAVIGATION.ROUTES.HOME} className="text-gray-600 hover:text-gray-900 transition-colors">
          Dashboard
        </Link>
        <Link href={NAVIGATION.ROUTES.MPC_RESULT} className="text-gray-600 hover:text-gray-900 transition-colors">
          Machines
        </Link>
        <Link href={NAVIGATION.ROUTES.RESULT_DETAIL} className="text-gray-600 hover:text-gray-900 transition-colors">
          Reports
        </Link>
        <a href={NAVIGATION.LINKS.SETTINGS} className="text-gray-600 hover:text-gray-900 transition-colors">
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
