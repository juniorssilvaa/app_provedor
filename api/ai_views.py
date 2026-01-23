from google import genai as genai_v2
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from django.conf import settings
from core.models import AppUser, Provider, NetworkTelemetry, AIChatSession, AIChatMessage, ProviderToken, SystemSettings
import json
import requests
import re

def get_gemini_key():
    """Busca a chave API do Gemini nas configurações globais."""
    settings_obj = SystemSettings.objects.first()
    if settings_obj and settings_obj.gemini_api_key:
        return settings_obj.gemini_api_key
    return getattr(settings, 'GEMINI_API_KEY', None)

SYSTEM_PROMPT = """
Você é um Engenheiro Mobile + Backend Sênior, especialista em React Native (Expo), Android, iOS, APIs nativas, redes Wi-Fi e integração com IA.
Seu papel é atuar como um Assistente Técnico + Financeiro inteligente para clientes de um provedor de internet.

🎯 OBJETIVOS:
1. Analisar a rede Wi-Fi real do cliente com base nos dados de telemetria fornecidos.
2. Diagnosticar falta de internet:
   - Se o status for SUSPENSO (Financeiro): Informar claramente o motivo, oferecer desbloqueio em confiança ou envio de PIX/Boleto.
   - Se o status for ONLINE: Perguntar se o problema afeta todos os aparelhos ou apenas um específico.
   - Se o status for OFFLINE: Pedir para verificar se o modem está ligado e se há LED VERMELHO (sinal de problema físico/fibra).
3. Gerenciar Wi-Fi (Modem):
   - Se o cliente perguntar qual rede está usando, informe o SSID da telemetria (se disponível).
   - Use a ferramenta 'consultar_cpe_modem' para buscar as credenciais (SSID e Senha) cadastradas no equipamento e forneça ao cliente se solicitado.
   - Se não conseguir identificar a rede ou senha, pergunte ao cliente qual nome de rede aparece no celular ou na etiqueta do modem.
   - Se o cliente quiser trocar o nome ou a senha, use a ferramenta 'alterar_configuracao_wifi'.
   - Lembre o cliente: a nova senha deve ter no mínimo 8 caracteres, uma letra maiúscula, um caractere especial e um número.
4. Enviar cobranças: 
   - APENAS envie dados de pagamento (PIX/Boleto) quando o cliente pedir EXPLICITAMENTE (palavras como: "pix", "boleto", "pagamento", "cobrança", "fatura", "pagar", "código pix", "linha digitável").
   - Se o cliente pedir PIX ou Boleto, use SEMPRE a fatura selecionada no contexto financeiro (fatura_selecionada). 
   - Se houver faturas vencidas e abertas, informe ao cliente: "Vi que você tem faturas vencidas e em aberto. Vou enviar a fatura vencida (mais antiga) para você."
   - Se houver duas ou mais faturas vencidas, informe: "Vi que você tem múltiplas faturas vencidas. Vou enviar a mais antiga para você."
   - Se houver apenas faturas em aberto, envie a mais antiga.
   - SEMPRE use os dados da fatura_selecionada (codigoPix, linhaDigitavel, link) para enviar ao cliente.
   - APÓS enviar os dados de pagamento, pergunte: "Precisa de algo mais?"
   - Se o cliente agradecer (obrigado, obrigada, valeu, etc.) ou disser que não precisa de mais nada (não, não preciso, já está bom, etc.), responda APENAS de forma educada: "Disponha! O provedor {nome_do_provedor} agradece. Se precisar, estou à disposição." NÃO envie dados de pagamento novamente.
5. Abrir chamados técnicos automaticamente no SGP usando a ferramenta 'abrir_chamado'.

🧠 REGRAS DE COMPORTAMENTO:
- SEMPRE use a ferramenta 'verificar_status_conexao' IMEDIATAMENTE quando o cliente disser que está sem internet ou perguntar "por que" está sem internet.
- Se o status retornado for 'SUSPENSO', 'BLOQUEADO' ou indicar qualquer pendência financeira, informe ao cliente que esse é o motivo da falta de internet ANTES de sugerir testes físicos no modem.
- Em caso de suspensão financeira, ofereça o desbloqueio em confiança ou o pagamento imediato (PIX/Boleto).
- Só fale sobre LED VERMELHO ou problemas físicos se o status do contrato estiver 'ATIVO' ou 'ONLINE', mas o cliente ainda reclamar de falta de navegação.
- MANTENHA SUAS RESPOSTAS CURTAS (máximo 2-3 frases por mensagem).
- Use parágrafos curtos e divida explicações complexas em passos pequenos.
- IMPORTANTE: Quando o cliente pedir PIX ou Boleto, NÃO inclua os códigos (codigoPix ou linhaDigitavel) no texto da sua resposta.
- Apenas informe que está enviando os dados de pagamento. O app irá exibir automaticamente o QR Code e os botões de copiar.
- Se o cliente pedir especificamente para ver o código em texto, aí sim você pode incluir.
- NUNCA diga que não consegue gerar o QR Code.

DADOS DO CLIENTE ATUAL:
{client_context}

DADOS DE TELEMETRIA DA REDE:
{telemetry_context}
"""

