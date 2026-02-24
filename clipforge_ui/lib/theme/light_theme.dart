import 'package:flutter/material.dart';

class LightTheme {
  static ThemeData get theme {
    const primaryColor = Color(0xFF2563EB);
    const backgroundColor = Color(0xFFF5F7FA);
    const surfaceColor = Colors.white;

    return ThemeData(
      brightness: Brightness.light,
      useMaterial3: true,

      colorScheme: const ColorScheme.light(
        primary: primaryColor,
        secondary: Color(0xFF60A5FA),
        surface: surfaceColor,
        error: Colors.red,
      ),

      scaffoldBackgroundColor: backgroundColor,

      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceColor,
        foregroundColor: Colors.black,
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
