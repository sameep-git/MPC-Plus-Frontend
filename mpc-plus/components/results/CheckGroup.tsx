import React from 'react';
import { Button } from '../../components/ui';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CheckGroupProps {
    id: string;
    title: string;
    isExpanded: boolean;
    onToggle: (id: string) => void;
    children: React.ReactNode;
    status?: string; // Optional status (e.g., 'PASS'/'FAIL') to display in header
    className?: string; // For custom styling (e.g. background color for top-level)
}

export const CheckGroup: React.FC<CheckGroupProps> = ({
    id,
    title,
    isExpanded,
    onToggle,
    children,
    status,
    className = "border border-gray-100 rounded-lg",
}) => {
    return (
        <div className={className}>
            <Button
                variant="ghost"
                aria-expanded={isExpanded}
                onClick={() => onToggle(id)}
                className="w-full flex items-center justify-between p-3 h-auto hover:bg-gray-50"
            >
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{title}</span>
                    {status && (
                        <span
                            className={`text-xs font-semibold ${status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}
                        >
                            - {status}
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {isExpanded && children}
        </div>
    );
};
