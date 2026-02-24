import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';

import 'models/config.dart';

class ConfigService {
  static const String _folderName = 'ClipForge';
  static const String _fileName = 'config.json';

  Future<File> _getConfigFile() async {
    final appSupport = await getApplicationSupportDirectory();
    final roamingDir = appSupport.parent;
    final dir = Directory('${roamingDir.path}\\$_folderName');

    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }

    return File('${dir.path}\\$_fileName');
  }

  Future<Config> load() async {
    final file = await _getConfigFile();

    if (!await file.exists()) {
      final defaults = Config.defaults();
      await save(defaults);
      return defaults;
    }

    try {
      final text = await file.readAsString();
      final decoded = jsonDecode(text);

      if (decoded is Map) {
        return Config.fromJson(decoded.cast<String, dynamic>());
      }
    } catch (_) {}

    final defaults = Config.defaults();
    await save(defaults);
    return defaults;
  }

  Future<void> save(Config config) async {
    final file = await _getConfigFile();
    final jsonString = const JsonEncoder.withIndent(
      '  ',
    ).convert(config.toJson());
    await file.writeAsString(jsonString, flush: true);
  }
}
