

const CLASS_NAMES_ARRAY = ['apple', 'banana', 'boiled_egg', 'bread', 'fried_egg', 'milk', 'orange', 'AlooGobi', 'GulabJamun', 'Samosa', 'Ven Pongal', 'Uzhuntha vadai', 'Paneer briyani', 'Dosa', 'Idly'];

const STATIC_NUTRITION_DATA = {
    apple: { kcal: 95, p: 0.5, f: 0.3, c: 25 },
    banana: { kcal: 105, p: 1.3, f: 0.3, c: 27 },
    boiled_egg: { kcal: 78, p: 6.3, f: 5.3, c: 0.6 },
    bread: { kcal: 66, p: 2.6, f: 0.8, c: 12 },
    fried_egg: { kcal: 90, p: 6, f: 7, c: 0.6 },
    milk: { kcal: 150, p: 8, f: 8, c: 12 },
    orange: { kcal: 62, p: 1.2, f: 0.2, c: 15 },
    AlooGobi: { kcal: 120, p: 3, f: 6, c: 15 },
    GulabJamun: { kcal: 140, p: 2, f: 5, c: 22 },
    Samosa: { kcal: 160, p: 2.5, f: 9, c: 17 },
    'Ven Pongal': { kcal: 300, p: 7, f: 12, c: 40 },
    'Uzhuntha vadai': { kcal: 120, p: 3, f: 6, c: 12 },
    'Paneer briyani': { kcal: 450, p: 14, f: 18, c: 58 },
    Dosa: { kcal: 130, p: 3, f: 3, c: 23 },
    Idly: { kcal: 60, p: 2, f: 0.2, c: 13 },
};

export async function fetchNutritionForDetection(detection, imgWidth, imgHeight) {
    const className = CLASS_NAMES_ARRAY[detection.classId];

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

    const data = STATIC_NUTRITION_DATA[className] || { kcal: 100, p: 5, f: 5, c: 10 };

    // 3. Return adjusted macros
    return {
        calories: Math.round(data.kcal * multiplier),
        protein: Math.round(data.p * multiplier),
        fats: Math.round(data.f * multiplier),
        carbs: Math.round(data.c * multiplier),
        multiplier: multiplier,
        ratio: ratio
    };
}
