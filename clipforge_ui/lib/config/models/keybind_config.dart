class KeybindConfig {
  static const String defaultClipKeybind = 'F8';
  static const String defaultRecordKeybind = 'F9';

  String clipKeybind;
  String recordKeybind;

  KeybindConfig({String? clipKeybind, String? recordKeybind})
    : clipKeybind = clipKeybind ?? defaultClipKeybind,
      recordKeybind = recordKeybind ?? defaultRecordKeybind;

  Map<String, dynamic> toJson() {
    return {'clipKeybind': clipKeybind, 'recordKeybind': recordKeybind};
  }

  factory KeybindConfig.fromJson(Map<String, dynamic> json) {
    return KeybindConfig(
      clipKeybind: json['clipKeybind'],
      recordKeybind: json['recordKeybind'],
    );
  }
}
