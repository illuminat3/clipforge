use windows::{
    core::*,
    Win32::Graphics::Dxgi::*,
    Win32::Graphics::Direct3D11::*,
};

pub struct Capture {
    device: ID3D11Device,
    context: ID3D11DeviceContext,
    duplication: IDXGIOutputDuplication,
}

impl Capture {
    pub fn new() -> Result<Self> {
        unsafe {
            let mut device = None;
            let mut context = None;

            D3D11CreateDevice(
                None,
                D3D_DRIVER_TYPE_HARDWARE,
                None,
                D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                std::ptr::null(),
                0,
                D3D11_SDK_VERSION,
                &mut device,
                std::ptr::null_mut(),
                &mut context,
            )?;

            let device = device.unwrap();
            let context = context.unwrap();

            // TODO: get IDXGIOutputDuplication (adapter → output → duplicate)

            unimplemented!("DXGI duplication setup");
        }
    }

    pub fn capture_frame(&self) {
        // AcquireNextFrame
        // Copy resource
        // Map to CPU or pass to encoder
    }
}