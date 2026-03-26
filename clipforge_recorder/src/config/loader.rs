use anyhow::Context;
use serde::de::DeserializeOwned;
use std::fs;
use std::path::PathBuf;

pub struct ConfigLoader;

impl ConfigLoader {
    pub fn load<T>(config_name: &str) -> anyhow::Result<T>
    where
        T: DeserializeOwned,
    {
        let config_path = Self::config_path(config_name)?;
        let content = fs::read_to_string(&config_path)
            .with_context(|| format!("Failed to read config at {}", config_path.display()))?;

        Ok(toml::from_str(&content)
            .with_context(|| format!("Failed to parse TOML at {}", config_path.display()))?)
    }

    fn config_path(config_name: &str) -> anyhow::Result<PathBuf> {
        let file_name = if config_name.ends_with(".toml") {
            config_name.to_owned()
        } else {
            format!("{config_name}.toml")
        };

        Ok(PathBuf::from(
            std::env::var("LOCALAPPDATA").context("LOCALAPPDATA is not set")?,
        )
        .join("clipforge")
        .join("config")
        .join(file_name))
    }
}
