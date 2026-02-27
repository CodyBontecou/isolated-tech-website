/**
 * ntfy.sh integration for push notifications
 * https://ntfy.sh
 */

export interface NtfyOptions {
  title?: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
  tags?: string[];
  click?: string;
  actions?: string[];
}

export interface NtfySendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a notification via ntfy.sh
 */
export async function sendNotification(
  topic: string,
  message: string,
  options: NtfyOptions = {}
): Promise<NtfySendResult> {
  const {
    title,
    priority = 'default',
    tags = [],
    click,
    actions,
  } = options;

  const headers: Record<string, string> = {
    'Priority': priority,
  };

  // Title must be ASCII-safe for HTTP headers - encode if needed
  if (title) {
    // Check if title contains non-ASCII characters
    if (/[^\x00-\x7F]/.test(title)) {
      // Use RFC 2047 encoding or just strip non-ASCII for header
      headers['Title'] = title.replace(/[^\x00-\x7F]/g, '').trim() || 'Alert';
      // Put the full title with emojis at the start of the body
    } else {
      headers['Title'] = title;
    }
  }
  if (tags.length > 0) headers['Tags'] = tags.join(',');
  if (click) headers['Click'] = click;
  if (actions && actions.length > 0) headers['Actions'] = actions.join('; ');

  try {
    const response = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers,
      body: message,
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const data = await response.json() as { id?: string };
    return { success: true, id: data.id };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Send an error alert
 */
export async function sendErrorAlert(
  topic: string,
  error: string,
  context?: string
): Promise<NtfySendResult> {
  const message = context ? `${context}\n\n${error}` : error;
  
  return sendNotification(topic, message, {
    title: 'Error Alert',
    priority: 'high',
    tags: ['rotating_light', 'x'],
  });
}

/**
 * Send a success notification
 */
export async function sendSuccessAlert(
  topic: string,
  message: string
): Promise<NtfySendResult> {
  return sendNotification(topic, message, {
    title: 'Success',
    priority: 'default',
    tags: ['white_check_mark'],
  });
}

/**
 * Generate TypeScript code for Cloudflare Workers
 */
export function generateCloudflareCode(): string {
  return `/**
 * ntfy.sh alerting for Cloudflare Workers
 * Add NTFY_TOPIC to your wrangler secrets: wrangler secret put NTFY_TOPIC
 */

interface AlertOptions {
  title?: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
  tags?: string[];
}

export async function sendAlert(
  message: string,
  ntfyTopic: string,
  options: AlertOptions = {}
): Promise<void> {
  const { title = 'App Alert', priority = 'high', tags = ['warning'] } = options;

  try {
    await fetch(\`https://ntfy.sh/\${ntfyTopic}\`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags.join(','),
      },
      body: message,
    });
  } catch (e) {
    console.error('Failed to send alert:', e);
  }
}

export async function alertError(
  error: Error,
  ntfyTopic: string,
  context?: string
): Promise<void> {
  const message = [
    context ? \`Context: \${context}\` : null,
    \`Error: \${error.message}\`,
    error.stack ? \`\\nStack: \${error.stack.split('\\n').slice(0, 3).join('\\n')}\` : null,
  ]
    .filter(Boolean)
    .join('\\n');

  await sendAlert(message, ntfyTopic, {
    title: '🚨 Error',
    priority: 'high',
    tags: ['rotating_light', 'error'],
  });
}
`;
}

/**
 * Generate Swift code for iOS/macOS apps
 */
export function generateSwiftCode(): string {
  return `import Foundation

/// Simple ntfy.sh alerting for iOS/macOS apps
/// Store your topic securely (e.g., in environment or config)
enum Ntfy {
    static let defaultTopic = ProcessInfo.processInfo.environment["NTFY_TOPIC"] ?? ""
    
    enum Priority: String {
        case min, low, \`default\`, high, urgent
    }
    
    static func send(
        _ message: String,
        topic: String? = nil,
        title: String? = nil,
        priority: Priority = .default,
        tags: [String] = []
    ) async {
        let topicToUse = topic ?? defaultTopic
        guard !topicToUse.isEmpty else {
            print("⚠️ NTFY_TOPIC not configured")
            return
        }
        
        guard let url = URL(string: "https://ntfy.sh/\\(topicToUse)") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = message.data(using: .utf8)
        
        if let title = title {
            request.setValue(title, forHTTPHeaderField: "Title")
        }
        request.setValue(priority.rawValue, forHTTPHeaderField: "Priority")
        if !tags.isEmpty {
            request.setValue(tags.joined(separator: ","), forHTTPHeaderField: "Tags")
        }
        
        do {
            let (_, _) = try await URLSession.shared.data(for: request)
        } catch {
            print("Failed to send ntfy alert: \\(error)")
        }
    }
    
    static func error(_ error: Error, context: String? = nil) async {
        let message = [
            context.map { "Context: \\($0)" },
            "Error: \\(error.localizedDescription)"
        ].compactMap { $0 }.joined(separator: "\\n")
        
        await send(message, title: "🚨 Error", priority: .high, tags: ["rotating_light", "error"])
    }
}

// Usage:
// await Ntfy.send("Deployment complete!", title: "✅ Success")
// await Ntfy.error(someError, context: "During sync")
`;
}
