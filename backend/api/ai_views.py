from google import genai as genai_v2
from google.api_core import exceptions as google_exceptions
import time
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from .genieacs_service import GenieACSService
from django.conf import settings
from core.models import AppUser, Provider, NetworkTelemetry, AIChatSession, AIChatMessage, ProviderToken, SystemSettings
import json
import re
import random
import requests
import qrcode
import io
import base64
from PIL import Image

def generate_qr_base64(data):
    """Gera QR Code usando a mesma lógica do script de teste e retorna em Base64."""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return img_str
    except Exception as e:
        print(f"Erro ao gerar QR Code base64: {e}")
        return None

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
1.53→1. Analisar a rede Wi-Fi real do cliente com base nos dados de telemetria fornecidos.
54→   - Interprete o sinal (dBm):
55→     * Ótimo: > -50 dBm
56→     * Bom: -50 a -60 dBm
57→     * Regular: -60 a -70 dBm
58→     * Ruim/Fraco: < -70 dBm
59→   - Se o sinal estiver FRACO (menor que -70 dBm) e o cliente reclamar de lentidão:
60→     * Instrua o cliente a se aproximar do roteador.
61→     * Sugira conectar na rede 5G (se disponível e ele estiver perto) ou na 2.4G (se estiver longe/com paredes).
62→     * Pergunte se há obstáculos físicos (paredes grossas, espelhos, aquários) entre o celular e o modem.
63→     * Peça para testar em outro dispositivo para descartar problema no celular atual.
64→2. Diagnosticar falta de internet:
   - Se o status for SUSPENSO (Financeiro):
     * Se o cliente pediu "desbloqueio", "liberar" ou "reativar": Execute 'realizar_liberacao_confianca' IMEDIATAMENTE. NÃO explique o motivo da suspensão.
     * Se o cliente apenas reclamou de internet lenta/sem sinal: Informe o motivo financeiro e ofereça desbloqueio ou PIX.
   - Se o status for ONLINE: Perguntar se o problema afeta todos os aparelhos ou apenas um específico.
   - Se o status for OFFLINE: Pedir para verificar se o modem está ligado e se há LED VERMELHO (sinal de problema físico/fibra).
3. Gerenciar Wi-Fi (Modem):
   - Se o cliente perguntar qual rede está usando, informe o SSID da telemetria (se disponível).
   - Use a ferramenta 'consultar_cpe_modem' para buscar as credenciais (SSID e Senha) cadastradas no equipamento e forneça ao cliente se solicitado.
   - Se não conseguir identificar a rede ou senha, pergunte ao cliente qual nome de rede aparece no celular ou na etiqueta do modem.
   - Se o cliente quiser trocar o nome ou a senha, use a ferramenta 'alterar_configuracao_wifi'.
   - IMPORTANTE (Extração de Dados): Se o usuário disser "Mudar nome para X" ou "Senha para Y", extraia esses valores IMEDIATAMENTE e chame a ferramenta. NÃO PERGUNTE o que ele já informou.
   - IMPORTANTE (Parâmetros Parciais): Se o usuário quiser mudar APENAS o nome, envie a nova senha como null/vazio na ferramenta. Se quiser mudar APENAS a senha, envie o novo nome como null/vazio.
   - PROIBIDO PEDIR SENHA ATUAL: NUNCA peça a senha atual do Wi-Fi para fazer alterações. O usuário já está autenticado no aplicativo. Apenas execute a troca.
   - Lembre o cliente: a nova senha deve ter no mínimo 8 caracteres, uma letra maiúscula, um caractere especial e um número (apenas se ele estiver trocando a senha).
   - CONFIRMAÇÃO FINAL: Após a ferramenta retornar sucesso, responda confirmando explicitamente o novo valor. Ex: "Pronto! O nome da sua rede Wi-Fi agora é [NOVO_NOME]."
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
- PRIORIDADE MÁXIMA (DESBLOQUEIO):
  - Se o cliente pedir "desbloqueio", "liberar", "reativar" ou "internet cortada":
    1. NÃO responda com texto imediatamente.
    2. CHAME a ferramenta 'realizar_liberacao_confianca' PRIMEIRO.
    3. AGUARDE o resultado da ferramenta.
     4. Analise o retorno (JSON). Se tiver sucesso, responda EXATAMENTE neste formato: "Desbloqueio realizado com sucesso! Sua internet foi liberada por X dias. Posso ajudar em algo mais?" (Substitua X pelo valor de 'liberado_dias' ou 'dias' do retorno).
     5. Se der erro, explique resumidamente.
   - NÃO pergunte se ele quer desbloquear. FAÇA.
  - NÃO explique motivos financeiros se ele já pediu o desbloqueio.
