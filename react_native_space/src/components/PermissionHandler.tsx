import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, AppState } from 'react-native';

export const PermissionHandler: React.FC = () => {
  const requestPermissions = React.useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        // Verifica permissões existentes primeiro
        const permissionsToRequest = [];
        const permissionsToCheck = [];
        
        // Adiciona permissões baseadas na versão do Android ou necessidade
        if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
          const postNotification = (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS || 'android.permission.POST_NOTIFICATIONS';
          permissionsToCheck.push(postNotification);
        }
        
        permissionsToCheck.push(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
        permissionsToCheck.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

        // Verifica quais permissões já foram concedidas
        for (const permission of permissionsToCheck) {
          const hasPermission = await PermissionsAndroid.check(permission);
          if (!hasPermission) {
            permissionsToRequest.push(permission);
          }
        }

        // Só solicita se houver permissões pendentes
        if (permissionsToRequest.length > 0) {
          const result = await PermissionsAndroid.requestMultiple(permissionsToRequest);
          
          // Verificar se permissões críticas foram negadas
          if (result['android.permission.READ_PHONE_STATE'] === 'denied') {
            // Permissão negada, mas não bloqueia o app
          }
          
          // Permissão de localização é OBRIGATÓRIA para WiFi
          if (result['android.permission.ACCESS_FINE_LOCATION'] === 'denied') {
            // Permissão negada, mas não bloqueia o app
          }
        }

      } catch (err) {
        // Erro ao solicitar permissões, mas não bloqueia o app
      }
    }
  }, []);

  useEffect(() => {
    // Solicita permissões na primeira vez
    requestPermissions();
    
    // Listener para quando o app voltar ao foco (após conceder permissão nas configurações)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Verifica novamente quando o app volta ao foco
        requestPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestPermissions]);

  return null; // Esse componente não renderiza nada visualmente
};
