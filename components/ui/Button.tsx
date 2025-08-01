
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  icon?: React.ReactNode;
  as?: React.ElementType;
  shortcut?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', to, icon, as, shortcut, ...props }) => {
  const baseClasses = "rounded-lg font-semibold inline-flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary',
    secondary: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 focus:ring-primary',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const className = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${props.className || ''}`;
  
  // Add title attribute for keyboard shortcut tooltip
  const titleProp = shortcut ? { title: `Keyboard shortcut: ${shortcut}` } : {};
  
  const content = (
      <>
        {icon && <span className={children ? "mr-2 -ml-1" : ""}>{icon}</span>}
        {children}
        {shortcut && (
          <span className="ml-2 opacity-60 text-xs font-normal">
            {shortcut}
          </span>
        )}
      </>
  )

  if (to) {
    return (
      <Link to={to} className={className} {...titleProp}>
        {content}
      </Link>
    );
  }

  const Component = as || 'button';

  return (
    <Component className={className} {...titleProp} {...props}>
      {content}
    </Component>
  );
};

export default Button;