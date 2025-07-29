

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

const ColorPicker: React.FC<{ label: string; color: string; onChange: (color: string) => void; disabled?: boolean }> = ({ label, color, onChange, disabled }) => (
  <div className="flex items-center space-x-4">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 w-32">{label}</label>
    <input
      type="color"
      value={color}
      onChange={(e) => onChange(e.target.value)}
      className="p-1 h-10 w-10 block bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
    />
    <span className="text-sm text-slate-500 dark:text-slate-400">{color}</span>
  </div>
);

const ThemeSettings: React.FC = () => {
  const { primaryColor, setPrimaryColor, secondaryColor, setSecondaryColor } = useTheme();
  const { user } = useAuth();
  const isViewer = user?.role === UserRole.Viewer;

  const handleSave = () => {
      if (isViewer) return;
      // Logic to save theme to user preferences in Supabase
      console.log('Saving theme:', { primaryColor, secondaryColor });
      alert('Theme saved!');
  };

  return (
    <div>
      <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">Theme Colors</h4>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        Customize the look and feel of your ERP to match your brand. The changes will be applied instantly.
      </p>
      <div className="space-y-6">
        <ColorPicker label="Primary Color" color={primaryColor} onChange={setPrimaryColor} disabled={isViewer}/>
        <ColorPicker label="Secondary Color" color={secondaryColor} onChange={setSecondaryColor} disabled={isViewer}/>
      </div>
      <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
        <h5 className="font-semibold mb-4 dark:text-slate-200">Preview</h5>
        <div className="flex space-x-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
        </div>
      </div>
      {!isViewer && (
        <div className="mt-6 text-right">
            <Button onClick={handleSave}>Save Theme</Button>
        </div>
      )}
    </div>
  );
};

export default ThemeSettings;