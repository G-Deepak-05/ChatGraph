use tauri::State;
use crate::AppState;
use csv::Writer;
use std::fs::File;

#[derive(sqlx::FromRow)]
pub struct MessageRow {
    pub sender_name: String,
    pub timestamp: String,
    pub message_content: String,
}

#[tauri::command]
pub async fn export_csv(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let pool = &state.db;

    // Fetch all messages
    let messages = sqlx::query_as::<_, MessageRow>(
        r#"
        SELECT sender_name, timestamp, message_content
        FROM messages
        ORDER BY timestamp ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to fetch messages: {}", e))?;

    // Create CSV writer
    let file = File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;
    let mut wtr = Writer::from_writer(file);

    // Write header
    wtr.write_record(&["Timestamp", "Sender", "Message"])
        .map_err(|e| format!("Failed to write header: {}", e))?;

    // Write data
    for msg in messages {
        wtr.write_record(&[
            &msg.timestamp,
            &msg.sender_name,
            &msg.message_content,
        ])
        .map_err(|e| format!("Failed to write row: {}", e))?;
    }

    wtr.flush().map_err(|e| format!("Failed to flush CSV: {}", e))?;

    Ok(format!("Successfully exported to {}", file_path))
}
