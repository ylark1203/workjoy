use tauri::{window::Color, AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn show_reader_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("reader") {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }
    let window = WebviewWindowBuilder::new(&app, "reader", WebviewUrl::App("index.html".into()))
        .title("WorkJoy · 阅读条")
        .inner_size(760.0, 150.0)
        .min_inner_size(420.0, 110.0)
        .always_on_top(true)
        .decorations(false)
        .transparent(false)
        .build()
        .map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn hide_main_window(app: AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?
        .hide()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

fn position_mini_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .or(window.primary_monitor().map_err(|error| error.to_string())?);
    let Some(monitor) = monitor else { return Ok(()); };
    let window_size = window.outer_size().map_err(|error| error.to_string())?;
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let x = monitor_position.x + monitor_size.width as i32 - window_size.width as i32 - 18;
    let y = monitor_position.y + monitor_size.height as i32 - window_size.height as i32 - 48;
    window
        .set_position(tauri::PhysicalPosition::new(x.max(monitor_position.x), y.max(monitor_position.y)))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn show_mini_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("mini")
        .ok_or_else(|| "mini window not found".to_string())?;
    window
        .set_background_color(Some(Color(0, 0, 0, 0)))
        .map_err(|error| error.to_string())?;
    window
        .set_size(tauri::PhysicalSize::new(320, 96))
        .map_err(|error| error.to_string())?;
    position_mini_window(&window)?;
    window.show().map_err(|error| error.to_string())
}

#[tauri::command]
fn show_mini_menu(app: AppHandle) -> Result<(), String> {
    let mini = app
        .get_webview_window("mini")
        .ok_or_else(|| "mini window not found".to_string())?;
    let menu = app
        .get_webview_window("mini-menu")
        .ok_or_else(|| "mini menu window not found".to_string())?;
    let mini_position = mini.outer_position().map_err(|error| error.to_string())?;
    let mini_size = mini.outer_size().map_err(|error| error.to_string())?;
    menu.set_size(tauri::PhysicalSize::new(210, 310))
        .map_err(|error| error.to_string())?;
    menu.set_background_color(Some(Color(0, 0, 0, 0)))
        .map_err(|error| error.to_string())?;
    let monitor = mini
        .current_monitor()
        .map_err(|error| error.to_string())?
        .or(mini.primary_monitor().map_err(|error| error.to_string())?);
    let (x, y) = if let Some(monitor) = monitor {
        let monitor_position = monitor.position();
        let monitor_size = monitor.size();
        let menu_width = 210i32;
        let menu_height = 310i32;
        let left = monitor_position.x;
        let top = monitor_position.y;
        let right = left + monitor_size.width as i32;
        let bottom = top + monitor_size.height as i32;
        let preferred_right = mini_position.x + mini_size.width as i32 + 10;
        let preferred_left = mini_position.x - menu_width - 10;
        let raw_x = if preferred_right + menu_width <= right { preferred_right } else { preferred_left };
        (raw_x.clamp(left, (right - menu_width).max(left)), mini_position.y.clamp(top, (bottom - menu_height).max(top)))
    } else {
        (mini_position.x + mini_size.width as i32 + 10, mini_position.y)
    };
    menu.set_position(tauri::PhysicalPosition::new(x, y))
    .map_err(|error| error.to_string())?;
    menu.show().map_err(|error| error.to_string())?;
    menu.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn hide_mini_menu(app: AppHandle) -> Result<(), String> {
    if let Some(menu) = app.get_webview_window("mini-menu") {
        menu.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_mini_click_through(app: AppHandle, click_through: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("mini")
        .ok_or_else(|| "mini window not found".to_string())?;
    let original_outer_size = window.outer_size().map_err(|error| error.to_string())?;
    window
        .set_ignore_cursor_events(click_through)
        .map_err(|error| error.to_string())?;
    let current_outer_size = window.outer_size().map_err(|error| error.to_string())?;
    let current_inner_size = window.inner_size().map_err(|error| error.to_string())?;
    let horizontal_frame = current_outer_size.width.saturating_sub(current_inner_size.width);
    let vertical_frame = current_outer_size.height.saturating_sub(current_inner_size.height);
    window
        .set_size(tauri::PhysicalSize::new(
            original_outer_size.width.saturating_sub(horizontal_frame),
            original_outer_size.height.saturating_sub(vertical_frame),
        ))
        .map_err(|error| error.to_string())?;
    let _ = app.emit("mini-click-through-changed", click_through);
    Ok(())
}

#[tauri::command]
fn resize_mini_window(app: AppHandle, width: u32, height: u32) -> Result<(), String> {
    let window = app
        .get_webview_window("mini")
        .ok_or_else(|| "mini window not found".to_string())?;
    window
        .set_size(tauri::PhysicalSize::new(width.clamp(1, 900), height.clamp(1, 480)))
        .map_err(|error| error.to_string())?;
    position_mini_window(&window)
}

#[tauri::command]
fn open_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(mini) = app.get_webview_window("mini") { let _ = mini.hide(); }
    if let Some(menu) = app.get_webview_window("mini-menu") { let _ = menu.hide(); }
    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    main.show().map_err(|error| error.to_string())?;
    main.set_focus().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .invoke_handler(tauri::generate_handler![show_reader_window, hide_main_window, quit_app, show_mini_window, show_mini_menu, hide_mini_menu, set_mini_click_through, resize_mini_window, open_main_window])
        .setup(|app| {
            let show = tauri::menu::MenuItem::with_id(app, "show", "打开 WorkJoy", true, None::<&str>)?;
            let reader = tauri::menu::MenuItem::with_id(app, "reader", "显示阅读条", true, None::<&str>)?;
            let settings = tauri::menu::MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let hide = tauri::menu::MenuItem::with_id(app, "hide", "隐藏全部窗口", true, None::<&str>)?;
            let quit = tauri::menu::MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show, &reader, &settings, &hide, &quit])?;
            let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.ico"))
                .map_err(|error| format!("failed to load tray icon: {error}"))?;
            let tray_result = tauri::tray::TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .tooltip("WorkJoy · 工位能量站")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("mini") { let _ = window.hide(); }
                        if let Some(window) = app.get_webview_window("mini-menu") { let _ = window.hide(); }
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "reader" | "settings" => {
                        if let Some(window) = app.get_webview_window("mini") { let _ = window.hide(); }
                        if let Some(window) = app.get_webview_window("mini-menu") { let _ = window.hide(); }
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("tray-navigate", event.id.as_ref());
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") { let _ = window.hide(); }
                        if let Some(window) = app.get_webview_window("reader") { let _ = window.hide(); }
                        if let Some(window) = app.get_webview_window("mini") { let _ = window.hide(); }
                        if let Some(window) = app.get_webview_window("mini-menu") { let _ = window.hide(); }
                    }
                    _ => {}
                })
                .build(app);
            if let Err(error) = tray_result {
                eprintln!("WorkJoy tray unavailable: {error}");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                    api.prevent_close();
                    let _ = window.app_handle().emit("close-requested", ());
                }
                tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "mini" => {
                    api.prevent_close();
                    let _ = window.hide();
                    if let Some(menu) = window.app_handle().get_webview_window("mini-menu") { let _ = menu.hide(); }
                }
                tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "mini-menu" => {
                    api.prevent_close();
                    let _ = window.hide();
                }
                tauri::WindowEvent::Focused(false) if window.label() == "mini-menu" => {
                    let _ = window.hide();
                }
                _ => {}
            }
        });
    builder.run(tauri::generate_context!()).expect("error while running WorkJoy");
}
