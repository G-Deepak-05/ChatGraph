use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;
use crate::AppState;

#[derive(Serialize)]
pub struct DashboardStats {
    pub total_messages: i64,
    pub total_people: i64,
    pub years: String,
    pub longest_streak: i64,
}

#[tauri::command]
pub async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    let pool = &state.db;

    let total_messages: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM messages")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    let total_people: i64 = sqlx::query_scalar("SELECT COUNT(DISTINCT sender_name) FROM messages")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    // Get min and max years
    // timestamp is currently stored as a string. A simple min/max substring can work for MVP.
    // In a real app we'd parse properly.
    let min_date: Option<String> = sqlx::query_scalar("SELECT MIN(timestamp) FROM messages")
        .fetch_optional(pool)
        .await
        .unwrap_or(None);
        
    let max_date: Option<String> = sqlx::query_scalar("SELECT MAX(timestamp) FROM messages")
        .fetch_optional(pool)
        .await
        .unwrap_or(None);

    let mut years = String::from("N/A");
    if let (Some(min_str), Some(max_str)) = (min_date, max_date) {
        // WhatsApp timestamps typically start with a date (e.g., "12/5/25, ..." or "[12/05/2025 ...")
        // We'll try to extract the year more robustly by looking for 2 or 4 consecutive digits before a comma or space
        let extract_year = |s: &str| -> String {
            // Strip leading brackets if any
            let clean = s.replace("[", "");
            // Split by comma or space to get the date part
            let date_part = clean.split(&[',', ' '][..]).next().unwrap_or("");
            // Split by slashes, dashes, or dots
            let parts: Vec<&str> = date_part.split(&['/', '-', '.'][..]).collect();
            // The year is usually the last part (e.g. DD/MM/YYYY or MM/DD/YY) or first part (YYYY-MM-DD)
            if parts.len() >= 3 {
                let first = parts[0];
                let last = parts[parts.len() - 1];
                if first.len() == 4 { return first.to_string(); }
                if last.len() == 4 { return last.to_string(); }
                if last.len() == 2 { return format!("20{}", last); } // Assume 20xx for 2-digit years
            }
            // Fallback: just return the raw date part
            date_part.to_string()
        };

        let min_year = extract_year(&min_str);
        let max_year = extract_year(&max_str);
        
        years = if min_year == max_year {
            min_year
        } else {
            format!("{}-{}", min_year, max_year)
        };
    }

    Ok(DashboardStats {
        total_messages,
        total_people,
        years,
        longest_streak: 0, // Mocked for now, requires complex window functions
    })
}

use std::collections::HashMap;

#[derive(Serialize)]
pub struct MonthlyMessageCount {
    pub name: String,
    pub messages: i64,
}

#[tauri::command]
pub async fn get_monthly_message_counts(state: State<'_, AppState>) -> Result<Vec<MonthlyMessageCount>, String> {
    let pool = &state.db;
    let timestamps: Vec<String> = sqlx::query_scalar("SELECT timestamp FROM messages WHERE timestamp IS NOT NULL")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut month_counts: HashMap<String, i64> = HashMap::new();

    for ts in timestamps {
        let clean = ts.replace("[", "");
        let date_part = clean.split(&[',', ' '][..]).next().unwrap_or("");
        let parts: Vec<&str> = date_part.split(&['/', '-', '.'][..]).collect();
        
        if parts.len() >= 3 {
            let first = parts[0];
            let second = parts[1];
            let last = parts[parts.len() - 1];
            
            let mut year = last.to_string();
            let mut month = second.to_string();
            
            if first.len() == 4 {
                year = first.to_string();
                month = second.to_string();
            } else if last.len() == 2 {
                year = format!("20{}", last);
            }
            
            let month_padded = if month.len() == 1 { format!("0{}", month) } else { month };
            let key = format!("{}-{}", year, month_padded);
            *month_counts.entry(key).or_insert(0) += 1;
        }
    }

    let mut result: Vec<MonthlyMessageCount> = month_counts
        .into_iter()
        .map(|(name, messages)| MonthlyMessageCount { name, messages })
        .collect();

    // Sort chronologically
    result.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(result)
}

#[derive(Serialize, sqlx::FromRow)]
pub struct TopSender {
    pub name: String,
    pub value: i64,
}

#[tauri::command]
pub async fn get_top_senders(state: State<'_, AppState>) -> Result<Vec<TopSender>, String> {
    let pool = &state.db;
    let senders = sqlx::query_as::<_, TopSender>(
        r#"
        SELECT sender_name as name, COUNT(*) as value
        FROM messages
        WHERE sender_name IS NOT NULL
        GROUP BY name
        ORDER BY value DESC
        LIMIT 5
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(senders)
}
