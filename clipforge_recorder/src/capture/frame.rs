use windows::Win32::Graphics::Direct3D11::ID3D11Texture2D;

pub struct CapturedFrame {
    pub texture: ID3D11Texture2D,
    pub width: u32,
    pub height: u32,
    pub timestamp: i64,
}
