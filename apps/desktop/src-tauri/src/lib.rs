//! Desktop shell for Paddock: a window around the same interface as the wall tablet.
//! The interface talks to Home Assistant by itself (WebSocket); this shell only adds
//! what a browser tab gives for free: links in the system browser, full screen, a remembered window.

use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

/// Opens a link of the interface (game pages, sources…) in the system browser. Web addresses only.
#[tauri::command]
fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("only web addresses can be opened".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// F11, like a browser: the interface over the whole screen, e.g. on a spare monitor.
#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    let full = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!full).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![open_external, toggle_fullscreen])
        .setup(|app| {
            // shown once the saved size and position are applied: no jump at start
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Paddock could not start");
}
