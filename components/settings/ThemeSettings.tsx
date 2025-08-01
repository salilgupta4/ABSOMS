

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Palette, Type, Layout, Zap, RotateCcw, Download, Upload, Monitor } from 'lucide-react';

const ColorPicker: React.FC<{ label: string; description?: string; color: string; onChange: (color: string) => void; disabled?: boolean }> = ({ label, description, color, onChange, disabled }) => (
  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50">
    <div className="flex-1">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
    </div>
    <div className="flex items-center space-x-3">
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-10 rounded-md border border-slate-300 dark:border-slate-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
      />
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 min-w-[4rem]">{color}</span>
    </div>
  </div>
);

const PresetCard: React.FC<{ name: string; description: string; colors: string[]; isActive: boolean; onClick: () => void; disabled?: boolean }> = ({ name, description, colors, isActive, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
      isActive 
        ? 'border-primary bg-primary/10 dark:bg-primary/20' 
        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
    }`}
  >
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-medium text-slate-900 dark:text-slate-100">{name}</h4>
      <div className="flex space-x-1">
        {colors.map((color, i) => (
          <div key={i} className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
    <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
  </button>
);

const ThemeSettings: React.FC = () => {
  const { config, updateColors, updateTypography, updateLayout, updateEffects, resetToDefault, applyPreset, saveUserTheme, isLoading } = useTheme();
  const { user } = useAuth();
  const isViewer = user?.role === UserRole.Viewer;
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'layout' | 'effects' | 'presets'>('colors');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isViewer || !user?.id) return;
    
    setIsSaving(true);
    try {
      const success = await saveUserTheme();
      if (success) {
        alert('✅ Theme preferences saved to your profile!');
      } else {
        alert('❌ Failed to save theme preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      alert('❌ Error saving theme preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'theme-config.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          // Validate and apply imported config
          if (imported.colors && imported.typography && imported.layout) {
            updateColors(imported.colors);
            updateTypography(imported.typography);
            updateLayout(imported.layout);
            alert('Theme imported successfully!');
          }
        } catch (error) {
          alert('Invalid theme file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const presets = [
    // Modern themes
    { name: 'Corporate', description: 'Professional blue theme', colors: ['#1e40af', '#64748b', '#3b82f6'], category: 'modern' },
    { name: 'Modern', description: 'Purple gradient theme', colors: ['#8b5cf6', '#6366f1', '#a855f7'], category: 'modern' },
    { name: 'Nature', description: 'Green eco-friendly theme', colors: ['#10b981', '#059669', '#34d399'], category: 'modern' },
    { name: 'Sunset', description: 'Warm orange theme', colors: ['#f59e0b', '#d97706', '#fbbf24'], category: 'modern' },
    
    // Retro themes
    { name: 'Classic Mac', description: 'Vintage Macintosh System OS', colors: ['#000000', '#666666', '#cccccc'], category: 'retro' },
    { name: 'Green Terminal', description: 'Classic green phosphor CRT', colors: ['#00ff41', '#003300', '#00cc33'], category: 'retro' },
    { name: 'Amber Terminal', description: 'Warm amber terminal display', colors: ['#ffb000', '#2d1a00', '#cc8800'], category: 'retro' },
    { name: 'Orange Terminal', description: 'Vintage orange CRT monitor', colors: ['#ff8c00', '#2a1600', '#cc7000'], category: 'retro' },
    { name: 'Purple Terminal', description: 'Rare purple phosphor display', colors: ['#cc66ff', '#1a002d', '#9933cc'], category: 'retro' },
    { name: 'Grey Terminal', description: 'Monochrome white terminal', colors: ['#e0e0e0', '#2d2d2d', '#b0b0b0'], category: 'retro' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            Theme Customization
            {isLoading && <span className="text-sm text-slate-500 ml-2">(Loading...)</span>}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {user?.id 
              ? `Customize your personal theme settings, ${user.name}. Changes are automatically saved to your profile.`
              : 'Customize the system appearance. Changes are saved locally.'
            }
          </p>
        </div>
        
        {!isViewer && (
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="theme-import"
            />
            <label htmlFor="theme-import">
              <Button as="span" variant="secondary" size="sm" icon={<Upload size={16} />}>
                Import
              </Button>
            </label>
            <Button onClick={handleExport} variant="secondary" size="sm" icon={<Download size={16} />}>
              Export
            </Button>
            <Button onClick={resetToDefault} variant="secondary" size="sm" icon={<RotateCcw size={16} />}>
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex space-x-8">
          {[
            { id: 'colors', label: 'Colors', icon: <Palette size={16} /> },
            { id: 'typography', label: 'Typography', icon: <Type size={16} /> },
            { id: 'layout', label: 'Layout', icon: <Layout size={16} /> },
            { id: 'effects', label: 'Effects', icon: <Monitor size={16} /> },
            { id: 'presets', label: 'Presets', icon: <Zap size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'colors' && (
            <Card title="Color Palette" icon={<Palette size={18} />}>
              <div className="space-y-4">
                <ColorPicker
                  label="Primary Color"
                  description="Main brand color for buttons and links"
                  color={config.colors.primary}
                  onChange={(color) => updateColors({ primary: color })}
                  disabled={isViewer}
                />
                <ColorPicker
                  label="Secondary Color"
                  description="Supporting color for less prominent elements"
                  color={config.colors.secondary}
                  onChange={(color) => updateColors({ secondary: color })}
                  disabled={isViewer}
                />
                <ColorPicker
                  label="Accent Color"
                  description="Highlight color for special elements"
                  color={config.colors.accent}
                  onChange={(color) => updateColors({ accent: color })}
                  disabled={isViewer}
                />
                <div className="grid grid-cols-2 gap-4">
                  <ColorPicker
                    label="Success"
                    description="Positive actions"
                    color={config.colors.success}
                    onChange={(color) => updateColors({ success: color })}
                    disabled={isViewer}
                  />
                  <ColorPicker
                    label="Warning"
                    description="Caution messages"
                    color={config.colors.warning}
                    onChange={(color) => updateColors({ warning: color })}
                    disabled={isViewer}
                  />
                  <ColorPicker
                    label="Danger"
                    description="Error states"
                    color={config.colors.danger}
                    onChange={(color) => updateColors({ danger: color })}
                    disabled={isViewer}
                  />
                  <ColorPicker
                    label="Info"
                    description="Information alerts"
                    color={config.colors.info}
                    onChange={(color) => updateColors({ info: color })}
                    disabled={isViewer}
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'typography' && (
            <Card title="Typography Settings" icon={<Type size={18} />}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Font Family</label>
                  <select
                    value={config.typography.fontFamily}
                    onChange={(e) => updateTypography({ fontFamily: e.target.value })}
                    disabled={isViewer}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                  >
                    <option value="Inter, system-ui, sans-serif">Inter (Default)</option>
                    <option value="system-ui, sans-serif">System UI</option>
                    <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Open Sans', sans-serif">Open Sans</option>
                    <option value="'Poppins', sans-serif">Poppins</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Base Font Size</label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['xs', 'sm', 'base', 'lg', 'xl'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => updateTypography({ fontSize: size })}
                        disabled={isViewer}
                        className={`p-2 text-sm rounded border transition-colors ${
                          config.typography.fontSize === size
                            ? 'border-primary bg-primary text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-primary'
                        }`}
                      >
                        {size.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Line Height: {config.typography.lineHeight}
                  </label>
                  <input
                    type="range"
                    min="1.2"
                    max="2"
                    step="0.1"
                    value={config.typography.lineHeight}
                    onChange={(e) => updateTypography({ lineHeight: parseFloat(e.target.value) })}
                    disabled={isViewer}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Letter Spacing: {config.typography.letterSpacing}px
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="2"
                    step="0.1"
                    value={config.typography.letterSpacing}
                    onChange={(e) => updateTypography({ letterSpacing: parseFloat(e.target.value) })}
                    disabled={isViewer}
                    className="w-full"
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'layout' && (
            <Card title="Layout & Animation" icon={<Layout size={18} />}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Border Radius</label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['none', 'sm', 'md', 'lg', 'xl'] as const).map(radius => (
                      <button
                        key={radius}
                        onClick={() => updateLayout({ borderRadius: radius })}
                        disabled={isViewer}
                        className={`p-3 text-sm rounded border transition-colors ${
                          config.layout.borderRadius === radius
                            ? 'border-primary bg-primary text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-primary'
                        }`}
                        style={{ borderRadius: { none: '0', sm: '2px', md: '6px', lg: '8px', xl: '12px' }[radius] }}
                      >
                        {radius.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Spacing</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['tight', 'normal', 'relaxed'] as const).map(spacing => (
                      <button
                        key={spacing}
                        onClick={() => updateLayout({ spacing })}
                        disabled={isViewer}
                        className={`p-3 text-sm rounded border transition-colors ${
                          config.layout.spacing === spacing
                            ? 'border-primary bg-primary text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-primary'
                        }`}
                      >
                        {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Animation Speed</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['none', 'reduced', 'normal', 'enhanced'] as const).map(animation => (
                      <button
                        key={animation}
                        onClick={() => updateLayout({ animation })}
                        disabled={isViewer}
                        className={`p-3 text-sm rounded border transition-colors ${
                          config.layout.animation === animation
                            ? 'border-primary bg-primary text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-primary'
                        }`}
                      >
                        {animation.charAt(0).toUpperCase() + animation.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'effects' && (
            <Card title="CRT & Retro Effects" icon={<Monitor size={18} />}>
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Monitor className="text-amber-600 dark:text-amber-400 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200">Retro CRT Effects</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        These effects simulate vintage computer monitors and terminals. Best experienced with retro themes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.effects.scanlines}
                        onChange={(e) => updateEffects({ scanlines: e.target.checked })}
                        disabled={isViewer}
                        className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary"
                      />
                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Scanlines</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Horizontal lines across screen</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.effects.glow}
                        onChange={(e) => updateEffects({ glow: e.target.checked })}
                        disabled={isViewer}
                        className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary"
                      />
                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Text Glow</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Phosphor glow effect</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.effects.flicker}
                        onChange={(e) => updateEffects({ flicker: e.target.checked })}
                        disabled={isViewer}
                        className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary"
                      />
                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Screen Flicker</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Subtle CRT flicker animation</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.effects.curvature}
                        onChange={(e) => updateEffects({ curvature: e.target.checked })}
                        disabled={isViewer}
                        className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary"
                      />
                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">Screen Curvature</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Curved CRT screen effect</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.effects.crtMode}
                        onChange={(e) => updateEffects({ crtMode: e.target.checked })}
                        disabled={isViewer}
                        className="w-4 h-4 text-primary bg-white border-slate-300 rounded focus:ring-primary"
                      />
                      <div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">CRT Mode</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Enable CRT terminal styling</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateEffects({ scanlines: true, glow: true, flicker: true, crtMode: true, curvature: false })}
                      disabled={isViewer}
                      className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      Full CRT Experience
                    </button>
                    <button
                      onClick={() => updateEffects({ scanlines: false, glow: false, flicker: false, crtMode: false, curvature: false })}
                      disabled={isViewer}
                      className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      Disable All Effects
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'presets' && (
            <Card title="Theme Presets" icon={<Zap size={18} />}>
              <div className="space-y-6">
                {/* Modern Themes */}
                <div>
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                    <Palette size={16} className="mr-2" />
                    Modern Themes
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {presets.filter(preset => preset.category === 'modern').map(preset => (
                      <PresetCard
                        key={preset.name}
                        name={preset.name}
                        description={preset.description}
                        colors={preset.colors}
                        isActive={config.colors.primary === preset.colors[0]}
                        onClick={() => applyPreset(preset.name.toLowerCase().replace(' ', '-'))}
                        disabled={isViewer}
                      />
                    ))}
                  </div>
                </div>

                {/* Retro Themes */}
                <div>
                  <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                    <Monitor size={16} className="mr-2" />
                    Retro Terminal Themes
                  </h4>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      🖥️ These themes automatically enable CRT effects for an authentic vintage computing experience
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {presets.filter(preset => preset.category === 'retro').map(preset => (
                      <PresetCard
                        key={preset.name}
                        name={preset.name}
                        description={preset.description}
                        colors={preset.colors}
                        isActive={config.effects.themeClass === `${preset.name.toLowerCase().replace(' ', '-')}-theme`}
                        onClick={() => applyPreset(preset.name.toLowerCase().replace(' ', '-'))}
                        disabled={isViewer}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card title="Live Preview" className="sticky top-6">
            <div className="space-y-4">
              {/* Typography Preview */}
              <div>
                <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Typography</h5>
                <div className="space-y-1" style={{ 
                  fontFamily: config.typography.fontFamily,
                  fontSize: {xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem'}[config.typography.fontSize],
                  lineHeight: config.typography.lineHeight,
                  letterSpacing: `${config.typography.letterSpacing}px`
                }}>
                  <div className="font-semibold">Sample Heading</div>
                  <div className="text-sm">Font: {config.typography.fontFamily.split(',')[0]}</div>
                  <div className="text-sm">Size: {config.typography.fontSize.toUpperCase()}</div>
                </div>
              </div>

              {/* Button Preview */}
              <div>
                <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Buttons</h5>
                <div className="space-y-2">
                  <Button variant="primary" className="w-full">Primary Button</Button>
                  <Button variant="secondary" className="w-full">Secondary Button</Button>
                  <Button variant="danger" className="w-full">Danger Button</Button>
                </div>
              </div>
              
              {/* Layout Preview */}
              <div>
                <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Layout</h5>
                <div 
                  className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
                  style={{ 
                    borderRadius: {none: '0', sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem'}[config.layout.borderRadius],
                    padding: {tight: '0.5rem', normal: '1rem', relaxed: '1.5rem'}[config.layout.spacing]
                  }}
                >
                  <div className="font-medium mb-1">Sample Card</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Border radius: {config.layout.borderRadius.toUpperCase()}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Spacing: {config.layout.spacing.toUpperCase()}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Animation: {config.layout.animation.toUpperCase()}
                  </div>
                </div>
              </div>
              
              {/* Color Palette Preview */}
              <div>
                <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Colors</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.primary }} />
                    <span>Primary</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.secondary }} />
                    <span>Secondary</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.success }} />
                    <span>Success</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.warning }} />
                    <span>Warning</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.danger }} />
                    <span>Danger</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.info }} />
                    <span>Info</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      {!isViewer && user?.id && (
        <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Changes auto-save to your profile</span>
            </div>
            <p className="mt-1 text-xs">
              Your theme preferences are automatically saved and will be restored when you log in from any device.
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading}
            icon={isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <Download size={16} />}
          >
            {isSaving ? 'Saving...' : 'Save Now'}
          </Button>
        </div>
      )}

      {/* Fallback for non-logged-in users */}
      {!isViewer && !user?.id && (
        <div className="flex justify-center pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <p>🔒 Log in to save theme preferences to your profile</p>
            <p className="text-xs mt-1">Changes are currently saved locally to this browser only</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSettings;