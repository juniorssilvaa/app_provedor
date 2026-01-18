import os
import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    if not firebase_admin._apps:
        # Busca o caminho via variável de ambiente, senão tenta caminhos relativos comuns
        cred_path = os.environ.get('FIREBASE_CREDENTIALS')
        
        # Se não houver variável, tenta caminhos locais possíveis
        if not cred_path:
            possible_paths = [
                'service_account_key.json',
                os.path.join(os.path.dirname(os.path.dirname(__file__)), 'service_account_key.json'),
                r'e:\app\service_account_key.json' # Mantido para compatibilidade com o ambiente atual do usuário
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    cred_path = p
                    break

        if cred_path and os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print(f"✅ Firebase Admin SDK inicializado com sucesso usando: {cred_path}")
            except Exception as e:
                print(f"❌ Erro ao inicializar Firebase Admin SDK: {e}")
        else:
            if os.environ.get('GITHUB_ACTIONS') != 'true':
                print(f"⚠️ Arquivo de credenciais do Firebase não encontrado. Notificações Push podem não funcionar.")
