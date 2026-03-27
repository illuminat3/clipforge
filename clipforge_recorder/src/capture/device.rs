use windows::{
    core::*,
    Win32::Foundation::HMODULE,
    Win32::Graphics::Direct3D::D3D_DRIVER_TYPE_HARDWARE,
    Win32::Graphics::Direct3D11::*,
    Win32::Graphics::Dxgi::*,
};

use super::frame::CapturedFrame;

pub struct CaptureDevice {
    device: ID3D11Device,
    context: ID3D11DeviceContext,
    duplication: IDXGIOutputDuplication,
    pub width: u32,
    pub height: u32,
}

impl CaptureDevice {
    pub fn new(monitor_index: u32) -> Result<Self> {
        unsafe {
            let mut device: Option<ID3D11Device> = None;
            let mut context: Option<ID3D11DeviceContext> = None;

            D3D11CreateDevice(
                None,
                D3D_DRIVER_TYPE_HARDWARE,
                HMODULE::default(),
                D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                None,
                D3D11_SDK_VERSION,
                Some(&mut device),
                None,
                Some(&mut context),
            )?;

            let device = device.unwrap();
            let context = context.unwrap();

            let dxgi_device: IDXGIDevice = device.cast()?;
            let adapter = dxgi_device.GetAdapter()?;
            let output = adapter.EnumOutputs(monitor_index)?;

            let mut output_desc = DXGI_OUTPUT_DESC::default();
            output.GetDesc(&mut output_desc)?;
            let rect = output_desc.DesktopCoordinates;
            let width = (rect.right - rect.left) as u32;
            let height = (rect.bottom - rect.top) as u32;

            let output1: IDXGIOutput1 = output.cast()?;
            let duplication = output1.DuplicateOutput(&device)?;

            Ok(Self { device, context, duplication, width, height })
        }
    }

    pub fn capture_frame(&self, timeout_ms: u32) -> Result<Option<CapturedFrame>> {
        unsafe {
            let mut frame_info = DXGI_OUTDUPL_FRAME_INFO::default();
            let mut desktop_resource: Option<IDXGIResource> = None;

            match self
                .duplication
                .AcquireNextFrame(timeout_ms, &mut frame_info, &mut desktop_resource)
            {
                Ok(()) => {}
                Err(e) if e.code() == DXGI_ERROR_WAIT_TIMEOUT => return Ok(None),
                Err(e) => return Err(e),
            }

            let desktop_resource = desktop_resource.unwrap();
            let desktop_texture: ID3D11Texture2D = desktop_resource.cast()?;

            let mut desc = D3D11_TEXTURE2D_DESC::default();
            desktop_texture.GetDesc(&mut desc);
            desc.Usage = D3D11_USAGE_STAGING;
            desc.BindFlags = D3D11_BIND_FLAG(0);
            desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
            desc.MiscFlags = D3D11_RESOURCE_MISC_FLAG(0);
            desc.MipLevels = 1;
            desc.ArraySize = 1;
            desc.SampleDesc.Count = 1;
            desc.SampleDesc.Quality = 0;

            let mut staging: Option<ID3D11Texture2D> = None;
            self.device.CreateTexture2D(&desc, None, Some(&mut staging))?;
            let staging = staging.unwrap();

            self.context.CopyResource(&staging, &desktop_texture);
            self.duplication.ReleaseFrame()?;

            Ok(Some(CapturedFrame {
                texture: staging,
                width: self.width,
                height: self.height,
                timestamp: frame_info.LastPresentTime.QuadPart,
            }))
        }
    }
}
