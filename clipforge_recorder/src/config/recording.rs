use serde::Deserialize;

use super::ConfigLoader;

#[derive(Deserialize, Debug, Clone)]
pub struct RecordingConfig {
    pub fps: u32,
    pub bitrate_kbps: u32,
    pub buffer_seconds: u32,
    pub chunk_size_seconds: u32,
    pub monitor_index: u32,
}

impl RecordingConfig {
    pub fn load() -> anyhow::Result<Self> {
        ConfigLoader::load("recording")
    }
}
