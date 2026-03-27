use std::fs;
use std::path::Path;

pub fn cleanup_buffer(buffer_path: &str, max_chunks: usize) -> anyhow::Result<()> {
    let path = Path::new(buffer_path);
    if !path.exists() {
        return Ok(());
    }

    let mut chunks: Vec<_> = fs::read_dir(path)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "bin"))
        .collect();

    if chunks.len() <= max_chunks {
        return Ok(());
    }

    chunks.sort_by_key(|e| e.file_name());
    let to_delete = chunks.len() - max_chunks;
    for entry in chunks.iter().take(to_delete) {
        fs::remove_file(entry.path())?;
    }

    Ok(())
}
