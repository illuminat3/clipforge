mod cleanup;
mod device;
mod frame;

use cleanup::cleanup_buffer;
use device::CaptureDevice;

use crate::config::{RecordingConfig, StorageConfig};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::thread::{self, JoinHandle};

pub struct Capture {
    recording_config: RecordingConfig,
    storage_config: StorageConfig,
    stop_signal: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl Capture {
    pub fn new(recording_config: RecordingConfig, storage_config: StorageConfig) -> Self {
        Self {
            recording_config,
            storage_config,
            stop_signal: Arc::new(AtomicBool::new(false)),
            thread: None,
        }
    }

    pub fn start(&mut self) -> anyhow::Result<()> {
        if self.thread.is_some() {
            return Ok(());
        }

        self.stop_signal.store(false, Ordering::Relaxed);

        let stop = Arc::clone(&self.stop_signal);
        let recording = self.recording_config.clone();
        let storage = self.storage_config.clone();

        let handle = thread::spawn(move || {
            if let Err(e) = run_capture_loop(stop, recording, storage) {
                eprintln!("Capture loop error: {e}");
            }
        });

        self.thread = Some(handle);
        Ok(())
    }

    pub fn stop(&mut self) {
        self.stop_signal.store(true, Ordering::Relaxed);
        if let Some(handle) = self.thread.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for Capture {
    fn drop(&mut self) {
        self.stop();
    }
}

fn run_capture_loop(
    stop: Arc<AtomicBool>,
    recording: RecordingConfig,
    storage: StorageConfig,
) -> anyhow::Result<()> {
    let device = CaptureDevice::new(recording.monitor_index)?;
    let frames_per_chunk = recording.fps * recording.chunk_size_seconds;
    let max_chunks = (recording.buffer_seconds / recording.chunk_size_seconds) as usize;
    let timeout_ms = 1000 / recording.fps;

    std::fs::create_dir_all(&storage.buffer_path)?;

    let mut chunk_frame_count: u32 = 0;
    let mut chunk_start_ts: Option<i64> = None;

    while !stop.load(Ordering::Relaxed) {
        match device.capture_frame(timeout_ms) {
            Ok(Some(frame)) => {
                if chunk_start_ts.is_none() {
                    chunk_start_ts = Some(frame.timestamp);
                }
                chunk_frame_count += 1;

                if chunk_frame_count >= frames_per_chunk {
                    let ts = chunk_start_ts.unwrap_or(frame.timestamp);
                    let chunk_path = std::path::Path::new(&storage.buffer_path)
                        .join(format!("chunk_{ts:020}.bin"));

                    // TODO: encode accumulated frames and write to chunk_path
                    let _ = chunk_path;

                    cleanup_buffer(&storage.buffer_path, max_chunks)?;
                    chunk_frame_count = 0;
                    chunk_start_ts = None;
                }
            }
            Ok(None) => {}
            Err(e) => return Err(anyhow::anyhow!(e)),
        }
    }

    Ok(())
}