def get_sgp_data(provider, cpf_cnpj, endpoint, extra_data=None, method='POST'):
    """Auxiliar para buscar dados no SGP internamente."""
    if not provider.sgp_url:
        print(f"Erro: Provedor {provider.name} não tem URL de SGP configurada.")
        return None
        
    url = f"{provider.sgp_url.rstrip('/')}/{endpoint.lstrip('/')}"
    payload = {
        'token': provider.sgp_token,
        'app': provider.sgp_app_name or 'ai_assistant',
        'cpfcnpj': cpf_cnpj
    }
    if extra_data:
        payload.update(extra_data)
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, params=payload, timeout=15)
        else:
            response = requests.post(url, data=payload, timeout=15)
        return response.json()
    except Exception as e:
        print(f"Erro ao buscar dados SGP ({url}): {e}")
        return None

def abrir_chamado_tecnico(provider, contrato_id, motivo):
    """Ferramenta para abrir chamado no SGP."""
    if not provider.sgp_url:
        return {"error": "URL do SGP não configurada para este provedor."}
        
    url = f"{provider.sgp_url.rstrip('/')}/api/ura/chamado/"
    payload = {
        'token': provider.sgp_token,
        'app': provider.sgp_app_name or 'ai_assistant',
        'contrato': contrato_id,
        'ocorrenciatipo': 1, # Tipo padrão Suporte
        'conteudo': f"Abertura automática via Assistente IA.\nMotivo: {motivo}",
        'conteudolimpo': '1'
    }
    try:
        response = requests.post(url, data=payload, timeout=15)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

@extend_schema(tags=['AI'])
@api_view(['POST'])
@permission_classes([AllowAny])
def network_telemetry_api(request):
    """Recebe e armazena dados de telemetria da rede do app."""
    data = request.data
    provider_token = data.get('provider_token')
    cpf = data.get('cpf')

    if not provider_token or not cpf:
        return Response({'error': 'provider_token e CPF são obrigatórios'}, status=400)

    # Resolve Provedor
    token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
    provider = token_obj.provider if token_obj else Provider.objects.filter(sgp_token=provider_token).first()

    if not provider:
        return Response({'error': 'Provedor inválido'}, status=403)

    cpf_limpo = re.sub(r'\D', '', str(cpf))
    user = AppUser.objects.filter(provider=provider, cpf=cpf_limpo).first()
    
    if not user:
        return Response({'error': 'Usuário não registrado'}, status=404)

    telemetry = NetworkTelemetry.objects.create(
        user=user,
        provider=provider,
        ssid=data.get('ssid'),
        wifi_dbm=data.get('wifi_dbm'),
        band=data.get('band'),
        link_speed=data.get('link_speed'),
        latency=data.get('latency'),
        packet_loss=data.get('packet_loss'),
        jitter=data.get('jitter'),
        network_type=data.get('network_type')
    )

    return Response({'success': True, 'telemetry_id': telemetry.id})

