# Debug Analysis - Calculation Discrepancies

## Ahl Job Comparison

### Input Data
- Roof squares: 22.58
- Hip length: 128.07 ft (> 100, so should use 15% waste)
- Rake: 52.89 ft
- Eave: 189.56 ft
- Ridge: 29 ft
- Ridge count: 1 (assumed)

### Shingles
**Expected:** 75 bundles
**Calculated:** 78 bundles

**My calculation:**
```
22.58 squares × 3 bundles/sq × 1.15 (hip waste) = 77.997 → 78 bundles
```

**Working backwards from actual:**
```
75 bundles ÷ 3 = 25 squares with waste
25 ÷ 22.58 = 1.107 multiplier (10.7% waste)
```

**Issue:** They used ~10% waste, not 15%. But hip length is 128.07 ft (> 100).

**Possible causes:**
1. Hip detection rule is different than "hip > 100 LF"
2. They manually chose 10% waste for some reason
3. Different interpretation of "hip roof"

### Drip Edge
**Expected:** 28 pieces
**Calculated:** 28 pieces ✅

**Calculation:**
```
(52.89 rake + 189.56 eave) = 242.45 ft
242.45 ÷ 10 ft/piece = 24.245 → ceil(24.245) = 25 pieces
25 + 3 extra = 28 pieces ✅
```

### Ridge Vent
**Expected:** 5 pieces
**Calculated:** 7 pieces

**My calculation:**
```
(29 ridge - (1 ridge × 3)) ÷ 4 = (29-3) ÷ 4 = 26 ÷ 4 = 6.5 → ceil(6.5) = 7 pieces
```

**Working backwards from actual:**
```
If 5 pieces: 5 × 4 = 20 ft coverage
29 ridge - 20 = 9 ft unused
9 ÷ 1 ridge = 9 ft deduction per ridge
```

**Issue:** Formula doesn't match. Austin said `(ridge_count × 3)` but that gives wrong result.

---

## Alewine Job Comparison

### Input Data
- Roof squares: 23.32
- Hip length: 0 ft (normal roof, 10% waste)
- Rake: 131.7 ft
- Eave: 92.92 ft
- Ridge: 90.48 ft
- Ridge count: 4 (assumed from formula example)

### Shingles
**Expected:** 77 bundles
**Calculated:** 77 bundles ✅

**Calculation:**
```
23.32 squares × 3 bundles/sq × 1.10 (normal waste) = 76.956 → 77 bundles ✅
```

### Drip Edge
**Expected:** 26 pieces
**Calculated:** 26 pieces ✅

**Calculation:**
```
(131.7 rake + 92.92 eave) = 224.62 ft
224.62 ÷ 10 ft/piece = 22.462 → ceil(22.462) = 23 pieces
23 + 3 extra = 26 pieces ✅
```

### Ridge Vent
**Expected:** 21 pieces
**Calculated:** 20 pieces

**My calculation:**
```
(90.48 ridge - (4 ridges × 3)) ÷ 4 = (90.48-12) ÷ 4 = 78.48 ÷ 4 = 19.62 → ceil(19.62) = 20 pieces
```

**Working backwards from actual:**
```
If 21 pieces: 21 × 4 = 84 ft coverage
90.48 ridge - 84 = 6.48 ft unused
6.48 ÷ 4 ridges = 1.62 ft deduction per ridge
```

**Issue:** Off by 1 piece. Might be rounding issue or different formula interpretation.

---

## Summary

### ✅ Working Perfectly
- Drip edge (both jobs)
- Alewine shingles

### ❌ Issues Found
1. **Ahl shingles:** Hip detection rule not working as expected
2. **Ridge vent:** Formula doesn't match actual results on either job

### Questions for Austin
1. Ahl has hip length 128.07 ft but got 10% waste (75 bundles). Should hip > 100 trigger 15% or not?
2. Ridge vent formula - the `(ridge_count × 3)` subtraction doesn't match actual results. Is there a different formula?
