import os
import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    if not firebase_admin._apps:
        # Caminho padrão ou via variável de ambiente
        cred_path = os.environ.get('FIREBASE_CREDENTIALS', r'e:\app\service_account_key.json')
        
        if os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print(f"✅ Firebase Admin SDK inicializado com sucesso usando: {cred_path}")
            except Exception as e:
                print(f"❌ Erro ao inicializar Firebase Admin SDK: {e}")
        else:
            print(f"⚠️ Arquivo de credenciais do Firebase não encontrado em: {cred_path}")
