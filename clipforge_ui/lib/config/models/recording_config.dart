class RecordingConfig {
  int fps;
  int bufferSeconds;
  int bitrateKbps;

  RecordingConfig({
    this.fps = 60,
    this.bufferSeconds = 300,
    this.bitrateKbps = 16000,
  });

  Map<String, dynamic> toJson() {
    return {
      'fps': fps,
      'bufferSeconds': bufferSeconds,
      'bitrateKbps': bitrateKbps,
    };
  }

  factory RecordingConfig.fromJson(Map<String, dynamic> json) {
    return RecordingConfig(
      fps: json['fps'] ?? 60,
      bufferSeconds: json['bufferSeconds'] ?? 300,
      bitrateKbps: json['bitrateKbps'] ?? 16000,
    );
  }
}