- Se o status retornado for 'SUSPENSO', 'BLOQUEADO' e o cliente NÃO pediu desbloqueio (apenas reclamou que está sem net), informe o motivo financeiro e ofereça as opções.
- Só fale sobre LED VERMELHO ou problemas físicos se o status do contrato estiver 'ATIVO' ou 'ONLINE', mas o cliente ainda reclamar de falta de navegação.
- MANTENHA SUAS RESPOSTAS CURTAS (máximo 2-3 frases por mensagem).
- Use parágrafos curtos e divida explicações complexas em passos pequenos.
- IMPORTANTE: Quando o cliente pedir PIX ou Boleto, NÃO inclua os códigos (codigoPix ou linhaDigitavel) no texto da sua resposta.
- Apenas informe que está enviando os dados de pagamento. O app irá exibir automaticamente o QR Code e os botões de copiar.
- Se o cliente pedir especificamente para ver o código em texto, aí sim você pode incluir.
- NUNCA diga que não consegue gerar o QR Code.
- AO ABRIR UM CHAMADO TÉCNICO:
  - Divida sua resposta OBRIGATORIAMENTE em duas mensagens separadas pelo delimitador "|||".
  - Mensagem 1: Explique o motivo técnico (ex: "Como o LED está vermelho, isso indica um problema físico na fibra...").
  - Mensagem 2: Informe que o chamado foi aberto e forneça o protocolo (ex: "Por isso, abri um chamado técnico para você. Protocolo: 123456").
  - NÃO envie tudo em um único bloco de texto. Use "|||" para separar.

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
    user_name = data.get('name')
    
    print(f"DEBUG: Recebido -> Token: {provider_token}, CPF: {cpf}, Session: {session_id}, Name: {user_name}")

    if not all([provider_token, cpf, message_text]):
        print("DEBUG: Dados insuficientes")
        return Response({'error': 'Dados insuficientes'}, status=400)

    # Resolve Provedor e Usuário
    token_obj = ProviderToken.objects.filter(token=provider_token, is_active=True).first()
    provider = token_obj.provider if token_obj else Provider.objects.filter(sgp_token=provider_token).first()

    if not provider:
        print(f"DEBUG: Provedor inválido para token {provider_token}")
        return Response({'error': 'Provedor inválido'}, status=403)

    cpf_limpo = re.sub(r'\D', '', str(cpf))
    user = AppUser.objects.filter(provider=provider, cpf=cpf_limpo).first()
    
    if not user:
        print(f"DEBUG: Usuário não encontrado para CPF {cpf_limpo} no provedor {provider.name}")
        # Tenta criar usuário temporário se não existir (para testes) ou retorna erro detalhado
        # return Response({'error': 'Usuário não encontrado'}, status=404)
        
        # Opcional: Auto-cadastro simplificado para evitar bloqueio em testes
        print(f"DEBUG: Criando usuário temporário para CPF {cpf_limpo}")
        user = AppUser.objects.create(
            provider=provider,
            cpf=cpf_limpo,
            name=user_name if user_name else f"Cliente {cpf_limpo}"
        )
    elif user_name and (not user.name or user.name.startswith("Cliente ")):
        # Atualiza o nome se vier na requisição e o atual for genérico ou vazio
        print(f"DEBUG: Atualizando nome do usuário de '{user.name}' para '{user_name}'")
        user.name = user_name
        user.save()

    # Sessão de Chat
    session = None
    if session_id:
        session = AIChatSession.objects.filter(id=session_id, user=user).first()
    
    if not session:
        session = AIChatSession.objects.create(user=user, provider=provider)

    # Salva mensagem do usuário
    AIChatMessage.objects.create(session=session, role='user', content=message_text)

    # Coleta Contexto para a IA
    # 1. Telemetria recente
    telemetry_data = data.get('telemetry')
    telemetry_context = "Nenhuma telemetria disponível."
    
    if telemetry_data and isinstance(telemetry_data, dict):
        # Usa telemetria enviada no request
        ssid = telemetry_data.get('ssid', 'N/A')
        signal = telemetry_data.get('signal_strength') or telemetry_data.get('wifi_dbm') or 'N/A'
        
        telemetry_context = (
            f"SSID: {ssid}, Sinal: {signal} dBm, "
            f"IP: {telemetry_data.get('ip', 'N/A')}, "
            f"BSSID: {telemetry_data.get('bssid', 'N/A')}"
        )
        
        # Opcional: Salvar no banco para histórico
        try:
            NetworkTelemetry.objects.create(
                user=user,
                provider=provider,
                ssid=ssid,
                wifi_dbm=int(signal) if isinstance(signal, int) else None,
                network_type=telemetry_data.get('connectivity', 'wifi')
            )
        except Exception as e:
            print(f"Erro ao salvar telemetria via chat: {e}")
            
    else:
        # Fallback para banco de dados
        last_telemetry = NetworkTelemetry.objects.filter(user=user).order_by('-created_at').first()
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
        # SYNC PPPoE LOGIN - Garante que o usuário tenha o login atualizado para consultas GenieACS
        found_login = sgp_client.get('login') or sgp_client.get('pppoe_login')
        contratos = sgp_client.get('contratos', [])
        
        if not found_login and contratos:
            for c in contratos:
                if c.get('login'):
                    found_login = c.get('login')
                    break
        
        if found_login and found_login != user.pppoe_login:
            print(f"DEBUG: Atualizando PPPoE Login do usuário {user.cpf} via IA: {found_login}")
            user.pppoe_login = found_login
            user.save(update_fields=['pppoe_login'])

        client_context_data = json.dumps(sgp_client)
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
                    'codigoPix': (t.get('codigoPix') or t.get('codigopix') or '').strip(),
                    'linhaDigitavel': (t.get('linhaDigitavel') or t.get('linhadigitavel') or '').strip(),
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
        
        # Selecionar fatura e definir ação conforme script de regras:
        # 1. Se houver faturas vencidas (uma ou mais) -> Envia a mais antiga
        # 2. Se não houver vencidas mas houver abertas -> Envia a mais antiga
        # 3. Caso contrário -> Nenhuma pendência
        
        action_flag = 'none' # none, send_invoice
        
        if overdue_invoices:
            # Regra ajustada: Mesmo com múltiplas vencidas, envia a mais antiga (não transfere)
            action_flag = 'send_invoice'
            selected_invoice = overdue_invoices[0]
            
        elif open_invoices:
            # Regra 5 do Script: Nenhuma vencida, mas tem aberta -> Enviar a mais antiga
            action_flag = 'send_invoice'
            selected_invoice = open_invoices[0]
        else:
            # Regra 6 do Script: Sem faturas -> Parabéns
            action_flag = 'none'
            selected_invoice = None
        
        # Montar contexto financeiro para a IA
        finance_info = {
            'total_titulos': len(titulos),
            'vencidas': len(overdue_invoices),
            'abertas': len(open_invoices),
            'pagas': len(paid_invoices),
            'fatura_selecionada': selected_invoice,
            'acao_sugerida': action_flag, # Informa a IA sobre a ação recomendada
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
            # Tenta usar o contrato identificado no contexto global
            contrato_id = contrato_id_target
            
            # Se não tiver, tenta extrair do financeiro (fallback)
            if not contrato_id and sgp_finance and isinstance(sgp_finance, dict):
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
            if not contrato_id_target:
                return "Contrato não localizado para verificar status."
            
            # Chama o endpoint verificaacesso no SGP
            result = get_sgp_data(provider, cpf_limpo, 'api/ura/verificaacesso/', {'contrato': contrato_id_target})
            return json.dumps(result)

        def realizar_liberacao_confianca() -> str:
            """Realiza o desbloqueio em confiança (liberação temporária) para o cliente no SGP."""
            # Tenta usar o contrato global
            cid = contrato_id_target
            
            # Se não tiver, tenta extrair do contexto (fallback)
            if not cid:
                match = re.search(r'contrato: (\d+)', client_context, re.I)
                if match:
                    cid = match.group(1)

            # Tenta pegar dos dados do cliente SGP diretos (se disponivel no escopo)
            if not cid and sgp_client and isinstance(sgp_client, dict):
                 contratos = sgp_client.get('contratos', [])
                 if contratos:
                    cid = contratos[0].get('contratoId')

            if not cid:
                return "Contrato não localizado para realizar a liberação."
            
            print(f"DEBUG: Realizando liberação confiança para contrato {cid}")
            
            # Chama o endpoint liberacaopromessa no SGP
            result = get_sgp_data(provider, cpf_limpo, 'api/ura/liberacaopromessa/', {
                'contrato': cid,
                'conteudo': 'Solicitação de Desbloqueio via Assistente IA'
            })
            
            print(f"DEBUG: Resultado liberação: {result}")
            return json.dumps(result)

        def get_genie_device_id(service):
            """Auxiliar para encontrar ID do dispositivo GenieACS"""
            # 1. Tenta cache local no AppUser
            if user.genieacs_device_id:
                return user.genieacs_device_id
            
            # 2. Se tiver PPPoE salvo, busca no GenieACS
            if user.pppoe_login:
                did = service.find_device_by_pppoe(user.pppoe_login)
                if did:
                    user.genieacs_device_id = did
                    user.save(update_fields=['genieacs_device_id'])
                    return did
            
            return None

        def consultar_cpe_modem() -> str:
            """Consulta as informações do modem (CPE) do cliente, como nome da rede WiFi e configurações."""
            try:
                service = GenieACSService()
                device_id = get_genie_device_id(service)
                
                if not device_id:
                    # Tenta fallback via SGP antigo se falhar GenieACS direto? 
                    # Melhor não misturar. Se falhar aqui, avisa.
                    return "Não foi possível identificar seu modem no sistema de gerenciamento."
                
                config = service.get_wifi_config(device_id)
                if not config:
                    return f"Não consegui ler as configurações do Wi-Fi. Erro: {(service.last_error or {}).get('message', 'Desconhecido')}"
                
                # Formata retorno amigável para a IA
                return json.dumps(config)
            except Exception as e:
                return f"Erro ao consultar modem: {str(e)}"

        def alterar_configuracao_wifi(novo_ssid: str = None, nova_senha: str = None, novo_ssid_5g: str = None, nova_senha_5g: str = None) -> str:
            """Altera o nome (SSID) ou a senha da rede WiFi do cliente no modem (CPE)."""
            try:
                service = GenieACSService()
                device_id = get_genie_device_id(service)
                
                if not device_id:
                    return "Não foi possível identificar seu modem para realizar a alteração."

                # Mapeia parametros para o service (que espera ssid_2g, etc)
                # A IA pode mandar novo_ssid ou novo_ssid_2g, etc. O prompt define novo_ssid (implícito 2.4)
                
                success = service.change_wifi_config(
                    device_id,
                    ssid_2g=novo_ssid,
                    password_2g=nova_senha,
                    ssid_5g=novo_ssid_5g,
                    password_5g=nova_senha_5g
                )
                
                if success:
                    # Atualiza cache local para refletir mudança imediata
                    if novo_ssid: user.wifi_ssid_2g = novo_ssid
                    if nova_senha: user.wifi_password_2g = nova_senha
                    if novo_ssid_5g: user.wifi_ssid_5g = novo_ssid_5g
                    if nova_senha_5g: user.wifi_password_5g = nova_senha_5g
                    user.save()
                    
                    return "Configuração enviada com sucesso! O modem deve reiniciar a rede Wi-Fi em alguns instantes."
                else:
                    return f"Falha ao alterar configuração no modem. Erro: {(service.last_error or {}).get('message', 'Desconhecido')}"
            except Exception as e:
                return f"Erro ao processar alteração: {str(e)}"

        # Configuração da chamada com suporte a ferramentas
        # Mapa de funções para execução dinâmica
        tools_map = {
            'abrir_chamado': abrir_chamado,
            'verificar_status_conexao': verificar_status_conexao,
            'realizar_liberacao_confianca': realizar_liberacao_confianca,
            'consultar_cpe_modem': consultar_cpe_modem,
            'alterar_configuracao_wifi': alterar_configuracao_wifi
        }

        # Primeira chamada ao modelo
        current_conversation = v2_history + [{"role": "user", "parts": [{"text": message_text}]}]
        
        def call_gemini_with_retry(model_name, contents, config, retries=5):
            for attempt in range(retries):
                try:
                    return client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config
                    )
                except Exception as e:
                    error_str = str(e)
                    is_429 = "429" in error_str or "Resource exhausted" in error_str or "RESOURCE_EXHAUSTED" in error_str
                    
                    if is_429:
                        print(f"AVISO: Quota excedida para {model_name}. Tentativa {attempt + 1}/{retries}")
                        if attempt < retries - 1:
                            # Backoff exponencial com jitter
                            sleep_time = (2 ** (attempt + 1)) + (random.random() * 1.0)
                            time.sleep(sleep_time)
                        else:
                            raise # Re-levanta a exceção se esgotar as tentativas
                    else:
                        raise e

        try:
            try:
                response = call_gemini_with_retry(
                    model_name="gemini-2.0-flash",
                    contents=current_conversation,
                    config={
                        "system_instruction": system_msg,
                        "tools": [abrir_chamado, verificar_status_conexao, realizar_liberacao_confianca, consultar_cpe_modem, alterar_configuracao_wifi],
                    }
                )
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "Resource exhausted" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    print("ERRO: Quota excedida para gemini-2.0-flash após tentativas.")
                    return Response({'error': 'Serviço de IA muito ocupado. Aguarde alguns segundos e tente novamente.'}, status=503)
                else:
                    raise e

        except Exception as e:
            print(f"ERRO CRÍTICO no Gemini: {e}")
            return Response({'error': 'Serviço de IA temporariamente indisponível. Tente novamente em instantes.'}, status=503)
        
        # Loop para processar chamadas de função (Function Calling)
        # O modelo pode chamar várias ferramentas em sequência
        current_response = response
        max_turns = 5  # Limite de segurança para evitar loops infinitos
        turn_count = 0

        while turn_count < max_turns:
            # Verifica se há chamadas de função na resposta
            function_calls = []
            if current_response.candidates and current_response.candidates[0].content.parts:
                for part in current_response.candidates[0].content.parts:
                    if part.function_call:
                        function_calls.append(part.function_call)
            
            # Se não houver chamadas de função, terminamos (temos a resposta de texto final)
            if not function_calls:
                break
                
            turn_count += 1
            print(f"DEBUG: Processando {len(function_calls)} chamadas de função (Turno {turn_count})")
            
            # Executa as funções solicitadas
            tool_outputs = []
            for fc in function_calls:
                func_name = fc.name
                func_args = fc.args
                
                print(f"DEBUG: Executando ferramenta: {func_name} com args: {func_args}")
                
                if func_name in tools_map:
                    try:
                        # Converte args para dict se necessário
                        args_dict = {}
                        if func_args:
                            for key, value in func_args.items():
                                args_dict[key] = value
                                
                        # Executa a função
                        result = tools_map[func_name](**args_dict)
                        
                        # Tratamento para resultados vazios ou listas vazias
                        if result == "[]" or result == "{}":
                            result = "Nenhum registro encontrado no sistema."
                        
                        # Adiciona o resultado à lista de outputs
                        tool_outputs.append({
                            "function_response": {
                                "name": func_name,
                                "response": {"result": result}
                            }
                        })
                    except Exception as e:
                        print(f"ERRO ao executar ferramenta {func_name}: {e}")
                        tool_outputs.append({
                            "function_response": {
                                "name": func_name,
                                "response": {"error": str(e)}
                            }
                        })
                else:
                    print(f"ERRO: Ferramenta {func_name} desconhecida")
                    tool_outputs.append({
                        "function_response": {
                            "name": func_name,
                            "response": {"error": "Ferramenta desconhecida"}
                        }
                    })

            # Envia os resultados das ferramentas de volta para o modelo
            
            # Recupera as partes da resposta atual (que contêm os function_calls)
            model_parts = []
            if current_response.candidates and current_response.candidates[0].content.parts:
                 model_parts = [part for part in current_response.candidates[0].content.parts]

            # Atualiza o histórico da conversa atual
            current_history_extension = [
                {"role": "model", "parts": model_parts},
                {"role": "user", "parts": tool_outputs}
            ]
            current_conversation.extend(current_history_extension)
            
            print("DEBUG: Enviando resultados das ferramentas de volta para o modelo...")
            try:
                try:
                    current_response = call_gemini_with_retry(
                        model_name="gemini-2.0-flash",
                        contents=current_conversation,
                        config={
                            "system_instruction": system_msg,
                            "tools": [abrir_chamado, verificar_status_conexao, realizar_liberacao_confianca, consultar_cpe_modem, alterar_configuracao_wifi],
                        }
                    )
                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "Resource exhausted" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                        print("ERRO: Quota excedida no loop de ferramentas (gemini-2.0-flash).")
                        return Response({'error': 'Serviço de IA muito ocupado durante processamento. Tente novamente.'}, status=503)
                    else:
                        raise e

            except Exception as e:
                print(f"ERRO CRÍTICO no Gemini (Loop Ferramentas): {e}")
                # Em caso de erro crítico no meio do loop, tentamos salvar o que temos ou retornar erro
                # Mas como já executamos ferramentas, talvez seja melhor retornar um erro amigável
                return Response({'error': 'Erro de comunicação com a IA durante o processamento. Tente novamente.'}, status=503)
            
            # O loop continua para ver se ela quer chamar mais ferramentas ou dar a resposta final.

        # Tenta extrair o texto da resposta final
        ai_response_text = ""
        try:
            if current_response.candidates and current_response.candidates[0].content.parts:
                for part in current_response.candidates[0].content.parts:
                    if part.text:
                        ai_response_text += part.text
        except Exception as e:
             print(f"DEBUG: Erro ao extrair texto da resposta: {e}")

        if not ai_response_text:
            # Se não houver texto, pode ser uma falha de segurança ou ferramenta não processada
            print(f"DEBUG: Gemini retornou resposta sem texto. Response: {current_response}")
            ai_response_text = "Desculpe, não consegui processar sua solicitação no momento. Pode tentar de outra forma?"

        # Salva resposta da IA no banco (como uma única mensagem para o histórico)
        AIChatMessage.objects.create(session=session, role='assistant', content=ai_response_text)

        # Lógica de resposta estruturada baseada nas flags calculadas anteriormente
        payment_data = None
        messages_to_send = []
        
        # Recuperar a flag de ação do contexto financeiro (se disponível)
        current_action = finance_info.get('acao_sugerida', 'none') if 'finance_info' in locals() else 'none'
        
        # Verificar se a mensagem do usuário é sobre pagamentos
        message_lower = message_text.lower()
        payment_keywords = ['pix', 'boleto', 'pagamento', 'cobrança', 'fatura', 'pagar', 'código pix', 
                          'linha digitável', 'linha digitavel', 'codigo pix', 'chave pix', 'copiar pix']
        is_payment_request = any(keyword in message_lower for keyword in payment_keywords)
        
        # Verificar se é uma mensagem de agradecimento ou encerramento
        thank_you_keywords = ['obrigado', 'obrigada', 'valeu', 'grato', 'grata', 'agradeço', 'tks', 'thx', 'ok', 'certo', 'beleza', 'tchau', 'até mais']
        is_thank_you = any(keyword in message_lower for keyword in thank_you_keywords)
        
        # Só processar lógica automática se for pedido de pagamento OU se a IA identificou a necessidade
        # MAS impedir envio se for apenas um agradecimento (sem pedido de pagamento junto)
        should_send_automatic = (is_payment_request or current_action != 'none') and not (is_thank_you and not is_payment_request)
        
        if should_send_automatic:
            
            # CASO 2: Envio de fatura (Vencida única ou Aberta)
            if current_action == 'send_invoice' and selected_invoice:
                
                # Montar dados de pagamento
                payment_data = {
                    'codigoPix': selected_invoice.get('codigoPix', ''),
                    'linhaDigitavel': selected_invoice.get('linhaDigitavel', ''),
                }
                
                # Gerar QR Code Base64 se houver codigoPix
                if payment_data['codigoPix']:
                    qr_b64 = generate_qr_base64(payment_data['codigoPix'].strip())
                    if qr_b64:
                        payment_data['qrcode_base64'] = qr_b64
                        print("DEBUG: QR Code Base64 gerado com sucesso.")

                print(f"DEBUG: Enviando codigoPix para frontend: '{payment_data['codigoPix']}'")
                
                # Formatar dados para mensagem
                vencimento = selected_invoice.get('dataVencimento', '')
                try:
                    parts = vencimento.split('-')
                    if len(parts) == 3:
                        vencimento = f"{parts[2]}/{parts[1]}/{parts[0]}"
                except:
                    pass
                
                valor = selected_invoice.get('valor', 0)
                fatura_id = selected_invoice.get('id', '')
                
                # Personalização do nome
                client_first_name = 'Cliente'
                if user and user.name:
                    try:
                        client_first_name = user.name.split()[0].title()
                    except:
                        pass
                
                # Determinar tipo de fatura para o texto
                tipo_fatura = "vencida" if selected_invoice['status'] == 'overdue' else "em aberto"
                
                # Sequência de mensagens conforme script
                messages_to_send = [
                    {'text': f"💳 Sua fatura {tipo_fatura}:\n\nFatura ID: {fatura_id}\nVencimento: {vencimento}\nValor: R$ {valor:.2f}"},
                    {'text': "Segue seu QRcode PIX para pagamento."},
                    {'text': "Aqui está:", 'payment_data': payment_data}, # Card com QR Code
                ]
                
                # Adicionar Código Pix em texto se disponível (conforme script)
                # if payment_data['codigoPix']:
                #      messages_to_send.append({'text': payment_data['codigoPix'], 'is_code': True})

                # Mensagem de encerramento padrão
                closing_msg = "Tem mais alguma coisa em que eu possa ajudar?"
                
                messages_to_send.append({'text': closing_msg})

            # CASO 3: Sem pendências (apenas se usuário perguntou sobre faturas)
            elif current_action == 'none' and is_payment_request:
                 messages_to_send = [
                    {'text': "Parabéns, você não possui faturas vencidas ou em aberto no momento. 😊"},
                    {'text': "Tem mais alguma coisa em que eu possa ajudar?"}
                ]

        # Se não caiu em nenhuma lógica automática, usa a resposta da IA normal
        if not messages_to_send:
            # Verifica se a IA usou o delimitador especial para separar mensagens
            if "|||" in ai_response_text:
                parts = [p.strip() for p in ai_response_text.split('|||') if p.strip()]
                if parts:
                    messages_to_send = parts
            
            # Se não, aplica lógica para dividir mensagens muito longas em partes menores
            if not messages_to_send and len(ai_response_text) > 300:
                # Tenta dividir por quebras de linha duplas (parágrafos)
                parts = [p.strip() for p in ai_response_text.split('\n\n') if p.strip()]
                if len(parts) > 1:
                    messages_to_send = parts
                else:
                    # Se não houver parágrafos, divide por frases ou simplesmente corta ao meio
                    messages_to_send = [ai_response_text[:len(ai_response_text)//2], ai_response_text[len(ai_response_text)//2:]]
            else:
                messages_to_send = [ai_response_text]

        return Response({
            'session_id': session.id,
            'response': ai_response_text,
            'messages': messages_to_send, # Enviamos a lista para o app mobile
            'telemetry_analyzed': last_telemetry is not None,
            'payment_data': payment_data,  # Dados de pagamento para o frontend
            'action': current_action # Flag para frontend saber se deve transferir ou encerrar
        })

    except Exception as e:
        print(f"Erro Gemini: {e}")
        return Response({'error': 'Erro ao processar conversa com a IA'}, status=500)
