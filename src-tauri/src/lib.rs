use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct OpenCodeProcess(Mutex<Option<Child>>);

/// The port OpenCode serve is listening on.
struct OpenCodePort(u16);

/// Path to the glintlock-opencode plugin directory.
const PLUGIN_DIR: &str = "/Users/dakeobac/Coding/glintlock-opencode";

fn spawn_opencode(port: u16) -> Result<Child, String> {
    Command::new("opencode")
        .args(["serve", "--hostname", "127.0.0.1", "--port", &port.to_string()])
        .current_dir(PLUGIN_DIR)
        .spawn()
        .map_err(|e| format!("Failed to spawn opencode serve: {e}"))
}

#[tauri::command]
fn get_opencode_port(app: tauri::AppHandle) -> u16 {
    app.state::<OpenCodePort>().0
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let port = portpicker::pick_unused_port().expect("No free port available");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(OpenCodePort(port))
        .manage(OpenCodeProcess(Mutex::new(None)))
        .setup(move |app| {
            let child = spawn_opencode(port)
                .expect("Failed to start opencode serve");
            let state = app.state::<OpenCodeProcess>();
            *state.0.lock().unwrap() = Some(child);
            println!("OpenCode serve started on port {port}");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<OpenCodeProcess>();
                let mut guard = state.0.lock().unwrap();
                if let Some(ref mut child) = *guard {
                    let _ = child.kill();
                    println!("OpenCode serve stopped");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_opencode_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
