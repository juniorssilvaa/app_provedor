import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from core.models import Provider, ProviderToken
import json
import re

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def proxy_sgp_request(request, endpoint):
    """
    Proxy genérico para requisições ao SGP.
    Endpoint: parte final da URL capturada (ex: api/ura/titulos/)
    """
    try:
        # Copia os dados do request
        data = request.data.copy()
        
        # Identificar o provedor
        # Prioridade 1: provider_token (apiToken do mobile)
        # Prioridade 2: provider_id (ID numérico legado)
        provider_token = data.get('provider_token') or request.query_params.get('provider_token')
        provider_id = data.get('provider_id') or request.query_params.get('provider_id')
        
        provider = None
        if provider_token:
            token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
            if token_obj:
                provider = token_obj.provider
            else:
                # Fallback legado se o token for o sgp_token direto
                provider = Provider.objects.filter(sgp_token=provider_token).first()
        
        if not provider and provider_id:
            try:
                provider = Provider.objects.get(id=provider_id)
            except Provider.DoesNotExist:
                pass

        if not provider:
            return Response({'error': 'Provedor não identificado. Envie provider_token.'}, status=403)
            
        if not provider.sgp_token or not provider.sgp_url:
            return Response({'error': f'Provedor {provider.name} sem credenciais SGP configuradas no painel.'}, status=400)
            
        # Injeta o token e app corretos do provedor
        # O request original já deve ter os campos 'token' e 'app', mas vamos sobrescrever
        # para garantir que usamos o do backend (segurança).
        
        # Para simplificar, vamos construir o payload que será enviado.
        payload = {}
        
        # Se for JSON
        if isinstance(data, dict):
            payload = data
        else:
            # Se for QueryDict, converte para dict
            payload = data.dict()
            
        # SOBRESCREVE com dados do banco de dados para segurança
        payload['token'] = provider.sgp_token
        # Usa o Nome do App dinâmico do provedor, fallback para 'webchat'
        payload['app'] = provider.sgp_app_name or 'webchat'

        # Remover campos de controle interno
        if 'provider_id' in payload:
            del payload['provider_id']

        # Construir URL final
        # Garante que não haja barras duplicadas na URL final do SGP
        sgp_base_url = provider.sgp_url or SGP_BASE_URL
        clean_endpoint = endpoint.lstrip('/')
        target_url = f"{sgp_base_url.rstrip('/')}/{clean_endpoint}"
        
        print(f"--- PROXY SGP DEBUG ---")
        print(f"Endpoint Original: {endpoint}")
        print(f"URL Alvo SGP: {target_url}")
        print(f"Provedor: {provider.name} (ID: {provider.id})")
        print(f"Token Utilizado: {provider.sgp_token[:10]}...")
        # print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"-----------------------")

        # Fazer a requisição ao SGP
        # Verifica se deve enviar como JSON ou Form Data
        # A regra simples: se o request original era JSON, enviamos JSON.
        
        response = None
        content_type = request.content_type or ''
        
        if 'application/json' in content_type:
            response = requests.post(target_url, json=payload, timeout=30)
        else:
            # Multipart ou Form Urlencoded
            # requests.post(data=dict) envia application/x-www-form-urlencoded
            # Se precisarmos de multipart, teríamos que reconstruir.
            # O SGP aceita form-urlencoded para a maioria dos endpoints que não são upload.
            response = requests.post(target_url, data=payload, timeout=30)
            
        # Retorna a resposta do SGP para o App
        try:
            resp_json = response.json()
            
            # Normaliza a chave do PIX para 'codigopix' (minúsculo) em diferentes estruturas
            if isinstance(resp_json, dict):
                # Cenário 1: lista de 'titulos'
                if 'titulos' in resp_json and resp_json['titulos']:
                    for item in resp_json['titulos']:
                        if 'codigoPix' in item and 'codigopix' not in item:
                            item['codigopix'] = item['codigoPix']
                    print("DEBUG: Chave PIX normalizada na lista 'titulos'.")

                # Cenário 2: lista de 'links'
                if 'links' in resp_json and resp_json['links']:
                    for item in resp_json['links']:
                        if 'codigoPix' in item and 'codigopix' not in item:
                            item['codigopix'] = item['codigoPix']
                    print("DEBUG: Chave PIX normalizada na lista 'links'.")

            return Response(resp_json, status=response.status_code)
        except:
            # Se não for JSON (erro ou html), retorna o texto
            return Response(response.content, status=response.status_code)

    except Exception as e:
        print(f"Erro no Proxy SGP: {e}")
        return Response({'error': str(e)}, status=500)
