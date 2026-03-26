use serde::Deserialize;

use super::ConfigLoader;

#[derive(Deserialize, Debug)]
pub struct HotkeysConfig {
    pub clip: String,
    pub record: String,
}

impl HotkeysConfig {
    pub fn load() -> anyhow::Result<Self> {
        ConfigLoader::load("hotkeys")
    }
}
