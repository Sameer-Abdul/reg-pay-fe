const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "7753907098:AAGbDxcP76t3m7z1VOv6TNr4JuzsIVBmD50";
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Function to get chat ID by phone number from the backend API
async function getChatIdByPhoneNumber(phoneNumber: string): Promise<string | null> {
  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    const response = await fetch(`${API_BASE_URL}/telegram/chat-id/${encodeURIComponent(formattedNumber)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Error getting chat ID from backend:', error);
      return null;
    }

    const data = await response.json();
    return data.chatId?.toString() || null;
  } catch (error) {
    console.error('Error getting chat ID:', error);
    return null;
  }
}

// For logging notifications - now handled by the backend
async function logNotification(notification: {
  event_id?: number;
  recipient_type?: 'organization' | 'participant';
  recipient_id?: string;
  message_type: 'email' | 'telegram' | string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
}): Promise<void> {
  try {
    // This is now handled by the backend when sending the message
    // We keep this function for backward compatibility
    console.log('Notification logged in backend:', notification);
  } catch (error) {
    console.error('Error logging notification:', error);
  }
}

type TelegramMessage = {
  chat_id: string | number;
  text: string;
  parse_mode?: string;
};

// Format phone number to international format if it's a phone number
function formatPhoneNumber(phone: string | number): string {
  const phoneStr = String(phone).trim();
  // Remove all non-digit characters
  const digits = phoneStr.replace(/\D/g, '');
  
  // If it starts with 0, replace with +91 (India country code)
  if (digits.startsWith('0')) {
    return `+91${digits.substring(1)}`;
  }
  
  // If it's 10 digits, assume it's an Indian number
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  // If it's 12 digits, assume it's already in international format without +
  if (digits.length === 12) {
    return `+${digits}`;
  }
  
  // Otherwise return as is (might already be in correct format)
  return phoneStr.startsWith('+') ? phoneStr : `+${phoneStr}`;
}

export async function sendTelegramMessage(
  chatIdOrPhone: string | number,
  text: string,
  options?: {
    eventId?: number;
    recipientType?: 'organization' | 'participant';
  }
): Promise<{ success: boolean; error?: any }> {
  let chatId: string | number | null = null;
  const originalInput = chatIdOrPhone;
  
  try {
    // If it's a phone number, try to find the linked chat ID
    if (typeof chatIdOrPhone === 'string' && /^\+?[0-9\s\-()]+$/.test(chatIdOrPhone)) {
      console.log(`[Telegram] Looking up chat ID for phone: ${chatIdOrPhone}`);
      const formattedPhone = formatPhoneNumber(chatIdOrPhone);
      chatId = await getChatIdByPhoneNumber(formattedPhone);
      
      if (!chatId) {
        console.log(`[Telegram] No linked chat ID found for phone number: ${formattedPhone}`);
        return { 
          success: false, 
          error: 'No linked Telegram account found. User needs to run /link command in the bot first.' 
        };
      }
      console.log(`[Telegram] Found chat ID ${chatId} for phone ${formattedPhone}`);
    } else {
      // It's already a chat ID
      chatId = chatIdOrPhone;
    }
    
    // Log the attempt
    console.log(`[Telegram] Sending message to chat ID: ${chatId} (original: ${originalInput})`);
    
    // Instead of sending directly to Telegram, we'll send to our backend
    // Instead of calling Telegram API directly, we'll call our backend API
    // which will handle the actual Telegram API call
    try {
      const response = await fetch(`${API_BASE_URL}/telegram/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chatId,
          text,
          options: {
            parse_mode: 'HTML',
            eventId: options?.eventId,
            recipientType: options?.recipientType,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.message || 'Failed to send Telegram message';
        console.error(`[Telegram] Error sending message to ${chatId}:`, errorMessage);
        
        // Log the failed notification
        if (options?.eventId && options?.recipientType) {
          await logNotification({
            event_id: options.eventId,
            recipient_type: options.recipientType,
            recipient_id: chatId.toString(),
            message_type: 'telegram',
            status: 'failed',
            error_message: errorMessage,
          });
        }
        
        return { success: false, error: errorMessage };
      }

      console.log(`[Telegram] Message sent successfully to ${chatId}`);
      
      // Log the successful notification
      if (options?.eventId && options?.recipientType) {
        await logNotification({
          event_id: options.eventId,
          recipient_type: options.recipientType,
          recipient_id: chatId.toString(),
          message_type: 'telegram',
          status: 'sent',
        });
      }
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send Telegram message';
      console.error(`[Telegram] Error sending message to ${chatId}:`, error);
      
      if (options?.eventId && options?.recipientType) {
        await logNotification({
          event_id: options.eventId,
          recipient_type: options.recipientType,
          recipient_id: chatId.toString(),
          message_type: 'telegram',
          status: 'failed',
          error_message: errorMessage,
        });
      }
      
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('Error in sendTelegramMessage:', error);
    
    // Log the failed notification
    if (options?.eventId && options?.recipientType) {
      await logNotification({
        event_id: options.eventId,
        recipient_type: options.recipientType,
        recipient_id: String(originalInput),
        message_type: 'telegram',
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error)
      });
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export function formatOrganizerMessage(event: any, participants: any[]) {
  const isUpdate = !!event.id;
  
  let message = `🎯 *${isUpdate ? 'EVENT UPDATED' : 'NEW EVENT CREATED'}* 🎯\n\n`;
  
  // Event Details Section
  message += `📋 *Event Details*\n`;
  message += `🎭 *Name:* ${event.name || 'N/A'}\n`;
  message += `📅 *Date:* ${event.date || 'N/A'}\n`;
  message += `⏰ *Time:* ${event.start_time || ''} - ${event.end_time || ''}\n`;
  
  // Virtual/Physical Event Details
  if (event.mode_of_event === 'Virtual' && event.zoom_join_url) {
    message += `\n💻 *Virtual Event*\n`;
    message += `🔗 *Join Meeting:* ${event.zoom_join_url}\n`;
    if (event.zoom_password) {
      message += `🔑 *Password:* \`${event.zoom_password}\`\n`;
    }
  } else {
    message += `\n🏢 *Venue Details*\n`;
    message += `📍 *Location:* ${event.venue || 'To be announced'}\n`;
  }
  
  // Organization Details
  message += `\n🏛 *Organization*\n`;
  message += `🏢 *Name:* ${event.organization_name || 'N/A'}\n`;
  message += `👤 *POC:* ${event.event_coordinator || 'N/A'}\n`;
  message += `📞 *Contact:* ${event.organization_contact || 'N/A'}\n`;
  message += `✉️ *Email:* ${event.organization_email || 'N/A'}\n`;
  
  // Participants List
  if (participants && participants.length > 0) {
    message += `\n👥 *Participants (${participants.length})*\n`;
    participants.forEach((p, i) => {
      message += `${i + 1}. *${p.name}*`;
      if (p.email) message += ` (${p.email})`;
      if (p.phone_no) message += ` / ${p.phone_no}`;
      message += '\n';
    });
  }
  
  // Footer
  message += `\n${isUpdate ? '✅ Event updated successfully!' : '✨ Your event has been created and participants have been notified!'}\n`;
  message += `\n_Thank you for using our event management system!_`;
  
  return message;
}

export function formatParticipantMessage(participant: any, event: any) {
  const isVirtual = event.mode_of_event === 'Virtual';
  const eventType = isVirtual ? '🎥 Virtual Event' : '🏢 In-Person Event';
  
  // Format Zoom meeting details if it's a virtual event with a join URL
  let zoomInfo = '';
  if (isVirtual && event.zoom_join_url) {
    zoomInfo = '\n\n💻 *VIRTUAL EVENT DETAILS*\n';
    zoomInfo += `🔗 *Join Meeting:* ${event.zoom_join_url}\n`;
    
    if (event.zoom_password) {
      zoomInfo += `🔑 *Password:* \`${event.zoom_password}\`\n`;
    }
    
    zoomInfo += '\n💡 *Tip:* Click the link above to join the meeting at the scheduled time.\n';
  }

  const venueInfo = isVirtual 
    ? ''
    : `📍 *Venue:* ${event.venue || 'To be announced'}\n`;

  // Start building the message
  let message = `✨ *REGISTRATION CONFIRMED* ✨\n\n`;
  message += `Hello *${participant.name}*,\n\n`;
  message += `📌 *Event:* ${event.name}\n`;
  message += `📅 *Date:* ${event.date}\n`;
  message += `⏰ *Time:* ${event.start_time} – ${event.end_time}\n`;
  message += `🌐 *Type:* ${eventType}\n`;
  message += venueInfo;
  message += `\n🏛 *Organizer:* ${event.organization_name || 'N/A'}\n`;
  message += `👤 *Event Coordinator:* ${event.event_coordinator || 'N/A'}\n\n`;
  message += `📋 *Your Registration Details*\n`;
  message += `👤 *Name:* ${participant.name}\n`;
    
  // Add participant email if available
  if (participant.email) {
    message += `✉️ *Email:* ${participant.email}\n`;
  }
  
  // Add participant phone if available
  if (participant.phone_no) {
    message += `📞 *Phone:* ${participant.phone_no}\n`;
  }
  
  // Add Zoom info for virtual events
  if (isVirtual && zoomInfo) {
    message += zoomInfo;
  }
  
  // Add contact information
  message += `\n📞 *For Assistance:* ${event.organization_contact || 'N/A'}\n`;
  message += `✉️ *Email:* ${event.organization_email || 'N/A'}\n\n`;
  
  // Add closing message
  message += `We're excited to have you join us${isVirtual ? ' online' : ''}!\n`;
  message += `\nBest regards,\n*${event.organization_name || 'Event Organizer'}*`;
  
  return message;
}
