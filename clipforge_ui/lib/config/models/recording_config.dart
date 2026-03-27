class RecordingConfig {
  int fps;
  int bufferSeconds;
  int chunkSizeSeconds;
  int bitrateKbps;
  int monitorIndex;

  RecordingConfig({
    this.fps = 60,
    this.bufferSeconds = 300,
    this.chunkSizeSeconds = 5,
    this.bitrateKbps = 16000,
    this.monitorIndex = 0,
  });

  Map<String, dynamic> toJson() {
    return {
      'fps': fps,
      'bufferSeconds': bufferSeconds,
      'chunkSizeSeconds': chunkSizeSeconds,
      'bitrateKbps': bitrateKbps,
      'monitorIndex': monitorIndex,
    };
  }

  factory RecordingConfig.fromJson(Map<String, dynamic> json) {
    return RecordingConfig(
      fps: json['fps'] ?? 60,
      bufferSeconds: json['bufferSeconds'] ?? 300,
      chunkSizeSeconds: json['chunkSizeSeconds'] ?? 5,
      bitrateKbps: json['bitrateKbps'] ?? 16000,
      monitorIndex: json['monitorIndex'] ?? 0,
    );
  }
}
