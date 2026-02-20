import os
import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    if not firebase_admin._apps:
        cred_path = os.environ.get('FIREBASE_CREDENTIALS')
        
        if not cred_path:
            from django.conf import settings
            base_dir = getattr(settings, 'BASE_DIR', os.path.dirname(os.path.dirname(__file__)))
            
            possible_paths = [
                'firebase_credentials.json',
                'firebase-credentials.json',
                os.path.join(base_dir, 'firebase_credentials.json'),
                os.path.join(base_dir, 'firebase-credentials.json'),
                'service_account_key.json',
                os.path.join(base_dir, 'service_account_key.json'),
                '/app/firebase_credentials.json',
                '/app/firebase-credentials.json',
                '/app/service_account_key.json',
                r'e:\app\service_account_key.json'
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    cred_path = p
                    break

        if cred_path and os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print(f"[OK] Firebase Admin SDK inicializado com sucesso usando: {cred_path}")
            except Exception as e:
                print(f"[ERRO] Erro ao inicializar Firebase Admin SDK: {e}")
        else:
            if os.environ.get('GITHUB_ACTIONS') != 'true':
                print(f"[AVISO] Arquivo de credenciais do Firebase nao encontrado. Notificacoes Push podem nao funcionar.")
