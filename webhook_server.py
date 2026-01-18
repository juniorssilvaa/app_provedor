import uvicorn
import firebase_admin
from firebase_admin import credentials, messaging
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List

# --- Configuração do Firebase ---
# Substitua 'path/to/your/firebase-credentials.json' pelo caminho real do seu arquivo.
try:
    cred = credentials.Certificate("firebase-credentials.json")
    firebase_admin.initialize_app(cred)
    FIREBASE_INITIALIZED = True
    print("Firebase Admin SDK inicializado com sucesso.")
except Exception as e:
    FIREBASE_INITIALIZED = False
    print(f"ERRO: Não foi possível inicializar o Firebase Admin SDK. Verifique o caminho do arquivo de credenciais.")
    print(f"Detalhes do erro: {e}")
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
