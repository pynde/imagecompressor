use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::path::Path;

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

/// Output format options for saved images
#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    /// Keep the original format (PNG stays PNG, JPEG stays JPEG)
    KeepOriginal,
    /// Convert to PNG format
    Png,
    /// Convert to JPEG format
    Jpeg,
    /// Convert to WebP format (modern, efficient compression)
    Webp,
}

#[derive(Deserialize)]
pub struct ImageToSave {
    pub path: String,
    pub destination_path: String, // Full absolute path including filename
    pub target_width: u32,
    pub target_height: u32,
    /// Output format for this image
    pub output_format: OutputFormat,
    /// Quality setting (1-100)
    /// - 100 = lossless (no quality loss, larger file)
    /// - 75-99 = high quality, good compression (recommended)
    /// - 50-74 = medium quality, significant compression
    /// - 1-49 = low quality, maximum compression
    /// Only applies to JPEG and WebP formats
    pub quality: u8,
}

#[derive(Serialize)]
pub struct SaveResult {
    pub success: bool,
    pub saved_count: usize,
}

#[tauri::command]
pub fn save_images(
    images: Vec<ImageToSave>,
) -> Result<SaveResult, String> {
    let mut saved_count = 0;
    
    for image_info in images {
        // STEP 1: Open and decode the source image
        let img = image::open(&image_info.path).map_err(|e| e.to_string())?;
        
        // STEP 2: Resize the image
        let resized = img.resize_exact(
            image_info.target_width,
            image_info.target_height,
            image::imageops::FilterType::Lanczos3,
        );
        
        let dest_file_path = Path::new(&image_info.destination_path);
        
        // Ensure parent directory exists
        if let Some(parent) = dest_file_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        
        // STEP 3: Encode and save based on format
        match &image_info.output_format {
            OutputFormat::Webp => {
                let rgba_image = resized.to_rgba8();
                let (width, height) = rgba_image.dimensions();
                
                let encoder = webp::Encoder::from_rgba(
                    rgba_image.as_raw(),
                    width,
                    height
                );
                
                let webp_data = if image_info.quality == 100 {
                    encoder.encode_lossless()
                } else {
                    encoder.encode(image_info.quality as f32)
                };
                
                std::fs::write(&dest_file_path, &*webp_data).map_err(|e| e.to_string())?;
            }
            
            OutputFormat::KeepOriginal | OutputFormat::Png | OutputFormat::Jpeg => {
                resized.save(&dest_file_path).map_err(|e| e.to_string())?;
            }
        }
        
        saved_count += 1;
    }
    
    Ok(SaveResult {
        success: true,
        saved_count,
    })
}

#[tauri::command]
pub fn check_file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

// ============================================================================
// File System Commands for Custom Folder Picker
// ============================================================================

/// Represents a directory entry (folder)
#[derive(Serialize, Clone)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

/// List all directories and files in the given path
/// Returns both folders and files, with is_directory flag
#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<DirectoryEntry>, String> {
    let dir_path = Path::new(&path);
    
    // Check if path exists and is a directory
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    let mut entries = Vec::new();
    
    // Read directory contents
    let read_dir = std::fs::read_dir(dir_path).map_err(|e| {
        format!("Failed to read directory: {}", e)
    })?;
    
    let mut total_entries = 0;
    let mut skipped_hidden = 0;
    
    for entry in read_dir {
        total_entries += 1;
        
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue, // Skip entries we can't read
        };
        
        let path = entry.path();
        
        // Skip hidden files/folders (starting with .)
        let file_name = match path.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => continue,
        };
        
        if file_name.starts_with('.') {
            skipped_hidden += 1;
            continue;
        }
        
        // Include both files and directories
        let is_dir = path.is_dir();
        
        entries.push(DirectoryEntry {
            name: file_name,
            path: path.to_string_lossy().to_string(),
            is_directory: is_dir,
        });
    }
    
    println!("Directory: {}", path);
    println!("Total entries: {}, Hidden skipped: {}, Items found: {} (folders + files)", 
             total_entries, skipped_hidden, entries.len());
    
    // Sort: directories first, then files, both alphabetically
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,  // Folders before files
            (false, true) => std::cmp::Ordering::Greater, // Files after folders
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()), // Alphabetical within same type
        }
    });
    
    Ok(entries)
}

/// Get the user's home directory path
#[tauri::command]
pub fn get_home_directory() -> Result<String, String> {
    let home_dir = dirs::home_dir()
        .ok_or("Could not determine home directory")?;
    
    Ok(home_dir.to_string_lossy().to_string())
}

/// Get the parent directory of the given path
#[tauri::command]
pub fn get_parent_directory(path: String) -> Result<String, String> {
    let dir_path = Path::new(&path);
    
    let parent = dir_path.parent()
        .ok_or("No parent directory")?;
    
    Ok(parent.to_string_lossy().to_string())
}
