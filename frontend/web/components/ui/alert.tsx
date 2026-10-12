import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import React from 'react';
import clsx from 'clsx';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  className?: string;
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

const colors = {
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  error: 'bg-red-100 text-red-800 border-red-300',
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  className,
}) => {
  const Icon = icons[variant];
  return (
    <div
      className={clsx(
        'border rounded-lg p-4 flex items-start space-x-3',
        colors[variant],
        className
      )}
    >
      <Icon className="w-5 h-5 mt-1 flex-shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};
