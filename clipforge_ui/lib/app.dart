import 'package:clipforge_ui/config/models/config.dart';
import 'package:clipforge_ui/theme/theme.dart';
import 'package:flutter/material.dart';

class App extends StatelessWidget {
  final Config config;

  const App({super.key, required this.config});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,

      theme: LightTheme.theme,
      darkTheme: DarkTheme.theme,
      themeMode: config.themeConfig.themeMode,

      home: const Scaffold(body: Center(child: Text('ClipForge Bootstrapped'))),
    );
  }
}
