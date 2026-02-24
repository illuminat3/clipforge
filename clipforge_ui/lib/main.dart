import 'package:clipforge_ui/app.dart';
import 'package:clipforge_ui/config/config_service.dart';
import 'package:flutter/material.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final configService = ConfigService();
  final config = await configService.load();
  await configService.save(config);
  debugPrint('Config loaded:');
  debugPrint(config.toJson().toString());

  runApp(App(config: config));
}
