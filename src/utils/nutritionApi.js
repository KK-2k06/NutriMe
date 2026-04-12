

const CLASS_TO_USDA_QUERY = {
    apple: 'apple, raw',
    banana: 'banana, raw',
    boiled_egg: 'egg, boiled',
    bread: 'bread, white',
    fried_egg: 'egg, fried',
    milk: 'milk, whole',
    orange: 'orange, raw',
    AlooGobi: 'aloo gobi potato cauliflower',
    GulabJamun: 'gulab jamun indian sweet',
    Samosa: 'samosa fried pastry',
    'Ven Pongal': 'pongal rice lentil dish',
    'Uzhuntha vadai': 'medu vada urad dal',
    'Paneer briyani': 'paneer biryani rice',
    Dosa: 'dosa fermented crepe',
    Idly: 'idli steamed rice cake',
};

const CLASS_NAMES_ARRAY = ['apple', 'banana', 'boiled_egg', 'bread', 'fried_egg', 'milk', 'orange', 'AlooGobi', 'GulabJamun', 'Samosa', 'Ven Pongal', 'Uzhuntha vadai', 'Paneer briyani', 'Dosa', 'Idly'];

export async function fetchNutritionForDetection(detection, imgWidth, imgHeight) {
    const className = CLASS_NAMES_ARRAY[detection.classId];
    const query = CLASS_TO_USDA_QUERY[className] || className;

    // 1. Calculate spatial scaling (a* / a)
    // detection coords are already scaled to original image dimensions (imgWidth x imgHeight)
    const bboxWidth = detection.x2 - detection.x1;
    const bboxHeight = detection.y2 - detection.y1;
    const bboxArea = bboxWidth * bboxHeight;
    const imageArea = imgWidth * imgHeight;
    
    // Safety check to avoid division by zero
    const ratio = imageArea > 0 ? bboxArea / imageArea : 0;

    // 2. Portion Logic Multiplier
    let multiplier = 1.0;
    if (ratio <= 0.2) {
        multiplier = 0.7; // Small
    } else if (ratio <= 0.4) {
        multiplier = 1.0; // Medium
    } else {
        multiplier = 1.5; // Large
    }

    try {
        const apiKey = import.meta.env.VITE_USDA_API_KEY;
        if (!apiKey) {
            console.warn("VITE_USDA_API_KEY is not defined in .env! Using fallback.");
            throw new Error("Missing API Key");
        }

        const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=1`;
        
        const res = await fetch(url);
        
        if (!res.ok) {
            throw new Error(`USDA API Error: ${res.status}`);
        }

        const data = await res.json();
        
        if (!data.foods || data.foods.length === 0) {
            throw new Error("No foods found");
        }

        const food = data.foods[0];
        
        // Extract 100g baseline macros
        // 1008: Energy (kcal), 1003: Protein, 1004: Total Lipid (fat), 1005: Carbohydrate
        let kcals = 0, protein = 0, fats = 0, carbs = 0;
        
        food.foodNutrients.forEach(nutrient => {
            if (nutrient.nutrientId === 1008) kcals = nutrient.value;
            if (nutrient.nutrientId === 1003) protein = nutrient.value;
            if (nutrient.nutrientId === 1004) fats = nutrient.value;
            if (nutrient.nutrientId === 1005) carbs = nutrient.value;
        });

        // 3. Return adjusted macros
        return {
            calories: Math.round(kcals * multiplier),
            protein: Math.round(protein * multiplier),
            fats: Math.round(fats * multiplier),
            carbs: Math.round(carbs * multiplier),
            multiplier: multiplier,
            ratio: ratio
        };

    } catch (error) {
        console.error("Failed to fetch USDA data for", className, error);
        
        // Fallback to average baseline (approximate 100g)
        const fallbacks = {
            apple: { kcal: 52, p: 0.3, f: 0.2, c: 14 },
            banana: { kcal: 89, p: 1.1, f: 0.3, c: 23 },
            boiled_egg: { kcal: 155, p: 13, f: 11, c: 1.1 },
            bread: { kcal: 265, p: 9, f: 3.2, c: 49 },
            fried_egg: { kcal: 196, p: 14, f: 15, c: 0.8 },
            milk: { kcal: 42, p: 3.4, f: 1, c: 5 },
            orange: { kcal: 47, p: 0.9, f: 0.1, c: 12 },
            AlooGobi: { kcal: 120, p: 3.5, f: 5, c: 16 },
            GulabJamun: { kcal: 387, p: 5, f: 15, c: 57 },
            Samosa: { kcal: 262, p: 5, f: 13, c: 31 },
            'Ven Pongal': { kcal: 180, p: 6, f: 4, c: 30 },
            'Uzhuntha vadai': { kcal: 230, p: 8, f: 10, c: 28 },
            'Paneer briyani': { kcal: 310, p: 12, f: 10, c: 42 },
            Dosa: { kcal: 165, p: 4, f: 4, c: 28 },
            Idly: { kcal: 58, p: 2, f: 0.4, c: 12 },
        };
        
        const fallback = fallbacks[className] || { kcal: 100, p: 5, f: 5, c: 10 };
        return {
            calories: Math.round(fallback.kcal * multiplier),
            protein: Math.round(fallback.p * multiplier),
            fats: Math.round(fallback.f * multiplier),
            carbs: Math.round(fallback.c * multiplier),
            multiplier: multiplier,
            ratio: ratio,
            isFallback: true
        };
    }
}
