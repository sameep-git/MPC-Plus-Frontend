'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MdKeyboardArrowDown, MdPerson, MdSettings, MdPeople, MdHelp, MdLogout } from 'react-icons/md';
import { type User } from '../../lib/api';
import { UI_CONSTANTS, USER_MENU_ACTIONS, NAVIGATION } from '../../constants';

interface UserMenuProps {
  user: User | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export default function UserMenu({ user, isOpen, onToggle, onClose }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleMenuAction = (action: string) => {
    if (action === USER_MENU_ACTIONS.USER_MANAGEMENT) {
      router.push(NAVIGATION.ROUTES.USERS);
    } else if (action === USER_MENU_ACTIONS.SETTINGS) {
      router.push(NAVIGATION.ROUTES.SETTINGS);
    }
    console.log(`User action: ${action}`);
    onClose();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={onToggle}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user ? user.name.charAt(0).toUpperCase() : 'U'}
          </span>
        </div>
        
        {/* User Info */}
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-900">
            {user?.name || 'Loading...'}
          </span>
          <span className="text-xs text-gray-500 capitalize">
            {user?.role || 'User'}
          </span>
        </div>
        
        {/* Dropdown Arrow */}
        <MdKeyboardArrowDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'Loading...'}
                </p>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {user?.role || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.role || 'User'} Access
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => handleMenuAction(USER_MENU_ACTIONS.PROFILE)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
            >
              <MdPerson className="w-4 h-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => handleMenuAction(USER_MENU_ACTIONS.SETTINGS)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
            >
              <MdSettings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => handleMenuAction(USER_MENU_ACTIONS.USER_MANAGEMENT)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
            >
              <MdPeople className="w-4 h-4" />
              <span>User Management</span>
            </button>

            <div className="border-t border-gray-100 my-2"></div>

            <button
              onClick={() => handleMenuAction(USER_MENU_ACTIONS.HELP)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
            >
              <MdHelp className="w-4 h-4" />
              <span>Help & Support</span>
            </button>

            <div className="border-t border-gray-100 my-2"></div>

            <button
              onClick={() => handleMenuAction(USER_MENU_ACTIONS.LOGOUT)}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
            >
              <MdLogout className="w-4 h-4" />
              <span>{UI_CONSTANTS.BUTTONS.SIGN_OUT}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
