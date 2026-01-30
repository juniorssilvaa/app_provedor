import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { config } from '../config';

interface AppConfigData {
  provider_name: string;
  primary_color: string;
  logo_url: string | null;
  active_shortcuts: string[];
  active_tools: string[];
  social_links: any[];
  update_warning_active: boolean;
  is_active: boolean;
}

interface ConfigContextData {
  appConfig: AppConfigData | null;
  isLoading: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextData>({} as ConfigContextData);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appConfig, setAppConfig] = useState<AppConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      console.log(`Fetching config from: ${config.apiBaseUrl}public/config/?provider_token=${config.apiToken}`);
      const response = await fetch(`${config.apiBaseUrl}public/config/?provider_token=${config.apiToken}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Config loaded:', data);
        setAppConfig(data);
      } else {
        console.error('Failed to fetch app config', response.status);
      }
    } catch (error) {
      console.error('Error fetching app config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ appConfig, isLoading, refreshConfig: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
