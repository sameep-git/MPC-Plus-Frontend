'use client';

import { MdKeyboardArrowDown, MdPerson, MdSettings, MdNotifications, MdHelp, MdLogout } from 'react-icons/md';
import { UI_CONSTANTS, USER_MENU_ACTIONS } from '../../constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui';

interface UserMenuProps {
  user: { id: string; name?: string; role?: string } | null;
  isOpen?: boolean; // Kept for compatibility but not strictly needed for Radix
  onToggle?: () => void; // Kept for compatibility
  onClose?: () => void; // Kept for compatibility
}

export default function UserMenu({ user }: UserMenuProps) {
  const handleMenuAction = (action: string) => {
    console.log(`User action: ${action}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 data-[state=open]:bg-gray-50 outline-none">
        {/* Avatar */}
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
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
          className="w-4 h-4 text-gray-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 bg-white">
        {/* User Info Header as Label */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center space-x-3 p-1">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
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
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleMenuAction(USER_MENU_ACTIONS.PROFILE)} className="cursor-pointer">
          <MdPerson className="w-4 h-4 mr-2" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleMenuAction(USER_MENU_ACTIONS.SETTINGS)} className="cursor-pointer">
          <MdSettings className="w-4 h-4 mr-2" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleMenuAction(USER_MENU_ACTIONS.NOTIFICATIONS)} className="cursor-pointer">
          <MdNotifications className="w-4 h-4 mr-2" />
          <span>Notifications</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleMenuAction(USER_MENU_ACTIONS.HELP)} className="cursor-pointer">
          <MdHelp className="w-4 h-4 mr-2" />
          <span>Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleMenuAction(USER_MENU_ACTIONS.LOGOUT)}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <MdLogout className="w-4 h-4 mr-2" />
          <span>{UI_CONSTANTS.BUTTONS.SIGN_OUT}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

