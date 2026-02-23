import 'package:clipforge_ui/config/models/keybind_config.dart';
import 'package:clipforge_ui/config/models/recording_config.dart';
import 'package:clipforge_ui/config/models/storage_config.dart';

class Config {
  RecordingConfig recordingConfig;
  StorageConfig storageConfig;
  KeybindConfig keybindConfig;

  Config({
    required this.recordingConfig,
    required this.storageConfig,
    required this.keybindConfig,
  });

  Config.defaults()
    : recordingConfig = RecordingConfig(),
      storageConfig = StorageConfig(),
      keybindConfig = KeybindConfig();

  Map<String, dynamic> toJson() {
    return {
      'recordingConfig': recordingConfig.toJson(),
      'storageConfig': storageConfig.toJson(),
      'keybindConfig': keybindConfig.toJson(),
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
    );
  }
}
