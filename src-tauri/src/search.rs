use serde::Serialize;
use tauri::State;
use crate::AppState;

#[derive(Serialize, sqlx::FromRow)]
pub struct SearchResult {
    pub id: i64,
    pub sender_name: String,
    pub timestamp: String,
    pub message_content: String,
}

#[tauri::command]
pub async fn search_messages(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let pool = &state.db;

    let results = if query.trim().is_empty() {
        sqlx::query_as::<_, SearchResult>(
            r#"
            SELECT id, sender_name, timestamp, message_content
            FROM messages
            ORDER BY timestamp DESC
            LIMIT 50
            "#,
        )
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_as::<_, SearchResult>(
            r#"
            SELECT m.id, m.sender_name, m.timestamp, m.message_content
            FROM messages_fts f
            JOIN messages m ON f.rowid = m.id
            WHERE messages_fts MATCH ?
            ORDER BY m.timestamp DESC
            LIMIT 50
            "#,
        )
        .bind(query)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?
    };

    Ok(results)
}

#[tauri::command]
pub async fn get_messages_by_date(
    date: String,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let pool = &state.db;

    // Use LIKE to match the date prefix (YYYY-MM-DD)
    let prefix = format!("{}%", date);
    
    let results = sqlx::query_as::<_, SearchResult>(
        r#"
        SELECT id, sender_name, timestamp, message_content
        FROM messages
        WHERE timestamp LIKE ?
        ORDER BY timestamp ASC
        LIMIT 200
        "#,
    )
    .bind(prefix)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub async fn advanced_filter(
    start_date: Option<String>,
    end_date: Option<String>,
    sender_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, String> {
    let pool = &state.db;

    let mut query_str = String::from("SELECT id, sender_name, timestamp, message_content FROM messages WHERE 1=1");
    
    if let Some(ref start) = start_date {
        query_str.push_str(&format!(" AND timestamp >= '{}'", start));
    }
    
    if let Some(ref end) = end_date {
        query_str.push_str(&format!(" AND timestamp <= '{} 23:59:59'", end));
    }
    
    if let Some(ref sender) = sender_name {
        // Use parameterized query for sender name to avoid SQL injection
        query_str.push_str(" AND sender_name = ?");
    }
    
    query_str.push_str(" ORDER BY timestamp DESC LIMIT 200");

    let mut query = sqlx::query_as::<_, SearchResult>(&query_str);
    
    if let Some(sender) = sender_name {
        query = query.bind(sender);
    }
    
    let results = query
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub async fn get_unique_senders(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let pool = &state.db;

    let senders = sqlx::query_scalar::<_, String>(
        "SELECT DISTINCT sender_name FROM messages WHERE sender_name IS NOT NULL ORDER BY sender_name"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(senders)
}
