use chrono::{NaiveDateTime, NaiveDate, NaiveTime};
use regex::Regex;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::fs::File;
use std::io::{BufRead, BufReader};
use tauri::State;
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedMessage {
    pub timestamp: String,
    pub sender: String,
    pub content: String,
    pub is_media: bool,
    pub is_deleted: bool,
}

fn normalize_timestamp(raw: &str) -> String {
    let s = raw.replace("[", "").replace("]", "");
    let parts: Vec<&str> = s.split(&[',', ' '][..]).filter(|p| !p.is_empty()).collect();
    if parts.is_empty() { return raw.to_string(); }
    
    let date_part = parts[0];
    let date_chunks: Vec<&str> = date_part.split(&['/', '-', '.'][..]).collect();
    if date_chunks.len() != 3 { return raw.to_string(); }
    
    let mut year = date_chunks[2].to_string();
    let mut month = date_chunks[1].to_string();
    let mut day = date_chunks[0].to_string();
    
    if date_chunks[0].len() == 4 {
        year = date_chunks[0].to_string();
        month = date_chunks[1].to_string();
        day = date_chunks[2].to_string();
    } else if date_chunks[2].len() == 2 {
        year = format!("20{}", date_chunks[2]);
    }
    
    if month.len() == 1 { month = format!("0{}", month); }
    if day.len() == 1 { day = format!("0{}", day); }
    
    let mut time_str = "00:00:00".to_string();
    if parts.len() > 1 {
        let time_part = parts[1].to_string();
        if parts.len() > 2 && (parts[2].to_lowercase() == "pm" || parts[2].to_lowercase() == "am") {
            let ampm = parts[2].to_lowercase();
            let t_chunks: Vec<&str> = time_part.split(':').collect();
            if t_chunks.len() >= 2 {
                let mut h: u32 = t_chunks[0].parse().unwrap_or(0);
                if ampm == "pm" && h < 12 { h += 12; }
                if ampm == "am" && h == 12 { h = 0; }
                let m = t_chunks[1];
                let s = if t_chunks.len() > 2 { t_chunks[2] } else { "00" };
                time_str = format!("{:02}:{:02}:{:02}", h, m.parse::<u32>().unwrap_or(0), s.parse::<u32>().unwrap_or(0));
            }
        } else {
            let t_chunks: Vec<&str> = time_part.split(':').collect();
            if t_chunks.len() >= 2 {
                let h = t_chunks[0];
                let m = t_chunks[1];
                let s = if t_chunks.len() > 2 { t_chunks[2] } else { "00" };
                time_str = format!("{:02}:{:02}:{:02}", h.parse::<u32>().unwrap_or(0), m.parse::<u32>().unwrap_or(0), s.parse::<u32>().unwrap_or(0));
            }
        }
    }
    
    format!("{}-{}-{} {}", year, month, day, time_str)
}

#[tauri::command]
pub async fn parse_whatsapp_chat(
    file_path: String,
    chat_name: String,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let file = File::open(&file_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);

    // Regex to match WhatsApp chat formats (e.g. "12/5/25, 14:32 - Sender: Message" or "[12/05/25 14:32:01] Sender: Message")
    let re = Regex::new(r"^\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[, ]+\d{1,2}:\d{2}(?::\d{2})?(?: [aApP][mM])?)\]? [-:]? (.*?): (.*)").unwrap();

    let mut messages = Vec::new();
    let mut current_message: Option<ParsedMessage> = None;

    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        
        if let Some(caps) = re.captures(&line) {
            // Push previous message
            if let Some(msg) = current_message.take() {
                messages.push(msg);
            }
            
            let timestamp_raw = caps.get(1).unwrap().as_str().to_string();
            let normalized_timestamp = normalize_timestamp(&timestamp_raw);
            let sender = caps.get(2).unwrap().as_str().to_string();
            let content = caps.get(3).unwrap().as_str().to_string();
            
            let is_media = content.contains("<Media omitted>") || content.contains("image omitted") || content.contains("video omitted");
            let is_deleted = content.contains("This message was deleted");

            current_message = Some(ParsedMessage {
                timestamp: normalized_timestamp,
                sender,
                content,
                is_media,
                is_deleted,
            });
        } else if let Some(ref mut msg) = current_message {
            // Continuation of a multiline message
            msg.content.push('\n');
            msg.content.push_str(&line);
        }
    }
    
    // Push the very last message
    if let Some(msg) = current_message.take() {
        messages.push(msg);
    }

    // Insert into DB
    let pool = &state.db;
    
    // 1. Create or get chat
    let chat_id: i64 = sqlx::query_scalar(
        "INSERT INTO chats (name) VALUES (?) RETURNING id"
    )
    .bind(chat_name)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // 2. Insert messages in batch
    let mut inserted = 0;
    for msg in messages {
        // Here we just insert strings as timestamps for simplicity in MVP, 
        // real MVP would parse the NaiveDateTime but formats vary wildly in WhatsApp exports.
        sqlx::query(
            "INSERT INTO messages (chat_id, sender_name, timestamp, message_content, is_media, is_deleted) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(chat_id)
        .bind(msg.sender)
        .bind(msg.timestamp) // In future, use chrono to parse into ISO8601
        .bind(msg.content)
        .bind(msg.is_media)
        .bind(msg.is_deleted)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        inserted += 1;
    }

    Ok(inserted)
}
