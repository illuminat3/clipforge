use serde::Deserialize;

use super::ConfigLoader;

#[derive(Deserialize, Debug)]
pub struct StorageConfig {
    pub storage_path: String,
    pub buffer_path: String,
}

impl StorageConfig {
    pub fn load() -> anyhow::Result<Self> {
        ConfigLoader::load("storage")
    }
}
