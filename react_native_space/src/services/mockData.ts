import { Plan } from '../types';

export const mockPlans: Plan[] = [
  {
    id: '1',
    name: 'FIBRA 100 MEGA START',
    type: 'FIBRA',
    downloadSpeed: 100,
    uploadSpeed: 50,
    price: 89.90,
    description: 'Plano ideal para navegar e assistir vídeos',
  },
  {
    id: '2',
    name: 'FIBRA 200 MEGA LIGHT',
    type: 'FIBRA',
    downloadSpeed: 200,
    uploadSpeed: 100,
    price: 109.90,
    description: 'Perfeito para trabalhar em casa',
  },
  {
    id: '3',
    name: 'FIBRA 400 MEGA SMART',
    type: 'FIBRA',
    downloadSpeed: 400,
    uploadSpeed: 150,
    price: 139.90,
    description: 'Para quem precisa de velocidade extra',
  },
  {
    id: '4',
    name: 'FIBRA 600 MEGA FAMILY',
    type: 'FIBRA',
    downloadSpeed: 600,
    uploadSpeed: 300,
    price: 179.90,
    description: 'O mais completo para toda a família',
  },
];

export const mockWifiInfo = {
  ssid: 'NANET-WiFi-5G',
  ipAddress: '177.22.187.8',
  connected: true,
};