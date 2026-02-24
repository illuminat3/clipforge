import 'package:clipforge_ui/config/models/keybind_config.dart';
import 'package:clipforge_ui/config/models/recording_config.dart';
import 'package:clipforge_ui/config/models/storage_config.dart';
import 'package:clipforge_ui/config/models/theme_config.dart';

class Config {
  RecordingConfig recordingConfig;
  StorageConfig storageConfig;
  KeybindConfig keybindConfig;
  ThemeConfig themeConfig;

  Config({
    required this.recordingConfig,
    required this.storageConfig,
    required this.keybindConfig,
    required this.themeConfig,
  });

  Config.defaults()
    : recordingConfig = RecordingConfig(),
      storageConfig = StorageConfig(),
      keybindConfig = KeybindConfig(),
      themeConfig = ThemeConfig();

  Map<String, dynamic> toJson() {
    return {
      'recordingConfig': recordingConfig.toJson(),
      'storageConfig': storageConfig.toJson(),
      'keybindConfig': keybindConfig.toJson(),
      'themeConfig': themeConfig.toJson(),
    };
  }

  factory Config.fromJson(Map<String, dynamic> json) {
    return Config(
      recordingConfig: RecordingConfig.fromJson(
        (json['recordingConfig'] ?? {}) as Map<String, dynamic>,
      ),
      storageConfig: StorageConfig.fromJson(
        (json['storageConfig'] ?? {}) as Map<String, dynamic>,
      ),
      keybindConfig: KeybindConfig.fromJson(
        (json['keybindConfig'] ?? {}) as Map<String, dynamic>,
      ),
      themeConfig: ThemeConfig.fromJson(
        (json['themeConfig'] ?? {}) as Map<String, dynamic>,
      ),
    );
  }
}
