import 'package:flutter/material.dart';

class DarkTheme {
  static ThemeData get theme {
    const primaryColor = Color(0xFF3B82F6);
    const backgroundColor = Color(0xFF0F172A);
    const surfaceColor = Color(0xFF1E293B);

    return ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,

      colorScheme: const ColorScheme.dark(
        primary: primaryColor,
        secondary: Color(0xFF60A5FA),
        surface: surfaceColor,
        error: Colors.redAccent,
      ),

      scaffoldBackgroundColor: backgroundColor,

      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),

      cardTheme: CardThemeData(
        color: surfaceColor,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
