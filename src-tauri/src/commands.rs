use image::GenericImageView;
use serde::Serialize;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
pub struct ImageMetadata {
    pub width: u32,
    pub height: u32,
    pub size: u64,
}

#[tauri::command]
pub fn get_image_metadata(path: String) -> Result<ImageMetadata, String> {
    let img = image::open(&path).map_err(|e| e.to_string())?;
    let dimensions = img.dimensions();
    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;

    Ok(ImageMetadata {
        width: dimensions.0,
        height: dimensions.1,
        size: metadata.len(),
    })
}
