from typing import Literal, Optional

# ---------------------------------------------------------------------------
# Constants based on Lloyd-Jones et al., JAMA 2004 (Framingham Heart Study)
# ---------------------------------------------------------------------------

PREMATURE_AGE_CUTOFF = {
    "father":      55,
    "grandfather": 55, # mapped to pat_grandpa in paper logic
    "mother":      65,
    "grandmother": 65, # mapped to mat_grandma in paper logic
}

# Pre-normalized weights from paper ORs
# WEIGHTS[relative][offspring_sex][cvd_type]
WEIGHTS = {
    "father": {
        "male":   {"premature": 0.411215, "nonpremature": 0.367816},
        "female": {"premature": 0.373626, "nonpremature": 0.318841},
    },
    "mother": {
        "male":   {"premature": 0.317757, "nonpremature": 0.298851},
        "female": {"premature": 0.373626, "nonpremature": 0.347826},
    },
    "grandfather": {
        "male":   {"premature": 0.149533, "nonpremature": 0.183908},
        "female": {"premature": 0.120879, "nonpremature": 0.159420},
    },
    "grandmother": {
        "male":   {"premature": 0.121495, "nonpremature": 0.149425},
        "female": {"premature": 0.131868, "nonpremature": 0.173913},
    },
}

RELATIVES = ["father", "mother", "grandfather", "grandmother"]


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def classify_premature(relative: str, age: float) -> str:
    """
    Classify relative as premature or nonpremature from current age.
        Father / Grandfather : premature if age < 55
        Mother / Grandmother : premature if age < 65
    """
    return "premature" if age < PREMATURE_AGE_CUTOFF.get(relative, 60) else "nonpremature"


def compute_family_history_score(
    offspring_sex:  Literal["male", "female"],
    dad_prob:       float,
    dad_age:        float,
    mom_prob:       float,
    mom_age:        float,
    grandpa_prob:   Optional[float] = None,
    grandpa_age:    Optional[float] = None,
    grandma_prob:   Optional[float] = None,
    grandma_age:    Optional[float] = None,
) -> dict:
    """
    Compute the weighted family history CVD score for one patient.
    Weights are renormalized based on present relatives.
    """
    sex = offspring_sex.lower()

    # (prob, age, is_optional)
    inputs = {
        "father":      (dad_prob,     dad_age,     False),
        "mother":      (mom_prob,     mom_age,     False),
        "grandfather": (grandpa_prob, grandpa_age, True),
        "grandmother": (grandma_prob, grandma_age, True),
    }

    relative_data    = {}
    included         = []
    excluded_missing = []

    # Step 1 — classify each present relative, get pre-normalized weight
    for rel, (prob, age, is_optional) in inputs.items():

        if is_optional and (prob is None or age is None):
            excluded_missing.append(rel)
            relative_data[rel] = {
                "predict_proba":  None,
                "age":            None,
                "cvd_type":       None,
                "prenorm_weight": None,
                "renorm_weight":  None,
                "contribution":   None,
                "included":       False,
            }
            continue

        cvd_type      = classify_premature(rel, age)
        prenorm_weight = WEIGHTS[rel][sex][cvd_type]

        relative_data[rel] = {
            "predict_proba":  prob,
            "age":            age,
            "cvd_type":       cvd_type,
            "prenorm_weight": prenorm_weight,
            "renorm_weight":  None,           # filled in step 2
            "contribution":   None,           # filled in step 2
            "included":       True,
        }
        included.append(rel)

    # Step 2 — renormalize weights of present relatives so they sum to 1.0
    total_prenorm = sum(
        relative_data[r]["prenorm_weight"]
        for r in included
    )

    fh_score = 0.0
    for rel in included:
        d             = relative_data[rel]
        renorm_weight = d["prenorm_weight"] / total_prenorm
        contribution  = renorm_weight * d["predict_proba"]
        d["renorm_weight"] = round(renorm_weight, 6)
        d["contribution"]  = round(contribution,  6)
        fh_score          += contribution

    return {
        "fh_score":          round(fh_score, 6),
        "relatives":         relative_data,
        "included":          included,
        "excluded_missing":  excluded_missing,
        "offspring_sex":     offspring_sex,
    }
