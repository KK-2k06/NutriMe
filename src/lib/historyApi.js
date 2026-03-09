import { supabase } from './supabase';

/**
 * Saves a single chat message to Supabase.
 * @param {string} userId - The authenticated user's ID
 * @param {string} role - 'user' or 'ai'
 * @param {string} content - The message content
 * @param {string} contextType - e.g., 'analysis', 'dashboard'
 */
export async function saveChatMessage(userId, role, content, contextType) {
    if (!userId || !content) return null;

    const { data, error } = await supabase
        .from('chat_history')
        .insert({
            user_id: userId,
            role: role,
            content: content,
            context_type: contextType
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving chat message:', error);
        return null; // Fail gracefully
    }

    return data;
}

/**
 * Fetches recent chat history for a specific context.
 * @param {string} userId - The authenticated user's ID
 * @param {string} contextType - e.g., 'analysis', 'dashboard'
 * @param {number} limit - Maximum number of messages to fetch
 */
export async function fetchRecentChats(userId, contextType, limit = 20) {
    if (!userId) return [];

    const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .eq('context_type', contextType)
        // Order by created_at descending to get the *newest* first
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching chat history:', error);
        return [];
    }

    // Because we ordered descending to get the latest messages,
    // we must reverse the array so they appear in chronological order
    // for the chat UI.
    return data.reverse();
}
