import { useState } from 'react';
import { Wifi, Bell, MapPin, Save, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { ToastProvider, useToast } from '@/app/components/ui/Toast';

interface Settings {
  apiBaseUrl: string;
  wsUrl: string;
  autoRefreshInterval: number;
  enableNotifications: boolean;
  enableSound: boolean;
  mapDefaultZoom: number;
  theme: 'light' | 'dark' | 'system';
}

const defaultSettings: Settings = {
  apiBaseUrl: 'http://localhost:8080',
  wsUrl: 'ws://localhost:8080/ws/alerts',
  autoRefreshInterval: 10000,
  enableNotifications: true,
  enableSound: false,
  mapDefaultZoom: 13,
  theme: 'system',
};

export function Settings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('geofencing-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();

  const handleChange = (key: keyof Settings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('geofencing-settings', JSON.stringify(settings));
      success('Settings saved successfully');
    } catch {
      error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('geofencing-settings');
    success('Settings reset to defaults');
  };

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  const intervalOptions = [
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
  ];

  const zoomOptions = [
    { value: 10, label: '10 (City)' },
    { value: 13, label: '13 (Neighborhood)' },
    { value: 15, label: '15 (Street)' },
    { value: 17, label: '17 (Building)' },
  ];

  return (
    <ToastProvider>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure application preferences</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary-600" />
              Connection
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="API Base URL"
                value={settings.apiBaseUrl}
                onChange={(e) => handleChange('apiBaseUrl', e.target.value)}
                placeholder="http://localhost:8080"
              />
              <Input
                label="WebSocket URL"
                value={settings.wsUrl}
                onChange={(e) => handleChange('wsUrl', e.target.value)}
                placeholder="ws://localhost:8080/ws/alerts"
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-600" />
              Notifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Enable Notifications</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive browser notifications for alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Notification Sound</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Play sound when new alert arrives</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableSound}
                    onChange={(e) => handleChange('enableSound', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary-600" />
              Map & Display
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Theme"
                value={settings.theme}
                onChange={(v) => handleChange('theme', v as 'light' | 'dark' | 'system')}
                options={themeOptions}
              />
              <Select
                label="Auto Refresh Interval"
                value={settings.autoRefreshInterval.toString()}
                onChange={(v) => handleChange('autoRefreshInterval', parseInt(v))}
                options={intervalOptions.map(o => ({ value: o.value.toString(), label: o.label }))}
              />
              <Select
                label="Default Map Zoom"
                value={settings.mapDefaultZoom.toString()}
                onChange={(v) => handleChange('mapDefaultZoom', parseInt(v))}
                options={zoomOptions.map(o => ({ value: o.value.toString(), label: o.label }))}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Save className="h-5 w-5 text-primary-600" />
              Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset to Defaults
              </Button>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              Info
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>GeoFencing Dashboard v1.0.0</strong></p>
              <p>React + TypeScript + Vite + Tailwind CSS</p>
              <p>Backend: Go + PostgreSQL + PostGIS</p>
              <p>Real-time: WebSocket</p>
              <p>Maps: Leaflet + React-Leaflet</p>
            </div>
          </section>
        </div>
      </div>
    </ToastProvider>
  );
}