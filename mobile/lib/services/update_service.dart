import 'package:flutter/foundation.dart';
import 'package:in_app_update/in_app_update.dart';

class UpdateService {
  /// Verifica se há uma atualização disponível e solicita a atualização imediata.
  /// Este serviço funciona apenas em dispositivos Android com Google Play Services.
  static Future<void> checkForUpdate() async {
    // In-App Update funciona apenas no Android
    if (defaultTargetPlatform != TargetPlatform.android) {
      return;
    }

    try {
      debugPrint('UpdateService: Verificando atualizações na Play Store...');
      
      final info = await InAppUpdate.checkForUpdate();
      
      if (info.updateAvailability == UpdateAvailability.updateAvailable) {
        debugPrint('UpdateService: Atualização encontrada! Iniciando update imediato...');
        
        // Realiza o update imediato (bloqueia o app até terminar)
        // O app irá reiniciar automaticamente após a conclusão.
        await InAppUpdate.performImmediateUpdate();
      } else {
        debugPrint('UpdateService: Nenhuma atualização disponível no momento.');
      }
    } catch (e) {
      debugPrint('UpdateService Error: Erro ao verificar atualização: $e');
      // Não lançamos erro aqui para não quebrar a inicialização do app
    }
  }
}
