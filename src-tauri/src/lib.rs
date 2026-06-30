// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::fs;
use tauri::Manager;

pub mod parser;
pub mod ai;
pub mod stats;
pub mod search;
pub mod heatmap;
pub mod export;

pub struct AppState {
    pub db: SqlitePool,
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap();
            fs::create_dir_all(&app_dir).unwrap();
            let db_path = app_dir.join("chatgraph.db");
            
            tauri::async_runtime::block_on(async move {
                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect(&format!("sqlite://{}?mode=rwc", db_path.to_str().unwrap()))
                    .await
                    .expect("Failed to connect to SQLite");
                
                sqlx::migrate!("./migrations")
                    .run(&pool)
                    .await
                    .expect("Failed to run migrations");
                
                app.manage(AppState { db: pool });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            parser::parse_whatsapp_chat, 
            ai::generate_memory,
            stats::get_dashboard_stats,
            stats::get_monthly_message_counts,
            stats::get_top_senders,
            search::search_messages,
            search::get_messages_by_date,
            search::advanced_filter,
            search::get_unique_senders,
            heatmap::get_heatmap_data,
            export::export_csv
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
