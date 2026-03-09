export async function generateChatResponse(messages, userProfile, healthHistory, currentMealContext) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing Gemini API Key');
    }

    // Prepare profile info string
    const profileSection = (userProfile && userProfile.height && userProfile.weight)
        ? `User BMI Info -> Height: ${userProfile.height}cm | Weight: ${userProfile.weight}kg | Daily Goal: ${userProfile.target_calories || 2000}kcal` 
        : 'User profile is partially incomplete. Use general nutritionist advice if specific goals aren\'t found.';

    // Prepare past 3 days history string
    let historySection = 'No recent meals found.';
    if (healthHistory && healthHistory.length > 0) {
        historySection = healthHistory.map(h => 
            `- ${h.date}: ${h.meal_name} (${h.kcal} kcal, ${h.protein}g protein, ${h.carbs}g carbs, ${h.fat}g fat)`
        ).join('\n');
    }

    // Construct the System Instruction
    const systemInstruction = `
You are an expert AI Nutritionist assistant integrated directly into a health app. 
Keep your answers brief, encouraging, highly accurate, and directly addressed to the user.

--- USER PROFILE ---
${profileSection}

${currentMealContext ? `
--- CURRENT SCANNED MEAL ---
${currentMealContext}
IMPORTANT: The user is currently looking at this specific meal. Focus 100% of your feedback on this meal's nutritional value and how it aligns with their profile.
` : `
--- RECENT MEAL HISTORY (LAST 3 DAYS) ---
${historySection}
IMPORTANT: Provide general guidance based on their nutrition trends over the last few days.
`}

--- INSTRUCTIONS ---
- Always answer in the persona of a friendly, professional AI nutritionist.
- If a current scanned meal is provided, prioritize giving feedback on that meal.
- Keep responses concise (2-3 sentences max).
`;

    // Map the application's messages [{role: 'ai', content: '...'}, {role: 'user', content: '...'}]
    // into Gemini format [{role: 'model', parts: [{text: '...'}]}, {role: 'user', parts: [{text: '...'}]}]
    const formattedMessages = messages.map(msg => {
        let textContent = '';
        if (typeof msg.content === 'string') {
            textContent = msg.content;
        } else if (msg.content?.props?.children) {
            // Flatten arrays if react node
            textContent = Array.isArray(msg.content.props.children) 
                ? msg.content.props.children.join('') 
                : String(msg.content.props.children);
        } else {
            textContent = String(msg.content);
        }

        return {
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: textContent }]
        };
    });

    try {
        const payload = {
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: formattedMessages,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
            }
        };

        // console.log('Gemini Request Payload:', JSON.stringify(payload, null, 2));

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Gemini API Error Detail:', errorText);
            throw new Error(`Gemini API Error: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) {
            throw new Error('Safety filter or internal error blocked the response.');
        }

        return responseText;
    } catch (err) {
        console.error('generateChatResponse Error:', err);
        return "I'm sorry, I'm having a little trouble thinking right now. Check your internet connection or API key.";
    }
}
