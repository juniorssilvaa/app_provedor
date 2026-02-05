import 'package:flutter/material.dart';

class PlanosScreen extends StatelessWidget {
  const PlanosScreen({super.key});

  final Color primaryRed = const Color(0xFFFF0000);
  final Color cardBg = const Color(0xFF111111);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: cardBg,
        title: const Text('Planos Disponíveis', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPlanCard(
            context,
            name: 'PLANO GAMER',
            speed: '1000',
            price: '149,90',
            features: ['Fibra Óptica Real', 'IP Fixo Disponível', 'Suporte VIP 24h', 'Instalação Grátis'],
            isBestSeller: true,
          ),
          _buildPlanCard(
            context,
            name: 'PLANO ULTRA',
            speed: '600',
            price: '99,90',
            features: ['Fibra Óptica', 'Wi-Fi 6 Incluso', 'Suporte 24h'],
          ),
          _buildPlanCard(
            context,
            name: 'PLANO HOME',
            speed: '300',
            price: '79,90',
            features: ['Fibra Óptica', 'Wi-Fi Dual Band', 'Suporte 24h'],
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCard(
    BuildContext context, {
    required String name,
    required String speed,
    required String price,
    required List<String> features,
    bool isBestSeller = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
        border: isBestSeller ? Border.all(color: primaryRed, width: 2) : Border.all(color: Colors.white10),
      ),
      child: Stack(
        children: [
          if (isBestSeller)
            Positioned(
              top: 0,
              right: 24,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: primaryRed,
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(8)),
                ),
                child: const Text(
                  'MAIS VENDIDO',
                  style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: TextStyle(color: isBestSeller ? primaryRed : Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(speed, style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.black)),
                    const Padding(
                      padding: EdgeInsets.only(bottom: 12, left: 4),
                      child: Text('MEGA', style: TextStyle(color: Colors.white70, fontSize: 18, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const Divider(color: Colors.white10, height: 32),
                ...features.map((f) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Icon(Icons.check_circle, color: primaryRed, size: 16),
                      const SizedBox(width: 8),
                      Text(f, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                )),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('APENAS', style: TextStyle(color: Colors.grey, fontSize: 10)),
                        Text('R\$ $price', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                        const Text('/mês', style: TextStyle(color: Colors.grey, fontSize: 10)),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isBestSeller ? primaryRed : Colors.white,
                        foregroundColor: isBestSeller ? Colors.white : Colors.black,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                      child: const Text('ASSINAR', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
