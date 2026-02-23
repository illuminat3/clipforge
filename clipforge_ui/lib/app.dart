import 'package:flutter/material.dart';
import 'config/config_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final configService = ConfigService();
  final config = await configService.load();

  debugPrint('Config loaded:');
  debugPrint(config.toJson().toString());
  await configService.save(config);
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(body: Center(child: Text('ClipForge Bootstrapped'))),
    );
  }
}
