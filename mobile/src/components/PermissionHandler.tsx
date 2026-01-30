import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

export const PermissionHandler: React.FC = () => {
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          // Lista de permissões que queremos solicitar
          // POST_NOTIFICATIONS é necessário para Android 13+
          // READ_PHONE_STATE é o que geralmente aparece como "Permissão de Telefone"
          // ACCESS_FINE_LOCATION muitas vezes é necessário para ler informações de Wi-Fi
          
          const permissionsToRequest = [];
          
          // Adiciona permissões baseadas na versão do Android ou necessidade
          if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
            // Usa type assertion ou verificação segura se a propriedade não existir nos tipos
            const postNotification = (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS || 'android.permission.POST_NOTIFICATIONS';
            permissionsToRequest.push(postNotification);
          }
          
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

          const result = await PermissionsAndroid.requestMultiple(permissionsToRequest);

          console.log('Permissões solicitadas:', result);
          
          // Opcional: Verificar se algo crítico foi negado e avisar o usuário
          if (result['android.permission.READ_PHONE_STATE'] === 'denied') {
             console.log('Permissão de telefone negada');
          }

        } catch (err) {
          console.warn('Erro ao solicitar permissões:', err);
        }
      }
    };

    requestPermissions();
  }, []);

  return null; // Esse componente não renderiza nada visualmente
};
