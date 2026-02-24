import 'package:flutter/material.dart';

class ThemeConfig {
  final ThemeMode themeMode;

  ThemeConfig({this.themeMode = ThemeMode.system});

  Map<String, dynamic> toJson() {
    return {'themeMode': themeMode.name};
  }

  factory ThemeConfig.fromJson(Map<String, dynamic> json) {
    return ThemeConfig(
      themeMode: ThemeMode.values.firstWhere(
        (e) => e.name == json['themeMode'],
        orElse: () => ThemeMode.system,
      ),
    );
  }
}
