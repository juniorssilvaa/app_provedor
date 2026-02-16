import requests
import json
import urllib.parse
import logging
from urllib.parse import urlparse, urlunparse

logger = logging.getLogger(__name__)

class GenieACSService:
    def __init__(self):
        self.base_url = None
        self.nbi_url = None
        self.auth = None
        self.last_error = None

        try:
            from core.models import Provider
            provider = Provider.objects.filter(is_active=True).first()
            if provider:
                if provider.genieacs_url:
                    self.base_url = provider.genieacs_url.rstrip('/')
                if provider.genieacs_user and provider.genieacs_password:
                    self.auth = (provider.genieacs_user, provider.genieacs_password)

            if self.base_url:
                self.nbi_url = self._derive_nbi_url(self.base_url)
            
            if not self.base_url or not self.auth:
                logger.warning("GenieACS credentials not configured in Provider settings.")
                
        except Exception as e:
            logger.error(f"Failed to load GenieACS config from DB: {e}") 

    def _derive_nbi_url(self, configured_url):
        try:
            parsed = urlparse(configured_url)
            scheme = parsed.scheme or 'http'
            hostname = parsed.hostname
            if not hostname:
                return configured_url.rstrip('/')

            # 🚨 REGRA DE OURO DO USUÁRIO: API SEMPRE NA PORTA 7557 🚨
            # A porta 7547 é EXCLUSIVA para TR-069 (CWMP) e não aceita requisições de API (retorna 405).
            # Independentemente do que estiver configurado no banco, forçamos 7557 para a API.
            target_port = 7557

            netloc = f"{hostname}:{target_port}"
            return urlunparse((scheme, netloc, '', '', '', '')).rstrip('/')
        except Exception:
            # Fallback seguro, mas provavelmente falhará se não tiver porta
            return configured_url.rstrip('/')

    def _set_last_error(self, kind, message, status_code=None):
        self.last_error = {
            'kind': kind,
            'message': message,
            'status_code': status_code,
            'base_url': self.base_url,
            'nbi_url': self.nbi_url
        }

    def find_device_by_pppoe(self, pppoe_username):
        """
        Encontra um dispositivo pelo usuário PPPoE.
        Retorna o ID do dispositivo ou None.
        Usa query TR-098 padrão validada.
        """
        if not pppoe_username:
            return None
            
        # Query validada pelo usuário:
        # InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username._value
        
        query = {
            "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username._value": pppoe_username
        }
        
        # Tentar busca direta (WANConnectionDevice.1)
        device_id = self._query_device(query)
        if device_id:
            return device_id
            
        # Tentar busca em WANConnectionDevice.2 (Comum em alguns modelos Huawei/ZTE)
        query_v2 = {
            "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username._value": pppoe_username
        }
        device_id = self._query_device(query_v2)
        if device_id:
            return device_id

        # Se falhar e tiver @, tentar apenas a parte do usuário (fallback comum)
        if '@' in pppoe_username:
            user_part = pppoe_username.split('@')[0]
            query_short = {
                "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username._value": user_part
            }
            device_id = self._query_device(query_short)
            if device_id:
                return device_id

            # Short match em WANConnectionDevice.2
            query_short_v2 = {
                "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username._value": user_part
            }
            device_id = self._query_device(query_short_v2)
            if device_id:
                return device_id

        return None

    def _query_device(self, query_dict):
        try:
            # Adicionar sort por _lastInform descrescente para pegar o mais recente
            encoded_query = urllib.parse.quote(json.dumps(query_dict))
            
            # sort=-_lastInform via string causava 400. Usar JSON object encoded.
            sort_dict = {"_lastInform": -1}
            encoded_sort = urllib.parse.quote(json.dumps(sort_dict))
            
            url = f"{self.nbi_url}/devices/?query={encoded_query}&sort={encoded_sort}&limit=1"
            
            try:
                response = requests.get(url, auth=self.auth, timeout=10)
            except requests.exceptions.ConnectionError:
                msg = f"FALHA DE CONEXÃO: Não foi possível conectar ao GenieACS em {self.nbi_url or self.base_url}."
                self._set_last_error('connection', msg)
                logger.error(msg)
                return None
            
            if response.status_code == 200:
                devices = response.json()
                if devices:
                    return devices[0].get('_id')
            elif response.status_code == 405:
                msg = f"ERRO 405 (Method Not Allowed) em {url}. Porta TR-069 (CWMP) não é API."
                self._set_last_error('cwmp_port', msg, status_code=405)
                logger.error(msg)
            else:
                msg = f"Erro na API GenieACS: {response.status_code} - {response.text}"
                self._set_last_error('http_error', msg, status_code=response.status_code)
                logger.error(msg)
                
            return None
        except Exception as e:
            self._set_last_error('exception', f"Error querying GenieACS: {e}")
            logger.error(f"Error querying GenieACS: {e}")
            return None

    def get_wifi_config(self, device_id):
        """
        Retorna configurações de Wi-Fi (SSID, Senha) para 2.4G e 5G.
        Retorna dicionário plano: ssid_2g, password_2g, ssid_5g, password_5g
        """
        # O device_id deve ser passado em seu formato RAW (exatamente como no DB/GenieACS).
        # Não fazemos unquote aqui pois o ID pode conter caracteres como %2D que fazem parte do ID.
        
        query = {"_id": device_id}
        encoded_query = urllib.parse.quote(json.dumps(query))
        # Solicitar apenas os campos necessários para reduzir carga e garantir dados
        projection = "InternetGatewayDevice.LANDevice.1.WLANConfiguration,InternetGatewayDevice.DeviceInfo.ModelName,InternetGatewayDevice.DeviceInfo.Manufacturer"
        url = f"{self.nbi_url}/devices/?query={encoded_query}&projection={projection}"
        
        try:
            try:
                response = requests.get(url, auth=self.auth, timeout=10)
            except requests.exceptions.ConnectionError:
                msg = f"FALHA DE CONEXÃO ao buscar config Wi-Fi em {self.nbi_url or self.base_url}"
                self._set_last_error('connection', msg)
                logger.error(msg)
                return None

            if response.status_code == 405:
                msg = "ERRO 405 ao buscar Wi-Fi: Porta incorreta (CWMP vs API)."
                self._set_last_error('cwmp_port', msg, status_code=405)
                logger.error(msg)
                return None

            if response.status_code != 200 or not response.json():
                msg = f"Erro ao buscar Wi-Fi: {response.status_code} - {response.text}"
                self._set_last_error('http_error', msg, status_code=response.status_code)
                return None
            
            device = response.json()[0]
            igd = device.get('InternetGatewayDevice', {})
            landevice = igd.get('LANDevice', {})
            wlan_configs = landevice.get('1', {}).get('WLANConfiguration', {})
            
            device_info = igd.get('DeviceInfo', {})
            manufacturer = device_info.get('Manufacturer', {}).get('_value', '')
            model_name = device_info.get('ModelName', {}).get('_value', '')
            
            # Normalização para verificação
            manuf_check = (manufacturer or '').lower()
            model_check = (model_name or '').lower()

            is_huawei = 'huawei' in manuf_check or 'hg8145' in model_check
            is_intelbras = 'intelbras' in manuf_check

            # Inicializar resposta plana
            result = {
                'ssid_2g': None, 'password_2g': None,
                'ssid_5g': None, 'password_5g': None,
                'model': model_name or 'Desconhecido',
                'manufacturer': manufacturer or 'Desconhecido'
            }
            
            # Mapeamento Padrão
            idx_2g = '1'
            idx_5g = '5'
            
            # Configuração específica por fabricante
            if is_intelbras:
                # Intelbras: 5G no índice 1, 2.4G no índice 6 (conforme relato usuário)
                idx_2g = '6'
                idx_5g = '1'
            
            # Huawei (HG8145V5-V2) usa padrão (1=2.4, 5=5)
            # Lógica de inversão anterior removida pois causava conflito.
            
            def extract_password(wlan_obj):
                # Tentar caminho Huawei/Coliseu primeiro: PreSharedKey.1.KeyPassphrase
                psk = wlan_obj.get('PreSharedKey', {})
                if isinstance(psk, dict) and '1' in psk:
                     val = psk.get('1', {}).get('KeyPassphrase', {}).get('_value')
                     if val: return val
                
                # Tentar PreSharedKey direto (Value)
                val = wlan_obj.get('PreSharedKey', {}).get('_value')
                if val: return val

                # Tentar KeyPassphrase direto
                val = wlan_obj.get('KeyPassphrase', {}).get('_value')
                if val: return val
                
                return None

            # Leitura 2.4GHz
            wlan_2g = wlan_configs.get(idx_2g, {})
            if wlan_2g and wlan_2g.get('SSID', {}).get('_value'):
                result['ssid_2g'] = wlan_2g.get('SSID', {}).get('_value')
                result['password_2g'] = extract_password(wlan_2g)

            # Leitura 5GHz
            wlan_5g = wlan_configs.get(idx_5g, {})
            if wlan_5g and wlan_5g.get('SSID', {}).get('_value'):
                result['ssid_5g'] = wlan_5g.get('SSID', {}).get('_value')
                result['password_5g'] = extract_password(wlan_5g)
            
            return result
            
        except Exception as e:
            self._set_last_error('exception', f"Error fetching Wi-Fi config: {e}")
            logger.error(f"Error fetching Wi-Fi config: {e}")
            return None

    def change_wifi_config(self, device_id, ssid_2g=None, password_2g=None, ssid_5g=None, password_5g=None):
        """
        Altera configurações de Wi-Fi.
        Retorna True se sucesso, False caso contrário.
        """
        try:
            # 1. Obter modelo para verificar inversão de índices (Huawei)
            query = {"_id": device_id}
            encoded_query = urllib.parse.quote(json.dumps(query))
            projection = "InternetGatewayDevice.DeviceInfo.ModelName,InternetGatewayDevice.DeviceInfo.Manufacturer"
            url_info = f"{self.nbi_url}/devices/?query={encoded_query}&projection={projection}"
            
            is_huawei = False
            is_intelbras = False
            try:
                resp_info = requests.get(url_info, auth=self.auth, timeout=5)
                if resp_info.status_code == 200 and resp_info.json():
                    dev_info = resp_info.json()[0].get('InternetGatewayDevice', {}).get('DeviceInfo', {})
                    manufacturer = dev_info.get('Manufacturer', {}).get('_value', '')
                    model_name = dev_info.get('ModelName', {}).get('_value', '')
                    
                    manuf_check = (manufacturer or '').lower()
                    model_check = (model_name or '').lower()
                    
                    is_huawei = 'huawei' in manuf_check or 'hg8145' in model_check
                    is_intelbras = 'intelbras' in manuf_check
            except Exception as e:
                logger.warning(f"Failed to fetch device info for model check: {e}")

            # Mapeamento Padrão
            idx_2g = '1'
            idx_5g = '5'
            
            # Configuração específica por fabricante
            if is_intelbras:
                # Intelbras: 5G no índice 1, 2.4G no índice 6
                idx_2g = '6'
                idx_5g = '1'
            
            # Huawei usa padrão (1=2.4, 5=5), inversão removida.

            parameter_values = []
            
            # Definir caminho da senha baseado no fabricante
            # Huawei usa estrutura aninhada PreSharedKey.1.KeyPassphrase
            # Outros (Intelbras, Padrão TR-098) usam PreSharedKey ou KeyPassphrase direto
            def get_password_path(base_path_wlan):
                if is_huawei:
                    return f"{base_path_wlan}.PreSharedKey.1.KeyPassphrase"
                else:
                    # Padrão mais comum para TR-098
                    return f"{base_path_wlan}.PreSharedKey"

            if ssid_5g or password_5g:
                base_path = f"InternetGatewayDevice.LANDevice.1.WLANConfiguration.{idx_5g}"
                if ssid_5g:
                    parameter_values.append([f"{base_path}.SSID", ssid_5g, "xsd:string"])
                if password_5g:
                    parameter_values.append([get_password_path(base_path), password_5g, "xsd:string"])
                    
            if ssid_2g or password_2g:
                base_path = f"InternetGatewayDevice.LANDevice.1.WLANConfiguration.{idx_2g}"
                if ssid_2g:
                    parameter_values.append([f"{base_path}.SSID", ssid_2g, "xsd:string"])
                if password_2g:
                    parameter_values.append([get_password_path(base_path), password_2g, "xsd:string"])

            if not parameter_values:
                logger.warning("Nenhum parametro para alterar.")
                return False

            # Encode device_id for URL path to handle special characters like %2D
            # O device_id raw pode conter caracteres especiais (ex: "FOO%2DBAR").
            # Para a URL, precisamos encodar novamente para que o servidor receba "FOO%252DBAR"
            # e decodifique para "FOO%2DBAR".
            
            safe_device_id = urllib.parse.quote(device_id)
            url = f"{self.nbi_url}/devices/{safe_device_id}/tasks?timeout=3000&connection_request"
            
            payload = {
                "name": "setParameterValues",
                "parameterValues": parameter_values
            }
            
            try:
                response = requests.post(url, json=payload, auth=self.auth, timeout=30)
            except requests.exceptions.ConnectionError:
                msg = "FALHA DE CONEXÃO ao enviar comando Wi-Fi."
                self._set_last_error('connection', msg)
                logger.error(msg)
                return False

            if response.status_code == 200:
                logger.info(f"Tarefa criada com sucesso: {response.json()}")
                return True
            elif response.status_code == 405:
                msg = "ERRO 405 ao alterar Wi-Fi: Porta incorreta (CWMP detectado)."
                self._set_last_error('cwmp_port', msg, status_code=405)
                logger.error(msg)
                return False
            else:
                msg = f"Erro ao criar tarefa: {response.status_code} - {response.text}"
                self._set_last_error('http_error', msg, status_code=response.status_code)
                logger.error(msg)
                return False

        except Exception as e:
            self._set_last_error('exception', f"Erro ao alterar Wi-Fi: {e}")
            logger.error(f"Erro ao alterar Wi-Fi: {e}")
            return False

    def get_device_info(self, device_id):
        """
        Retorna informações detalhadas do dispositivo:
        - Uptime (segundos)
        - IP Externo
        - Lista de Dispositivos Conectados (Hosts/AssociatedDevices)
        """
        # Projection otimizado conforme TR-098
        projection = "InternetGatewayDevice.DeviceInfo,InternetGatewayDevice.WANDevice,InternetGatewayDevice.LANDevice"
        
        query = {"_id": device_id}
        encoded_query = urllib.parse.quote(json.dumps(query))
        url = f"{self.nbi_url}/devices/?query={encoded_query}&projection={projection}"
        
        try:
            try:
                response = requests.get(url, auth=self.auth, timeout=10)
            except requests.exceptions.ConnectionError:
                msg = f"FALHA DE CONEXÃO ao buscar dados do modem em {self.nbi_url or self.base_url}"
                self._set_last_error('connection', msg)
                logger.error(msg)
                return None

            if response.status_code == 405:
                msg = "ERRO 405 ao buscar dados do modem: Porta incorreta (CWMP vs API)."
                self._set_last_error('cwmp_port', msg, status_code=405)
                logger.error(msg)
                return None

            if response.status_code != 200 or not response.json():
                msg = f"Erro ao buscar dados do modem: {response.status_code} - {response.text}"
                self._set_last_error('http_error', msg, status_code=response.status_code)
                return None
            
            device = response.json()[0]
            igd = device.get('InternetGatewayDevice', {})
            
            # 1. Info Básica (Manufacturer, Model, Uptime)
            dev_info = igd.get('DeviceInfo', {})
            uptime = dev_info.get('UpTime', {}).get('_value', 0)
            manufacturer = dev_info.get('Manufacturer', {}).get('_value', 'Desconhecido')
            
            # Tentar Modelo em várias ordens de prioridade (TR-098)
            product_class = (
                dev_info.get('ProductClass', {}).get('_value') or 
                dev_info.get('ModelName', {}).get('_value', 'Desconhecido')
            )
            
            # 2. WAN IP (TR-098 Standard)
            wan_ip = None
            wan_device = igd.get('WANDevice', {})
            # Iterar sobre todas as interfaces WANDevice
            for _, wan_dev in wan_device.items():
                if not isinstance(wan_dev, dict): continue
                
                wan_conns = wan_dev.get('WANConnectionDevice', {})
                for _, conn in wan_conns.items():
                    if not isinstance(conn, dict): continue
                    
                    # Tentar PPP Connection (Mais comum para fibra)
                    ppp_conns = conn.get('WANPPPConnection', {})
                    for _, ppp in ppp_conns.items():
                        if not isinstance(ppp, dict): continue
                        ip = ppp.get('ExternalIPAddress', {}).get('_value')
                        if ip and ip != "0.0.0.0" and ip != "":
                            wan_ip = ip
                            break
                    if wan_ip: break
                    
                    # Tentar IP Connection (caso não seja PPPoE)
                    ip_conns = conn.get('WANIPConnection', {})
                    for _, ip_conn in ip_conns.items():
                        if not isinstance(ip_conn, dict): continue
                        ip = ip_conn.get('ExternalIPAddress', {}).get('_value')
                        if ip and ip != "0.0.0.0" and ip != "":
                            wan_ip = ip
                            break
                    if wan_ip: break
                if wan_ip: break
            
            # 3. Connected Hosts
            connected_devices = []
            lan_device = igd.get('LANDevice', {})
            lan_1 = lan_device.get('1', {})
            
            # A. Tentar via AssociatedDevice (WLANConfiguration) - Prioridade Usuário
            # Estrutura: InternetGatewayDevice.LANDevice.1.WLANConfiguration.X.AssociatedDevice
            wlan_configs = lan_1.get('WLANConfiguration', {})
            for _, wlan in wlan_configs.items():
                if not isinstance(wlan, dict): continue
                assoc_devices = wlan.get('AssociatedDevice', {})
                for _, assoc in assoc_devices.items():
                    if not isinstance(assoc, dict): continue
                    mac = assoc.get('AssociatedDeviceMACAddress', {}).get('_value')
                    ip = assoc.get('AssociatedDeviceIPAddress', {}).get('_value')
                    
                    if mac:
                        connected_devices.append({
                            'mac': mac,
                            'ip': ip,
                            'hostname': "Wi-Fi Device" # AssociatedDevice geralmente não tem Hostname
                        })

            # B. Se lista vazia ou complementar, tentar Hosts (Standard TR-098)
            # Mas vamos evitar duplicatas se já tivermos achado pelo AssociatedDevice
            if not connected_devices:
                hosts = lan_1.get('Hosts', {}).get('Host', {})
                if hosts:
                    for _, host in hosts.items():
                        if not isinstance(host, dict): continue
                        if host.get('Active', {}).get('_value'):
                            connected_devices.append({
                                'mac': host.get('MACAddress', {}).get('_value'),
                                'ip': host.get('IPAddress', {}).get('_value'),
                                'hostname': host.get('HostName', {}).get('_value') or "LAN Device"
                            })
            
            return {
                'manufacturer': manufacturer,
                'product_class': product_class,
                'uptime': uptime,
                'external_ip': wan_ip,
                'connected_devices': connected_devices,
                'connected_count': len(connected_devices)
            }
            
        except Exception as e:
            self._set_last_error('exception', f"Error fetching device info: {e}")
            logger.error(f"Error fetching device info: {e}")
            return None
            
        except Exception as e:
            self._set_last_error('exception', f"Error fetching device info: {e}")
            logger.error(f"Error fetching device info: {e}")
            return None
