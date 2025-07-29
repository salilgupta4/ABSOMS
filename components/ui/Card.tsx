
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  bodyClassName?: string;
}

const Card: React.FC<CardProps> = ({ children, title, actions, className = '', icon, bodyClassName = 'p-6' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          {title && 
            <div className="flex items-center space-x-3">
              {icon && <span className="text-primary">{icon}</span>}
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            </div>
          }
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
};

export default Card;