use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;

#[derive(Serialize)]
pub struct HeatmapDay {
    pub date: String,
    pub message_count: i64,
    pub contacts_count: i64,
    pub top_contact: String,
}

#[tauri::command]
pub async fn get_heatmap_data(
    state: State<'_, AppState>,
) -> Result<Vec<HeatmapDay>, String> {
    let pool = &state.db;

    // Group messages by date
    let query = r#"
        SELECT 
            DATE(timestamp) as date,
            COUNT(*) as message_count,
            COUNT(DISTINCT sender_name) as contacts_count,
            (
                SELECT sender_name 
                FROM messages m2 
                WHERE DATE(m2.timestamp) = DATE(messages.timestamp)
                GROUP BY sender_name 
                ORDER BY COUNT(*) DESC 
                LIMIT 1
            ) as top_contact
        FROM messages
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp) ASC;
    "#;

    let results: Vec<(Option<String>, i64, i64, Option<String>)> = sqlx::query_as(query)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut heatmap = Vec::new();
    for (date, count, contacts, top) in results {
        if let Some(d) = date {
            heatmap.push(HeatmapDay {
                date: d,
                message_count: count,
                contacts_count: contacts,
                top_contact: top.unwrap_or_else(|| "Unknown".to_string()),
            });
        }
    }

    Ok(heatmap)
}
