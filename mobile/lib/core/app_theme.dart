import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: const Color(0xFF0073B7),
      scaffoldBackgroundColor: const Color(0xFFF5F5F5),
      useMaterial3: true,
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF0073B7),
        secondary: Color(0xFF004C8C),
        surface: Colors.white,
        error: Color(0xFFB00020),
        onPrimary: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF0073B7),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF0073B7),
      scaffoldBackgroundColor: const Color(0xFF000000),
      useMaterial3: true,
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF0073B7),
        secondary: Color(0xFF004C8C),
        surface: Color(0xFF111111),
        error: Color(0xFFCF6679),
        onPrimary: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF0073B7),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
    );
  }
}
