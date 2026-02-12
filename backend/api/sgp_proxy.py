import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.views.decorators.csrf import csrf_exempt
from core.models import Provider, ProviderToken
import json
import re

@extend_schema(tags=['SGP Proxy'])
@csrf_exempt
@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def proxy_sgp_request(request, endpoint):
    """
    Proxy genérico para requisições ao SGP.
    Endpoint: parte final da URL capturada (ex: api/ura/titulos/)
    Suporta POST (JSON/Form) e GET.
    """
    try:
        # Debug detalhado
        print(f"DEBUG PROXY: Recebida requisição {request.method} para {endpoint}")

        # Identificar o provedor
        # POST: request.data
        # GET: request.query_params
        data_source = request.data if request.method == 'POST' else request.query_params
        
        provider_token = data_source.get('provider_token')
        provider_id = data_source.get('provider_id')
        
        provider = None
        if provider_token:
            token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
            if token_obj:
                provider = token_obj.provider
            else:
                # Fallback legado
                provider = Provider.objects.filter(sgp_token=provider_token).first()
        
        if not provider and provider_id:
            try:
                provider = Provider.objects.get(id=provider_id)
            except Provider.DoesNotExist:
                pass

        if not provider:
            # Fallback para token enviado diretamente no header
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                token_val = auth_header.split(' ')[1]
                token_obj = ProviderToken.objects.filter(token=token_val, is_active=True).first()
                if token_obj:
                    provider = token_obj.provider

        if not provider:
            return Response({'error': 'Provedor não identificado. Envie provider_token.'}, status=403)
            
        if not provider.sgp_token or not provider.sgp_url:
            return Response({'error': f'Provedor {provider.name} sem credenciais SGP configuradas no painel.'}, status=400)
            
        # Preparar dados para envio ao SGP
        payload = {}
        
        if request.method == 'POST':
            if isinstance(request.data, dict):
                payload = request.data.copy()
            else:
                payload = request.data.dict()
        else:
            # GET: Copiar query params
            payload = request.query_params.dict().copy()

        # Injetar credenciais do provedor (SOBRESCREVE se vier do client)
        payload['token'] = provider.sgp_token
        payload['app'] = provider.sgp_app_name or 'webchat'

        # Remover campos de controle interno
        if 'provider_id' in payload:
            del payload['provider_id']
        if 'provider_token' in payload:
            del payload['provider_token']

        # Construir URL final
        sgp_base_url = provider.sgp_url
        if not sgp_base_url:
             return Response({'error': f'Provedor {provider.name} sem URL do SGP configurada.'}, status=400)

        # Mapa de tradução de endpoints App -> SGP URA
        endpoint_map = {
            'cliente/consulta': 'api/ura/consultacliente',
            'cliente/consulta/': 'api/ura/consultacliente',
            'faturas': 'api/ura/faturas',
            'faturas/': 'api/ura/faturas',
            'ura/titulos': 'api/ura/titulos',
            'ura/titulos/': 'api/ura/titulos',
            'central/contratos': 'api/central/contratos',
            'central/contratos/': 'api/central/contratos',
            'ura/consultacliente': 'api/ura/consultacliente',
            'ura/consultacliente/': 'api/ura/consultacliente',
            'central/extratouso': 'api/central/extratouso',
            'central/extratouso/': 'api/central/extratouso',
            'central/chamado': 'api/central/chamado',
            'central/chamado/': 'api/central/chamado',
            'central/chamado/list': 'api/central/chamado/list',
            'central/chamado/list/': 'api/central/chamado/list',
            'ura/chamado': 'api/ura/chamado',
            'ura/chamado/': 'api/ura/chamado',
            'ura/liberacaopromessa': 'api/ura/liberacaopromessa',
            'ura/liberacaopromessa/': 'api/ura/liberacaopromessa',
            'wifi/config': 'api/wifi/config',
            'wifi/config/': 'api/wifi/config',
        }
        
        clean_endpoint = endpoint.lstrip('/')
        clean_endpoint_no_slash = clean_endpoint.rstrip('/')
        final_endpoint = endpoint_map.get(clean_endpoint_no_slash, clean_endpoint)
        
        base_domain = sgp_base_url.split('/api/')[0] if '/api/' in sgp_base_url else sgp_base_url.rstrip('/')
        target_url = f"{base_domain}/{final_endpoint}"
        if not target_url.endswith('/'):
            target_url += '/'
            
        # Tratamento especial para cpfcnpj (apenas números)
        if 'cpf_cnpj' in payload:
            payload['cpfcnpj'] = payload.pop('cpf_cnpj')
            payload['cpfcnpj'] = re.sub(r'[^0-9]', '', str(payload['cpfcnpj']))
        
        print(f"--- PROXY SGP DEBUG ({request.method}) ---")
        print(f"Endpoint Original: {endpoint}")
        print(f"URL Alvo SGP: {target_url}")
        print(f"Provedor: {provider.name} (ID: {provider.id})")
        print(f"Payload/Params: {json.dumps(payload, indent=2)}")
        print(f"-----------------------")

        response = None
        
        if request.method == 'GET':
            response = requests.get(target_url, params=payload, timeout=30)
        else:
            # POST Logic
            content_type = request.content_type or ''
            force_form_data = 'api/ura/titulos' in target_url or 'api/central/extratouso' in target_url or 'api/central/chamado' in target_url or 'api/ura/chamado' in target_url or 'api/ura/liberacaopromessa' in target_url

            if 'application/json' in content_type and not force_form_data:
                response = requests.post(target_url, json=payload, timeout=30)
            else:
                response = requests.post(target_url, data=payload, timeout=30)
            
        # Retorna a resposta do SGP para o App
        try:
            resp_json = response.json()
            
            # Normalizações de resposta (ex: PIX)
            if isinstance(resp_json, dict):
                if 'titulos' in resp_json and resp_json['titulos']:
                    for item in resp_json['titulos']:
                        if 'codigoPix' in item and 'codigopix' not in item:
                            item['codigopix'] = item['codigoPix']
                if 'links' in resp_json and resp_json['links']:
                    for item in resp_json['links']:
                        if 'codigoPix' in item and 'codigopix' not in item:
                            item['codigopix'] = item['codigoPix']

                # --- SIDE EFFECT: Update AppUser with PPPoE Login & Contract ID ---
                # Check for 'contratos' list or if response itself is a list of contracts
                contracts_list = []
                if 'contratos' in resp_json and isinstance(resp_json['contratos'], list):
                    contracts_list = resp_json['contratos']
                elif isinstance(resp_json, list):
                     # Heuristic: check if items have 'contrato' or 'servico_login'
                     if resp_json and ('contrato' in resp_json[0] or 'servico_login' in resp_json[0]):
                         contracts_list = resp_json

                if contracts_list:
                    try:
                        from core.models import AppUser
                        for c in contracts_list:
                            # Extract identifiers
                            cpf_raw = c.get('cpfCnpj') or c.get('cpf_cnpj')
                            pppoe = c.get('servico_login')
                            contract_id = c.get('contrato') or c.get('id')
                            
                            if cpf_raw:
                                cpf = re.sub(r'\D', '', str(cpf_raw))
                                
                                # Fields to update
                                update_fields = {}
                                if pppoe: 
                                    update_fields['pppoe_login'] = pppoe
                                if contract_id: 
                                    update_fields['customer_id'] = str(contract_id)
                                
                                if update_fields:
                                    # Update user silently
                                    updated_count = AppUser.objects.filter(
                                        provider=provider, 
                                        cpf=cpf
                                    ).update(**update_fields)
                                    
                                    if updated_count > 0:
                                        print(f"DEBUG: Updated AppUser {cpf} -> {update_fields}")
                    except Exception as ex:
                        print(f"DEBUG: Error updating AppUser side-effects: {ex}")
                        print(f"Error updating AppUser PPPoE: {ex}")
                # --------------------------------------------------

            return Response(resp_json, status=response.status_code)
        except:
            return Response(response.content, status=response.status_code)

    except Exception as e:
        print(f"ERRO PROXY SGP: {e}")
        return Response({'error': str(e)}, status=500)
