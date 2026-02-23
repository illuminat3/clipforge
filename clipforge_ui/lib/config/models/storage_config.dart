class StorageConfig {
  String storagePath;
  String bufferPath;

  static const defaultStoragePath = r'D:\Clips\ClipForge';
  static const defaultBufferPath = r'D:\Clips\ClipForge\.buffer';

  StorageConfig({String? storagePath, String? bufferPath})
    : storagePath = storagePath ?? defaultStoragePath,
      bufferPath = bufferPath ?? defaultBufferPath;

  Map<String, dynamic> toJson() {
    return {'storagePath': storagePath, 'bufferPath': bufferPath};
  }

  factory StorageConfig.fromJson(Map<String, dynamic> json) {
    return StorageConfig(
      storagePath: json['storagePath'] ?? defaultStoragePath,
      bufferPath: json['bufferPath'] ?? defaultBufferPath,
    );
  }
}
