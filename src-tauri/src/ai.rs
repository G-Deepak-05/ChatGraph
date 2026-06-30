use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

#[tauri::command]
pub async fn generate_memory(
    messages_content: String,
) -> Result<String, String> {
    let prompt = format!(
        "You are an AI assistant tasked with creating a short 'Memory' summary from a conversation. Keep it very brief, highlighting the main topics discussed, mood, and key events.\n\nConversation snippet:\n{}\n\nGenerate Memory:",
        messages_content
    );

    let request = OllamaRequest {
        model: "qwen2:0.5b".to_string(), // Lightweight local model
        prompt,
        stream: false,
    };

    let client = reqwest::Client::new();
    let res = client
        .post("http://localhost:11434/api/generate")
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let ollama_res: OllamaResponse = res.json().await.map_err(|e| e.to_string())?;
        Ok(ollama_res.response)
    } else {
        Err(format!("Ollama API error: {}", res.status()))
    }
}