@extend_schema(
    tags=['AI'],
    summary="Chat com IA",
    description="Inicia ou continua uma conversa com o assistente inteligente do provedor.",
    request=inline_serializer(
        name='AIChatRequest',
        fields={
            'provider_token': serializers.CharField(help_text="Token sk_live_... do provedor"),
            'cpf': serializers.CharField(help_text="CPF do cliente"),
            'message': serializers.CharField(help_text="Mensagem enviada pelo usuário"),
            'session_id': serializers.IntegerField(required=False, help_text="ID da sessão anterior (opcional)")
        }
    )
)
@api_view(['POST'])
@permission_classes([AllowAny])
def ai_chat_api(request):
    """Endpoint principal de chat com a IA."""
    print("DEBUG: Executando ai_chat_api com Gemini 2.0 Flash")
    data = request.data
    provider_token = data.get('provider_token')
    cpf = data.get('cpf')
    message_text = data.get('message')
    session_id = data.get('session_id')

    if not all([provider_token, cpf, message_text]):
        return Response({'error': 'Dados insuficientes'}, status=400)

    # Resolve Provedor e Usuário
    token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
    provider = token_obj.provider if token_obj else Provider.objects.filter(sgp_token=provider_token).first()

    if not provider:
        return Response({'error': 'Provedor inválido'}, status=403)

    cpf_limpo = re.sub(r'\D', '', str(cpf))
    user = AppUser.objects.filter(provider=provider, cpf=cpf_limpo).first()
    
    if not user:
        return Response({'error': 'Usuário não encontrado'}, status=404)

    # Sessão de Chat
    if session_id:
        session = AIChatSession.objects.filter(id=session_id, user=user).first()
    else:
        session = AIChatSession.objects.create(user=user, provider=provider)

    # Salva mensagem do usuário
    AIChatMessage.objects.create(session=session, role='user', content=message_text)

    # Coleta Contexto para a IA
    # 1. Telemetria recente
    last_telemetry = NetworkTelemetry.objects.filter(user=user).order_by('-created_at').first()
    telemetry_context = "Nenhuma telemetria disponível."
    if last_telemetry:
        telemetry_context = (
            f"SSID: {last_telemetry.ssid}, Sinal: {last_telemetry.wifi_dbm} dBm, "
            f"Banda: {last_telemetry.band}, Velocidade Link: {last_telemetry.link_speed} Mbps, "
            f"Latência: {last_telemetry.latency}ms, Jitter: {last_telemetry.jitter}ms, "
            f"Tipo: {last_telemetry.network_type}"
        )

    # 2. Dados do Cliente e Contratos (SGP)
    sgp_client = get_sgp_data(provider, cpf_limpo, 'api/ura/consultacliente/')
    client_context_data = "Dados do cliente não disponíveis."
    contrato_id_target = None
    servico_id_target = None
    
    if sgp_client and isinstance(sgp_client, dict):
        client_context_data = json.dumps(sgp_client)
        contratos = sgp_client.get('contratos', [])
        if contratos:
            contrato_id_target = contratos[0].get('contratoId')

    # 3. Dados Financeiros do SGP - Busca faturas com lógica correta
    sgp_finance = get_sgp_data(provider, cpf_limpo, 'api/ura/titulos/')
    sgp_finance_2via = get_sgp_data(provider, cpf_limpo, 'api/ura/fatura2via/')
    finance_context = "Dados financeiros não disponíveis."
    selected_invoice = None  # Fatura selecionada para envio
    
    if sgp_finance and isinstance(sgp_finance, dict):
        from django.utils import timezone
        from datetime import datetime
        
        # Coletar faturas de ambos os endpoints
        titulos_map = {}
        titulos = sgp_finance.get('titulos', [])
        for t in titulos:
            titulos_map[str(t.get('id') or '')] = t
        
        # Adicionar faturas do endpoint 2via que não estão no titulos
        if sgp_finance_2via and isinstance(sgp_finance_2via, dict):
            links_2via = sgp_finance_2via.get('links', [])
            for t in links_2via:
                id_key = str(t.get('id') or t.get('fatura') or '')
                if id_key and id_key not in titulos_map:
                    titulos_map[id_key] = t
        
        titulos = list(titulos_map.values())
        if not contrato_id_target and titulos:
            contrato_id_target = titulos[0].get('clienteContrato')
        
        # Filtrar e priorizar faturas conforme regras:
        # - Excluir canceladas
        # - Excluir futuras (exceto abertas)
        # - Prioridade: vencidas > abertas
        # - Se houver duas vencidas, pegar a mais antiga
        now = timezone.now()
        today_str = now.strftime('%Y-%m-%d')
        
        valid_invoices = []
        for t in titulos:
            status = (t.get('status') or t.get('status_display') or '').lower().strip()
            if 'cancelado' in status:
                continue
            
            due_date = t.get('dataVencimento') or t.get('vencimento') or t.get('vencimento_original') or ''
            if not due_date:
                continue
            
            due_date_str = due_date.split('T')[0] if 'T' in due_date else due_date
            is_paid = 'pago' in status or 'liquidado' in status
            is_open = 'aberto' in status
            is_overdue = 'vencido' in status or 'atrasado' in status
            
            # Excluir futuras (exceto abertas e pagas)
            if not is_paid and not is_open and due_date_str > today_str:
                continue
            
            # Verificar se está vencida pela data (aberta mas vencida = vencida)
            if is_open and due_date_str < today_str:
                is_overdue = True
                is_open = False
            
            if is_paid or is_open or is_overdue:
                valid_invoices.append({
                    'id': t.get('id'),
                    'status': 'overdue' if is_overdue else ('pending' if is_open else 'paid'),
                    'valor': t.get('valor', 0),
                    'dataVencimento': due_date_str,
                    'codigoPix': t.get('codigoPix') or t.get('codigopix') or '',
                    'linhaDigitavel': t.get('linhaDigitavel') or t.get('linhadigitavel') or '',
                    'link': t.get('link') or '',
                    'link_cobranca': t.get('link_cobranca') or '',
                    'numeroDocumento': t.get('numeroDocumento') or '',
                    'clienteContrato': t.get('clienteContrato') or contrato_id_target,
                    'raw': t  # Dados completos para contexto
                })
        
        # Separar por status
        overdue_invoices = [inv for inv in valid_invoices if inv['status'] == 'overdue']
        open_invoices = [inv for inv in valid_invoices if inv['status'] == 'pending']
        paid_invoices = [inv for inv in valid_invoices if inv['status'] == 'paid']
        
        # Ordenar: vencidas (mais antiga primeiro), abertas (mais antiga primeiro)
        overdue_invoices.sort(key=lambda x: x['dataVencimento'])
        open_invoices.sort(key=lambda x: x['dataVencimento'])
        
        # Selecionar fatura conforme regras:
        # 1. Se houver vencidas, pegar a mais antiga
        # 2. Se não houver vencidas mas houver abertas, pegar a mais antiga
        if overdue_invoices:
            selected_invoice = overdue_invoices[0]
        elif open_invoices:
            selected_invoice = open_invoices[0]
        
        # Montar contexto financeiro para a IA
        finance_info = {
            'total_titulos': len(titulos),
            'vencidas': len(overdue_invoices),
            'abertas': len(open_invoices),
            'pagas': len(paid_invoices),
            'fatura_selecionada': selected_invoice,
            'todas_vencidas': [{'id': inv['id'], 'valor': inv['valor'], 'vencimento': inv['dataVencimento']} for inv in overdue_invoices],
            'todas_abertas': [{'id': inv['id'], 'valor': inv['valor'], 'vencimento': inv['dataVencimento']} for inv in open_invoices]
        }
        
        finance_context = json.dumps(finance_info, ensure_ascii=False)

    # 4. Status de Acesso e Serviço ID
    access_context = "Status de acesso não disponível."
    if contrato_id_target:
        sgp_access = get_sgp_data(provider, cpf_limpo, 'api/ura/verificaacesso/', {'contrato': contrato_id_target})
        if sgp_access:
            access_context = json.dumps(sgp_access)
            servico_id_target = sgp_access.get('servico_id')

    client_context = f"Nome do Cliente: {user.name}, CPF: {cpf_limpo}, Provedor: {provider.name}, Contrato Atual: {contrato_id_target}, Serviço ID: {servico_id_target}, Dados SGP: {client_context_data}, Financeiro: {finance_context}, Status de Acesso: {access_context}"

    # Prepara Histórico para o Gemini
    history = []
    messages = session.messages.all().order_by('created_at')
    for msg in messages:
        history.append({"role": msg.role if msg.role != 'assistant' else 'model', "parts": [msg.content]})

    # Chama o Gemini
    try:
        # Configura a chave API dinamicamente
        api_key = get_gemini_key()
        if not api_key:
            print("ERRO: Chave API do Gemini não encontrada no banco ou settings.")
            return Response({'error': 'Chave API do Gemini não configurada no Painel Superadmin'}, status=500)
            
        print(f"INFO: Usando chave API (primeiros 5 caracteres): {api_key[:5]}...")
        # Usando a nova SDK (google-genai) para garantir compatibilidade com gemini-2.0-flash
        client = genai_v2.Client(api_key=api_key)
        
        # Prepara o prompt do sistema formatado
        system_msg = SYSTEM_PROMPT.format(
            client_context=client_context,
            telemetry_context=telemetry_context,
            nome_do_provedor=provider.name
        )

        # Prepara o histórico para o formato da nova SDK
        v2_history = []
        messages = session.messages.all().order_by('created_at')
        # A última mensagem já foi salva no banco mas o send_message a enviará novamente,
        # então pegamos apenas o histórico anterior.
        for msg in messages.exclude(id=messages.last().id):
            v2_history.append({
                "role": msg.role if msg.role != 'assistant' else 'model',
                "parts": [{"text": msg.content}]
            })

        # Ferramenta de abertura de chamado
        def abrir_chamado(motivo: str) -> str:
            """Abre um chamado técnico no SGP. Use apenas quando o problema não for resolvido com dicas básicas ou quando houver falha de rede clara."""
            contrato_id = None
            if sgp_finance and isinstance(sgp_finance, dict):
                titulos = sgp_finance.get('titulos', [])
                if titulos:
                    contrato_id = titulos[0].get('clienteContrato')
            
            if not contrato_id:
                match = re.search(r'contrato: (\d+)', client_context, re.I)
                if match:
                    contrato_id = match.group(1)

            if not contrato_id:
                return "Não consegui identificar seu contrato para abrir o chamado automaticamente."

            result = abrir_chamado_tecnico(provider, contrato_id, motivo)
            return json.dumps(result)

        def verificar_status_conexao() -> str:
            """Verifica o status atual do contrato e da conexão do cliente no SGP (ONLINE, OFFLINE, SUSPENSO)."""
            contrato_id_target = None
            if sgp_finance and isinstance(sgp_finance, dict):
                titulos = sgp_finance.get('titulos', [])
                if titulos:
                    contrato_id_target = titulos[0].get('clienteContrato')
            
            if not contrato_id_target:
                return "Contrato não localizado para verificar status."
            
            # Chama o endpoint verificaacesso no SGP
            result = get_sgp_data(provider, cpf_limpo, 'api/ura/verificaacesso/', {'contrato': contrato_id_target})
            return json.dumps(result)

        def realizar_liberacao_confianca() -> str:
            """Realiza o desbloqueio em confiança (liberação temporária) para o cliente no SGP."""
            contrato_id_target = None
            if sgp_finance and isinstance(sgp_finance, dict):
                titulos = sgp_finance.get('titulos', [])
                if titulos:
                    contrato_id_target = titulos[0].get('clienteContrato')
            
            if not contrato_id_target:
                return "Contrato não localizado para realizar a liberação."
            
            # Chama o endpoint liberacaopromessa no SGP
            result = get_sgp_data(provider, cpf_limpo, 'api/ura/liberacaopromessa/', {'contrato': contrato_id_target})
            return json.dumps(result)

        def consultar_cpe_modem() -> str:
            """Consulta as informações do modem (CPE) do cliente, como nome da rede WiFi e configurações."""
            if not contrato_id_target:
                return "Contrato não localizado para consultar o modem."
            
            payload = {'contrato': contrato_id_target}
            if servico_id_target:
                payload['servico'] = servico_id_target
            
            # Chama o endpoint cpemanage no SGP (GET)
            result = get_sgp_data(provider, cpf_limpo, 'api/ura/cpemanage/', payload, method='GET')
            return json.dumps(result)

        def alterar_configuracao_wifi(novo_ssid: str = None, nova_senha: str = None, novo_ssid_5g: str = None, nova_senha_5g: str = None) -> str:
            """Altera o nome (SSID) ou a senha da rede WiFi do cliente no modem (CPE)."""
            if not contrato_id_target:
                return "Contrato não localizado para alterar o WiFi."
            
            payload = {'contrato': contrato_id_target}
            if servico_id_target:
                payload['servico'] = servico_id_target
                
            if novo_ssid: payload['novo_ssid'] = novo_ssid
            if nova_senha: payload['nova_senha'] = nova_senha
            if novo_ssid_5g: payload['novo_ssid_5g'] = novo_ssid_5g
            if nova_senha_5g: payload['nova_senha_5g'] = nova_senha_5g
            
            # Chama o endpoint cpemanage no SGP (POST)
            result = get_sgp_data(provider, cpf_limpo, 'api/ura/cpemanage/', payload, method='POST')
            return json.dumps(result)

        # Configuração da chamada com suporte a ferramentas
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=v2_history + [{"role": "user", "parts": [{"text": message_text}]}],
            config={
                "system_instruction": system_msg,
                "tools": [abrir_chamado, verificar_status_conexao, realizar_liberacao_confianca, consultar_cpe_modem, alterar_configuracao_wifi] if sgp_finance else [],
            }
        )
        
        ai_response_text = response.text
        if not ai_response_text:
            # Se não houver texto, pode ser uma falha de segurança ou ferramenta não processada
            print(f"DEBUG: Gemini retornou resposta sem texto. Response: {response}")
            ai_response_text = "Desculpe, não consegui processar sua solicitação no momento. Pode tentar de outra forma?"

        # Lógica para dividir mensagens longas em partes menores
        # Divide por parágrafos ou por sentenças se o texto for muito longo
        messages_to_send = []
        if len(ai_response_text) > 300:
            # Tenta dividir por quebras de linha duplas (parágrafos)
            parts = [p.strip() for p in ai_response_text.split('\n\n') if p.strip()]
            if len(parts) > 1:
                messages_to_send = parts
            else:
                # Se não houver parágrafos, divide por frases ou simplesmente corta ao meio
                messages_to_send = [ai_response_text[:len(ai_response_text)//2], ai_response_text[len(ai_response_text)//2:]]
        else:
            messages_to_send = [ai_response_text]

        # Salva resposta da IA no banco (como uma única mensagem para o histórico)
        AIChatMessage.objects.create(session=session, role='assistant', content=ai_response_text)

        # Incluir dados de pagamento na resposta APENAS se:
        # 1. Houver fatura selecionada
        # 2. A mensagem do usuário indicar que está pedindo pagamento/PIX/boleto
        # 3. Não for agradecimento ou negação após já ter enviado pagamento
        payment_data = None
        if selected_invoice:
            # Verificar se a mensagem do usuário indica pedido de pagamento
            message_lower = message_text.lower()
            payment_keywords = ['pix', 'boleto', 'pagamento', 'cobrança', 'fatura', 'pagar', 'código pix', 
                              'linha digitável', 'linha digitavel', 'codigo pix', 'chave pix', 'copiar pix']
            
            # Verificar se é agradecimento ou negação (não enviar dados nesses casos)
            gratitude_keywords = ['obrigado', 'obrigada', 'valeu', 'agradeço', 'agradeço', 'grato', 'grata', 'disponha']
            negation_keywords = ['não', 'nao', 'não preciso', 'nao preciso', 'já está', 'ja esta', 'já está bom', 'ja esta bom', 'nada mais']
            
            # Verificar histórico para ver se já foi enviado pagamento antes
            previous_messages = session.messages.all().order_by('-created_at')[:5]  # Últimas 5 mensagens
            payment_already_sent = False
            for prev_msg in previous_messages:
                if prev_msg.role == 'assistant':
                    # Verificar se a mensagem anterior mencionou pagamento ou se tinha payment_data
                    prev_content_lower = prev_msg.content.lower()
                    if any(keyword in prev_content_lower for keyword in ['pix', 'boleto', 'pagamento', 'cobrança', 'fatura', 'qr code', 'opções de pagamento']):
                        payment_already_sent = True
                        break
            
            is_payment_request = any(keyword in message_lower for keyword in payment_keywords)
            is_gratitude = any(keyword in message_lower for keyword in gratitude_keywords)
            is_negation = any(keyword in message_lower for keyword in negation_keywords)
            
            # Só enviar dados de pagamento se:
            # - For pedido explícito E
            # - Não for agradecimento/negação E
            # - Não tiver enviado pagamento recentemente (ou se for pedido explícito mesmo após ter enviado)
            if is_payment_request and not is_gratitude and not is_negation:
                # Se já enviou antes mas o cliente está pedindo novamente explicitamente, pode enviar
                payment_data = {
                    'codigoPix': selected_invoice.get('codigoPix', ''),
                    'linhaDigitavel': selected_invoice.get('linhaDigitavel', ''),
                }
            elif payment_already_sent and (is_gratitude or is_negation):
                # Se já enviou pagamento e o cliente está agradecendo ou negando, NÃO enviar novamente
                payment_data = None

        return Response({
            'session_id': session.id,
            'response': ai_response_text,
            'messages': messages_to_send, # Enviamos a lista para o app mobile
            'telemetry_analyzed': last_telemetry is not None,
            'payment_data': payment_data  # Dados de pagamento para o frontend
        })

    except Exception as e:
        print(f"Erro Gemini: {e}")
        return Response({'error': 'Erro ao processar conversa com a IA'}, status=500)
