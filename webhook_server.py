import os
import firebase_admin
from firebase_admin import credentials, messaging
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List

# --- Configuração do Firebase ---
FIREBASE_INITIALIZED = False

def initialize_firebase():
    global FIREBASE_INITIALIZED
    if not firebase_admin._apps:
        cred_path = os.environ.get('FIREBASE_CREDENTIALS')
        
        if not cred_path:
            possible_paths = [
                'firebase-credentials.json',
                'service_account_key.json',
                '/app/service_account_key.json'
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    cred_path = p
                    break

        if cred_path and os.path.exists(cred_path):
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                FIREBASE_INITIALIZED = True
                print(f"✅ Firebase Admin SDK inicializado com sucesso usando: {cred_path}")
            except Exception as e:
                print(f"❌ Erro ao inicializar Firebase Admin SDK: {e}")
        else:
            print(f"⚠️ Arquivo de credenciais do Firebase não encontrado no Webhook Server.")

initialize_firebase()
# --------------------------------

app = FastAPI(
    title="NioChat Webhook Server",
    description="Servidor para recebimento de webhooks e envio de notificações push via Firebase.",
    version="1.1.0"
)

class PushNotificationPayload(BaseModel):
    device_token: str
    title: str
    body: str
    data: Dict[str, str] = {}

class WebhookPayload(BaseModel):
    event_type: str
    data: Dict[str, Any]

# Um "banco de dados" em memória para armazenar os webhooks recebidos
received_webhooks: List[WebhookPayload] = []

def send_firebase_push(token: str, title: str, body: str, data: Dict[str, str] = None):
    """
    Envia uma notificação push para um dispositivo específico via Firebase.
    """
    if not FIREBASE_INITIALIZED:
        raise HTTPException(status_code=500, detail="Firebase não inicializado.")
        
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        token=token,
    )
    
    try:
        response = messaging.send(message)
        print(f"Notificação enviada com sucesso para o token {token}: {response}")
        return response
    except Exception as e:
        print(f"Erro ao enviar notificação para o token {token}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar notificação: {e}")

@app.post("/webhooks/send-push", summary="Receber e Enviar Push Notification")
async def receive_and_send_push(payload: PushNotificationPayload):
    """
    Endpoint para receber um pedido de notificação e enviá-lo para o Firebase.
    
    - **device_token**: Token do dispositivo do usuário.
    - **title**: Título da notificação.
    - **body**: Corpo da mensagem da notificação.
    - **data**: Dados adicionais a serem enviados com a notificação.
    """
    print(f"Recebido pedido de push para o token: {payload.device_token}")
    
    send_firebase_push(
        token=payload.device_token,
        title=payload.title,
        body=payload.body,
        data=payload.data
    )
    
    return {"status": "success", "message": "Pedido de notificação recebido e enviado para o Firebase."}


@app.post("/webhooks/generic", summary="Receber Webhook Genérico")
async def receive_generic_webhook(payload: WebhookPayload):
    """
    Endpoint genérico para receber e processar webhooks.
    
    - **event_type**: Tipo do evento (ex: 'user.created', 'payment.processed').
    - **data**: Dados do evento.
    """
    print(f"Webhook recebido: Evento='{payload.event_type}', Dados={payload.data}")
    
    # Armazena o webhook recebido
    received_webhooks.append(payload)
    
    # Exemplo de como você poderia usar este endpoint para acionar um push:
    if payload.event_type == 'send_push_notification' and 'device_token' in payload.data:
        print("Evento 'send_push_notification' detectado. Enviando push...")
        send_firebase_push(
            token=payload.data['device_token'],
            title=payload.data.get('title', 'Novo Alerta'),
            body=payload.data.get('body', 'Você tem uma nova mensagem.'),
            data=payload.data.get('extra_data', {})
        )
    
    return {"status": "success", "message": "Webhook recebido e processado."}

@app.get("/webhooks/received", summary="Listar Webhooks Recebidos")
async def list_received_webhooks():
    """
    Retorna uma lista de todos os webhooks recebidos por este servidor.
    Útil para depuração.
    """
    return {"received_webhooks": received_webhooks}

@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Servidor de Webhooks do NioChat está no ar. Acesse /docs para a documentação da API."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
